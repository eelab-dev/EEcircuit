import { expect, test, type Page } from "./fixtures";

async function waitForSchematic(page: Page) {
  await page.goto("/?clean=true");
  await expect(page.locator("#schematic-canvas")).toHaveAttribute("data-canvas-ready", "true", { timeout: 15_000 });
}

test("disabled tabs explain their prerequisites and remain keyboard discoverable", async ({ page }) => {
  await waitForSchematic(page);
  const simulation = page.getByRole("tab", { name: "simulation config" });
  const plotting = page.getByRole("tab", { name: "plot display" });

  await expect(simulation).toHaveAttribute("aria-disabled", "true");
  await simulation.focus();
  await expect(page.getByRole("tooltip", { name: /generate a netlist/i })).toBeVisible();
  await simulation.press("Enter");
  await expect(page.getByRole("tab", { name: "Schematic" })).toHaveAttribute("aria-selected", "true");

  await plotting.focus();
  await expect(page.getByRole("tooltip", { name: /successful simulation/i })).toBeVisible();
});

test("status history exposes categories, timestamps, developer filtering, copy, and clear", async ({ page }) => {
  await waitForSchematic(page);
  await page.locator('input[type="file"]').setInputFiles({
    name: "invalid.json",
    mimeType: "application/json",
    buffer: Buffer.from("not json"),
  });

  const status = page.getByRole("button", { name: /1 error/ });
  await expect(status).toBeVisible();
  await status.click();
  const dialog = page.getByRole("dialog", { name: "Application Status" });
  await expect(dialog.getByText("The selected file is not valid JSON.")).toBeVisible();
  await expect(dialog.locator("time")).toHaveCount(1);
  for (const category of ["Schematic", "Simulation", "Plotting"]) {
    await expect(dialog.getByLabel(category)).toBeVisible();
  }
  await expect(dialog.getByLabel("Show developer messages")).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Copy messages" })).toBeVisible();
  await dialog.getByRole("button", { name: "Clear messages" }).click();
  await expect(dialog.getByText("No status messages.")).toBeVisible();
});

test("informational messages stay in history while warnings open a toast", async ({ page }) => {
  await waitForSchematic(page);
  await page.evaluate(async () => {
    type TestState = {
      addMessage: (message: { text: string; type: "info" | "warning"; category: "Schematic"; mLevel: "user" }) => void;
    };
    const loadState = new Function("return import('/src/svelte/state/appState.svelte.ts')") as () => Promise<{ appState: TestState }>;
    const { appState } = await loadState();
    appState.addMessage({ text: "Transistor width changed.", type: "info", category: "Schematic", mLevel: "user" });
    appState.addMessage({ text: "Example schematic warning.", type: "warning", category: "Schematic", mLevel: "user" });
  });

  const toastStack = page.locator(".toast-stack");
  await expect(toastStack.getByText("Example schematic warning.")).toBeVisible();
  await expect(toastStack.getByText("Transistor width changed.")).toHaveCount(0);

  await page.getByRole("button", { name: /1 warning/ }).click();
  const dialog = page.getByRole("dialog", { name: "Application Status" });
  await expect(dialog.getByText("Transistor width changed.")).toBeVisible();
  await expect(dialog.getByText("Example schematic warning.")).toBeVisible();
});

test("settings and About restore the peripheral controls and external links", async ({ page }) => {
  await waitForSchematic(page);
  await page.getByRole("button", { name: "Simulation Settings" }).click();
  await page.getByRole("button", { name: "General Settings" }).click();
  await expect(page.getByRole("button", { name: "Clear Local Storage" })).toBeVisible();
  await page.getByRole("button", { name: "Plotting Settings" }).click();
  await expect(page.getByLabel("Plot line thickness")).toHaveAttribute("max", "10");
  await page.getByRole("button", { name: "Cancel" }).click();

  await page.getByRole("button", { name: "About EEcircuit" }).click();
  const dialog = page.getByRole("dialog", { name: "About EEcircuit" });
  await expect(dialog.getByRole("link", { name: /help.eecircuit.com/ })).toHaveAttribute("href", "https://help.eecircuit.com");
  await expect(dialog.getByRole("link", { name: /GitHub repository/ })).toHaveAttribute("href", "https://github.com/eelab-dev/EEcircuit");
  await expect(dialog.getByRole("link", { name: /Issue Tracker/ })).toHaveAttribute("href", "https://github.com/eelab-dev/EEcircuit/issues");
});

test("simulation controls stack above the editor at tablet width", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 700, height: 900 });
  await waitForSchematic(page);
  await page.getByRole("button", { name: "New Schematic" }).click();
  await page.getByRole("button", { name: "Load Demo" }).click();
  await page.getByRole("button", { name: "Simulate Circuit" }).click({ modifiers: ["Shift"] });
  await expect(page.getByRole("group", { name: "Simulation Configuration" })).toBeVisible({ timeout: 10_000 });

  const sidebar = await page.locator(".simulation-sidebar").boundingBox();
  const editor = await page.locator(".netlist-pane").boundingBox();
  if (!sidebar || !editor) throw new Error("Responsive simulation layout is missing");
  expect(sidebar.y).toBeLessThan(editor.y);
  expect(Math.abs(sidebar.width - editor.width)).toBeLessThan(2);
  await page.screenshot({ path: testInfo.outputPath("simulation-tablet.png") });
});
