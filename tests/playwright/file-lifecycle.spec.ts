import { expect, test } from "./fixtures";

const file = (name: string, value: unknown) => ({
  name,
  mimeType: "application/json",
  buffer: Buffer.from(JSON.stringify(value)),
});

test.describe("file lifecycle", () => {
  test("rejects malformed imports and accepts configuration-only files", async ({ page }) => {
    await page.goto("/");
    const input = page.locator('input[type="file"]').first();

    const dialogPromise = page.waitForEvent("dialog");
    await input.setInputFiles(file("malformed.json", {
      schema: "EEcircuitV1",
      schematic: { componentInstances: {}, wires: [] },
    }));
    const dialog = await dialogPromise;
    expect(dialog.message()).toContain("Failed to load schematic file");
    await dialog.accept();

    await input.setInputFiles(file("configuration-only.json", {
      schema: "EEcircuitV1",
      title: "Configuration only",
      simulations: [{ type: "None" }],
    }));
    await expect(page.getByLabel("Simulate Circuit")).toBeEnabled();
    await expect(page.locator('[data-canvas-ready="true"]')).toBeVisible();
  });

  test("saves a valid EEcircuit file through the browser download path", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('[data-canvas-ready="true"]')).toBeVisible();
    page.on("dialog", (dialog) => void dialog.accept());

    const downloadPromise = page.waitForEvent("download");
    await page.getByLabel("Save EEcircuit file").first().click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^EEcircuit-.*\.json$/);
  });
});
