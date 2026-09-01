import { expect, test } from "./fixtures";

test("Svelte runtime owns the application without a React root", async ({ page }) => {
  await page.goto("/?clean=true");
  await expect(page.locator('[data-ui-runtime="svelte"]')).toBeVisible();
  await expect(page.locator("#schematic-canvas")).toHaveAttribute(
    "data-canvas-ready",
    "true",
    { timeout: 15_000 },
  );
  expect(await page.locator("[data-reactroot]").count()).toBe(0);
});
