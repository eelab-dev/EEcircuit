import { test, expect } from "./fixtures";

test("clean startup keeps the ready canvas instance across viewport resize", async ({ page }) => {
  await page.goto("/?clean=true");

  const canvas = page.locator("canvas#schematic-canvas");
  await expect(canvas).toBeVisible();
  await expect(canvas).toHaveAttribute("data-canvas-ready", "true", { timeout: 15000 });

  const canvasHandle = await canvas.elementHandle();
  expect(canvasHandle).not.toBeNull();
  await page.setViewportSize({ width: 1000, height: 700 });

  await expect(canvas).toHaveAttribute("data-canvas-ready", "true", { timeout: 5000 });
  const sameCanvas = await page.evaluate((element) => element === document.querySelector("canvas#schematic-canvas"), canvasHandle);
  expect(sameCanvas).toBe(true);
});
