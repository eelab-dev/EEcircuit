import { demoSchematic } from "../../src/schematic/demoSchematic";
import { expect, test, type Page } from "./fixtures";

const circuitFile = (simulations?: unknown[]) => ({
  name: "profile-regression-circuit.json",
  mimeType: "application/json",
  buffer: Buffer.from(JSON.stringify({
    schema: "EEcircuitV2",
    processId: "gf180",
    gf180Corner: "typical",
    title: "Profile regression circuit",
    schematic: demoSchematic,
    simulations,
  })),
});

async function openSimulation(page: Page, simulations?: unknown[]) {
  await page.goto("/");
  await expect(page.locator('[data-canvas-ready="true"]')).toBeVisible({ timeout: 15_000 });
  await page.locator('input[type="file"]').first().setInputFiles(circuitFile(simulations));
  await expect.poll(async () => page.evaluate(async () => {
    const loadState = new Function("return import('/src/svelte/state/appState.svelte.ts')") as () => Promise<{
      appState: { allSimulationConfigs: unknown[] };
    }>;
    return (await loadState()).appState.allSimulationConfigs.length;
  })).toBe(simulations?.length ?? 0);
  await page.getByRole("button", { name: "Simulate Circuit" }).click();
  await expect(page.getByRole("group", { name: "Simulation Configuration" })).toBeVisible({ timeout: 10_000 });
}

async function storedProfileCount(page: Page) {
  return page.evaluate(async () => {
    const loadState = new Function("return import('/src/svelte/state/appState.svelte.ts')") as () => Promise<{
      appState: { allSimulationConfigs: unknown[] };
    }>;
    return (await loadState()).appState.allSimulationConfigs.length;
  });
}

async function runAndReturn(page: Page) {
  await page.getByRole("button", { name: "Run Simulation" }).click();
  await expect(page.getByRole("tab", { name: "Plot" })).toHaveAttribute("aria-selected", "true", { timeout: 20_000 });
  await expect(page.locator(".plot-webgl").first()).toBeVisible();
  await page.getByRole("tab", { name: "Simulation" }).click();
}

test("demo setup supplies and restores the DC and Transient profiles", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('[data-canvas-ready="true"]')).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: "Simulate Circuit" }).click();

  const profiles = page.getByLabel("Saved simulation configuration", { exact: true });
  await expect(profiles).toHaveValue("0");
  await expect(profiles.locator('option[value="0"]')).toHaveText("DC-1 (DC)");
  await expect(profiles.locator('option[value="1"]')).toHaveText("Transient-1 (Transient)");
  await expect(page.getByLabel("Sweep Source")).toHaveValue("vin");
  await expect(page.getByLabel("Start Value")).toHaveValue("0");
  await expect(page.getByLabel("Stop Value")).toHaveValue("1.8");
  await expect(page.getByLabel("Step Size")).toHaveValue("0.01");

  await page.getByLabel("Stop Value").fill("1.6");
  await expect(page.getByRole("status")).toContainText("Modified");
  await page.getByRole("button", { name: "Save as new profile" }).click();
  await expect(profiles).toHaveValue("2");
  await expect(profiles.locator('option[value="2"]')).toHaveText("DC-2 (DC)");
  await expect(page.getByLabel("Stop Value")).toHaveValue("1.6");
  expect(await storedProfileCount(page)).toBe(3);
  await profiles.selectOption("0");
  await expect(page.getByLabel("Stop Value")).toHaveValue("1.8");
  await profiles.selectOption("2");
  await expect(page.getByLabel("Stop Value")).toHaveValue("1.6");

  await page.getByText("Transient", { exact: true }).click();
  await expect(profiles).toHaveValue("1");
  await expect(page.getByLabel("Stop Time")).toHaveValue("10m");
  await expect(page.getByLabel("Time Step")).toHaveValue("10u");

  await page.getByRole("tab", { name: "Schematic", exact: true }).click();
  await page.getByRole("button", { name: "New Schematic" }).click();
  await page.getByRole("button", { name: "Load Demo" }).click();
  await page.getByRole("button", { name: "Simulate Circuit" }).click();
  await expect(profiles.locator('option[value="0"], option[value="1"]')).toHaveCount(2);
  await expect(profiles).toHaveValue("0");
});

