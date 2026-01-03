import { expect, Page, Locator } from '@playwright/test';




export async function testEEcircuit(page: Page, url: string) {
  const getAccessibleName = async (locator: Locator) => {
    return locator.evaluate((element: Element) => {
      const ariaLabel = element.getAttribute("aria-label");
      if (ariaLabel && ariaLabel.trim().length > 0) {
        return ariaLabel.trim();
      }

      const ariaLabelledBy = element.getAttribute("aria-labelledby");
      if (ariaLabelledBy) {
        const doc = element.ownerDocument;
        const tokens = ariaLabelledBy.split(/\s+/);
        const labelledText = tokens
          .map((id: string) => doc.getElementById(id)?.textContent?.trim())
          .filter((text: string | null | undefined): text is string => !!text && text.length > 0)
          .join(" ")
          .trim();
        if (labelledText.length > 0) {
          return labelledText;
        }
      }

      const closestLabel = element.closest("label");
      if (closestLabel) {
        const labelText = closestLabel.textContent?.trim();
        if (labelText && labelText.length > 0) {
          return labelText;
        }
      }

      const textContent = element.textContent?.trim();
      if (textContent && textContent.length > 0) {
        return textContent;
      }

      return "";
    });
  };
  const response = await page.goto(url, { waitUntil: "networkidle" });

  expect(response?.ok(), "EEcircuit app responded successfully").toBeTruthy();

  // Ensure the main application shell has rendered before inspecting buttons
  await page.waitForSelector("[data-testid='eecircuit-root'], body");

  const assertButtonsHaveNames = async (context: string) => {
    const buttonLocator = page.getByRole("button");
    const buttonCount = await buttonLocator.count();

    expect(
      buttonCount,
      `Expected at least one button to be present on the page during ${context}`
    ).toBeGreaterThan(0);

    const buttonNames: string[] = [];

    for (let index = 0; index < buttonCount; index += 1) {
      const locator = buttonLocator.nth(index);
      const accessibleName = await getAccessibleName(locator);

      expect(
        accessibleName,
        `Button at index ${index} is missing a deterministic accessible name in ${context}`
      ).not.toEqual("");

      buttonNames.push(accessibleName);
    }

    console.log(
      `[playwright][${context}] Discovered button names:`,
      buttonNames
    );
  };

  const assertCheckboxesHaveNames = async (context: string, locator?: Locator) => {
    const checkboxLocator = locator ?? page.getByRole("checkbox");
    const checkboxCount = await checkboxLocator.count();

    expect(
      checkboxCount,
      `Expected at least one checkbox to be present on the page during ${context}`
    ).toBeGreaterThan(0);

    const checkboxNames: string[] = [];

    for (let index = 0; index < checkboxCount; index += 1) {
      const checkbox = checkboxLocator.nth(index);
      const accessibleName = await getAccessibleName(checkbox);

      expect(
        accessibleName,
        `Checkbox at index ${index} is missing a deterministic accessible name in ${context}`
      ).not.toEqual("");

      checkboxNames.push(accessibleName);
    }

    console.log(
      `[playwright][${context}] Discovered checkbox names:`,
      checkboxNames
    );
  };

  await assertButtonsHaveNames("schematic");

  // Export the schematic netlist so the Simulate tab is enabled
  let simulateNetlistButton = page.getByRole("button", {
    name: "Simulate (Netlist)",
    exact: true,
  });
  if (await simulateNetlistButton.count() === 0) {
    simulateNetlistButton = page.getByRole("button", {
      name: /^Simulate$/,
    });
  }
  await simulateNetlistButton.first().click();

  // Wait for automatic navigation to the Simulate tab to complete
  const runSimulationButton = page.getByRole("button", {
    name: /Run Simulation/i,
  });
  await expect(runSimulationButton).toBeVisible({ timeout: 10000 });

  // Ensure the Simulate tab trigger is now enabled
  const simulateTabTrigger = page.getByRole("tab", { name: "Simulate" });
  if (await simulateTabTrigger.count() > 0) {
    await expect(simulateTabTrigger).toBeEnabled();
  }

  await assertButtonsHaveNames("simulate");

  // Verify simulation type radio buttons are deterministically labelled
  const simulationConfigGroup = page.getByRole("radiogroup", {
    name: /Simulation Configuration/i,
  });
  const simulationTypes = ["None", "DC", "AC", "Transient"] as const;

  for (const type of simulationTypes) {
    await expect(
      simulationConfigGroup.getByRole("radio", { name: type })
    ).toBeVisible();
  }

  const selectSimulationType = async (type: (typeof simulationTypes)[number]) => {
    const radioLabel = simulationConfigGroup
      .locator("label")
      .filter({ hasText: type })
      .first();
    await radioLabel.click();
    await expect(
      simulationConfigGroup.getByRole("radio", { name: type })
    ).toBeChecked();
  };

  // DC configuration inputs
  await selectSimulationType("DC");
  await expect(page.getByLabel("Sweep Source")).toBeVisible();
  await expect(page.getByLabel("Start Value")).toBeVisible();
  await expect(page.getByLabel("Stop Value")).toBeVisible();
  await expect(page.getByLabel("Step Size")).toBeVisible();

  const configureSweepSource = async (value: string) => {
    const sweepSourceField = page.getByLabel("Sweep Source");
    const tagName = await sweepSourceField.evaluate((element) =>
      element.tagName.toLowerCase()
    );

    if (tagName === "select") {
      const options = await sweepSourceField.evaluate((select: HTMLSelectElement) =>
        Array.from(select.options).map((option) => ({
          value: option.value,
          label: option.label,
        }))
      );

      const normalizedValue = value.toLowerCase();
      const matchingOption =
        options.find(
          (option) => option.value.toLowerCase() === normalizedValue
        ) ||
        options.find(
          (option) => option.label.toLowerCase() === normalizedValue
        ) ||
        options.find((option) => option.value.trim().length > 0);

      if (!matchingOption) {
        throw new Error(
          `Unable to find a suitable sweep source option. Available options: ${options
            .map((option) => option.value || option.label)
            .join(", ")}`
        );
      }

      await sweepSourceField.selectOption(
        matchingOption.value || matchingOption.label
      );
    } else {
      await sweepSourceField.fill(value);
    }
  };

  await configureSweepSource("vin");

  const fillInput = async (label: string, value: string) => {
    const input = page.getByLabel(label);
    await input.fill(value);
  };

  await fillInput("Start Value", "0");
  await fillInput("Stop Value", "1.8");
  await fillInput("Step Size", "1m");

  // AC configuration inputs
  await selectSimulationType("AC");
  await expect(page.getByLabel("Source")).toBeVisible();
  await expect(page.getByLabel("Sweep Type")).toBeVisible();
  await expect(page.getByLabel("Start Frequency")).toBeVisible();
  await expect(page.getByLabel("Stop Frequency")).toBeVisible();
  await expect(page.getByLabel("Steps Number")).toBeVisible();

  // Transient configuration inputs
  await selectSimulationType("Transient");
  await expect(page.getByLabel("Stop Time")).toBeVisible();
  await expect(page.getByLabel("Time Step")).toBeVisible();

  // Reset back to None to leave the UI in its default state
  await selectSimulationType("None");

  // Re-select DC for simulation run
  await selectSimulationType("DC");
  await configureSweepSource("vin");
  await fillInput("Start Value", "0");
  await fillInput("Stop Value", "1.8");
  await fillInput("Step Size", "1m");

  // Trigger the simulation
  await runSimulationButton.click();

  // Wait for the plot tab to become active and render controls
  const plotVariablesHeader = page.getByText("Plot Variables", {
    exact: true,
  });
  await expect(plotVariablesHeader).toBeVisible({ timeout: 20000 });

  await assertButtonsHaveNames("plot");

  const plotCheckboxLocator = page.getByRole("checkbox");
  await assertCheckboxesHaveNames("plot", plotCheckboxLocator);
}