test("Run creates and updates independent profiles while type switching restores the last selection", async ({ page }) => {
  test.setTimeout(90_000);
  await openSimulation(page);
  const profiles = page.getByLabel("Saved simulation configuration", { exact: true });

  await page.getByText("DC", { exact: true }).click();
  await expect(profiles).toContainText("DC-1 (DC, unsaved)");
  await expect(page.getByRole("button", { name: "Save profile" })).toBeDisabled();
  await page.getByLabel("Sweep Source").selectOption("vin");
  await page.getByLabel("Start Value").fill("0");
  await page.getByLabel("Stop Value").fill("1.2");
  await page.getByLabel("Step Size").fill("0.1");
  await expect(page.locator(".config-form code")).toHaveText(".dc vin 0 1.2 0.1");
  expect(await storedProfileCount(page)).toBe(0);
  await runAndReturn(page);
  expect(await storedProfileCount(page)).toBe(1);
  await expect(profiles.locator('option[value="0"]')).toHaveText("DC-1 (DC)");

  await page.getByLabel("Stop Value").fill("1.4");
  await runAndReturn(page);
  expect(await storedProfileCount(page)).toBe(1);
  await expect(page.getByLabel("Stop Value")).toHaveValue("1.4");

  await page.getByLabel("Start Value").fill("0.2");
  await page.getByLabel("Stop Value").fill("1.6");
  await page.getByLabel("Step Size").fill("0.2");
  await expect(page.locator(".config-form code")).toHaveText(".dc vin 0.2 1.6 0.2");
  await expect(page.getByRole("status")).toContainText("Modified");
  await page.getByRole("button", { name: "Save as new profile" }).click();
  expect(await storedProfileCount(page)).toBe(2);
  await expect(profiles).toHaveValue("1");
  await expect(profiles.locator('option[value="1"]')).toHaveText("DC-2 (DC)");
  await profiles.selectOption("0");
  await expect(page.getByLabel("Start Value")).toHaveValue("0");
  await expect(page.getByLabel("Stop Value")).toHaveValue("1.4");
  await expect(page.getByLabel("Step Size")).toHaveValue("0.1");
  await profiles.selectOption("1");
  await expect(page.getByLabel("Start Value")).toHaveValue("0.2");
  await expect(page.getByLabel("Stop Value")).toHaveValue("1.6");
  await expect(page.getByLabel("Step Size")).toHaveValue("0.2");

  await page.getByRole("button", { name: "Save as new profile" }).click();
  expect(await storedProfileCount(page)).toBe(3);
  await expect(profiles.locator('option[value="2"]')).toHaveText("DC-3 (DC)");
  await expect(page.getByLabel("Start Value")).toHaveValue("0.2");
  await expect(page.getByLabel("Stop Value")).toHaveValue("1.6");
  await page.getByRole("button", { name: "Delete configuration" }).click();
  expect(await storedProfileCount(page)).toBe(2);
  await expect(profiles).toHaveValue("1");

  await page.getByRole("button", { name: "Edit configuration name" }).click();
  await page.getByLabel("Configuration name", { exact: true }).fill(" DC-1 ");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.locator(".config-name-error")).toHaveText("Configuration names must be unique.");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();

  await page.getByText("Transient", { exact: true }).click();
  await expect(page.getByRole("button", { name: "Save profile" })).toBeDisabled();
  await page.getByLabel("Stop Time").fill("2m");
  await page.getByLabel("Time Step").fill("20u");
  await expect(page.locator(".config-form code")).toHaveText(".tran 20u 2m");
  await expect(page.getByRole("button", { name: "Save profile" })).toBeEnabled();
  await page.getByRole("button", { name: "Save profile" }).click();
  expect(await storedProfileCount(page)).toBe(3);
  await runAndReturn(page);
  expect(await storedProfileCount(page)).toBe(3);

  await page.getByLabel("Stop Time").fill("4m");
  await page.getByLabel("Time Step").fill("40u");
  await page.getByRole("button", { name: "Save as new profile" }).click();
  expect(await storedProfileCount(page)).toBe(4);
  await expect(profiles).toHaveValue("3");
  await profiles.selectOption("2");
  await expect(page.getByLabel("Stop Time")).toHaveValue("2m");
  await expect(page.getByLabel("Time Step")).toHaveValue("20u");
  await profiles.selectOption("3");
  await expect(page.getByLabel("Stop Time")).toHaveValue("4m");
  await expect(page.getByLabel("Time Step")).toHaveValue("40u");

  await page.getByText("DC", { exact: true }).click();
  await expect(profiles).toHaveValue("1");
  await expect(page.getByLabel("Start Value")).toHaveValue("0.2");
  await expect(page.getByLabel("Stop Value")).toHaveValue("1.6");
  await expect(page.getByLabel("Step Size")).toHaveValue("0.2");
  await expect(page.locator(".config-form code")).toHaveText(".dc vin 0.2 1.6 0.2");

  await page.getByRole("button", { name: "Delete configuration" }).click();
  await expect(profiles).toHaveValue("0");
  await expect(profiles.locator("option", { hasText: "DC-2" })).toHaveCount(0);
  await expect(page.getByLabel("Stop Value")).toHaveValue("1.4");

  await page.getByRole("button", { name: "Edit configuration name" }).click();
  await page.getByLabel("Configuration name", { exact: true }).fill("Discarded rename");
  await page.getByLabel("Configuration name", { exact: true }).press("Escape");
  await expect(profiles.locator('option[value="0"]')).toHaveText("DC-1 (DC)");

  await page.getByRole("button", { name: "Edit configuration name" }).click();
  await page.getByLabel("Configuration name", { exact: true }).fill("Primary sweep");
  await page.getByLabel("Configuration name", { exact: true }).press("Enter");
  await page.reload();
  await expect(page.locator('[data-canvas-ready="true"]')).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: "Simulate Circuit" }).click();
  await expect(page.getByLabel("Saved simulation configuration", { exact: true }).locator('option[value="0"]')).toHaveText("Primary sweep (DC)");
  await expect(page.getByLabel("Stop Value")).toHaveValue("1.4");

  await page.getByRole("button", { name: "Delete configuration" }).click();
  await expect(profiles.locator("option", { hasText: "Primary sweep" })).toHaveCount(0);
  await expect(profiles).toHaveValue("0");
  await expect(page.getByLabel("Stop Time")).toHaveValue("2m");
  await profiles.selectOption("1");
  await page.getByRole("button", { name: "Delete configuration" }).click();
  await expect(profiles).toHaveValue("0");
  await expect(page.getByLabel("Stop Time")).toHaveValue("2m");
  await page.getByRole("button", { name: "Delete configuration" }).click();
  await expect(page.getByRole("radio", { name: "None" })).toBeChecked();
  expect(await storedProfileCount(page)).toBe(0);
});

test("import normalizes missing and duplicate profile names without dropping settings", async ({ page }) => {
  await openSimulation(page, [
    { type: "DC", name: "Sweep", source: "vin", start: "0", stop: "1", step: "0.1" },
    { type: "Transient", name: " sweep ", stopTime: "1m", timeStep: "10u" },
    { type: "DC", source: "vin", start: "0.1", stop: "1.1", step: "0.2" },
  ]);
  const profiles = page.getByLabel("Saved simulation configuration", { exact: true });
  await expect(profiles.locator('option[value="0"]')).toHaveText("Sweep (DC)");
  await expect(profiles.locator('option[value="1"]')).toHaveText("Transient-1 (Transient)");
  await expect(profiles.locator('option[value="2"]')).toHaveText("DC-1 (DC)");
  await profiles.selectOption("2");
  await expect(page.getByLabel("Start Value")).toHaveValue("0.1");
  await expect(page.getByLabel("Stop Value")).toHaveValue("1.1");
});
