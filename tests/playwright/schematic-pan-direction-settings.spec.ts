import { expect, test, type Page } from "./fixtures";

type Point = { x: number; y: number };

const STORAGE_KEY = "eecircuit-wheel-pan-directions";

async function waitForSchematic(page: Page) {
  await expect(page.locator("#schematic-canvas")).toHaveAttribute(
    "data-canvas-ready",
    "true",
    { timeout: 15_000 },
  );
}

async function openGeneralSettings(page: Page) {
  await page.getByRole("button", { name: "Simulation Settings" }).click();
  await page.getByRole("button", { name: "General Settings" }).click();
}

async function readCoordinates(page: Page): Promise<Point> {
  const text = await page.getByLabel("Schematic coordinates").textContent();
  const match = text?.match(/X:\s*(-?\d+), Y:\s*(-?\d+)/);
  if (!match?.[1] || !match[2]) throw new Error(`Unable to parse schematic coordinates: ${text}`);
  return { x: Number(match[1]), y: Number(match[2]) };
}

async function coordinatesAtTestPoint(page: Page): Promise<Point> {
  const canvas = page.locator("#schematic-canvas");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Schematic canvas is not measurable");
  const x = box.x + box.width * 0.6;
  const y = box.y + box.height * 0.45;
  await page.mouse.move(x + 12, y + 12);
  await page.waitForTimeout(20);
  await page.mouse.move(x, y);
  await expect.poll(async () => (await readCoordinates(page)).x, { timeout: 2_000 }).not.toBeNaN();
  return readCoordinates(page);
}

async function wheelPan(page: Page, deltaX: number, deltaY: number): Promise<{ before: Point; after: Point }> {
  const canvas = page.locator("#schematic-canvas");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Schematic canvas is not measurable");
  const position = { x: box.width * 0.6, y: box.height * 0.45 };
  await canvas.hover({ position });
  const before = await coordinatesAtTestPoint(page);
  await page.mouse.wheel(deltaX, deltaY);
  await page.waitForTimeout(50);
  const after = await coordinatesAtTestPoint(page);
  return { before, after };
}

test("saved schematic pan directions apply independently after reload", async ({ page }) => {
  await page.goto("/?clean=true");
  await waitForSchematic(page);

  await openGeneralSettings(page);
  const horizontal = page.getByLabel("Reverse horizontal panning");
  const vertical = page.getByLabel("Reverse vertical panning");
  await expect(horizontal).not.toBeChecked();
  await expect(vertical).not.toBeChecked();
  await expect(page.getByText("Reload required for pan-direction changes.", { exact: true })).toBeVisible();

  await horizontal.check();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toBe(
    JSON.stringify({ reverseHorizontalWheelPan: true, reverseVerticalWheelPan: false }),
  );

  await page.reload();
  await waitForSchematic(page);
  await openGeneralSettings(page);
  await expect(horizontal).toBeChecked();
  await expect(vertical).not.toBeChecked();
  await page.getByRole("button", { name: "Cancel" }).click();

  const horizontalReversed = await wheelPan(page, 120, 0);
  expect(horizontalReversed.after.x).toBeLessThan(horizontalReversed.before.x);
  const verticalSystem = await wheelPan(page, 0, 120);
  expect(verticalSystem.after.y).toBeLessThan(verticalSystem.before.y);

  await openGeneralSettings(page);
  await horizontal.uncheck();
  await vertical.check();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), STORAGE_KEY)).toBe(
    JSON.stringify({ reverseHorizontalWheelPan: false, reverseVerticalWheelPan: true }),
  );

  await page.reload();
  await waitForSchematic(page);
  await openGeneralSettings(page);
  await expect(horizontal).not.toBeChecked();
  await expect(vertical).toBeChecked();
  await page.getByRole("button", { name: "Cancel" }).click();

  const horizontalSystem = await wheelPan(page, 120, 0);
  expect(horizontalSystem.after.x).toBeGreaterThan(horizontalSystem.before.x);
  const verticalReversed = await wheelPan(page, 0, 120);
  expect(verticalReversed.after.y).toBeGreaterThan(verticalReversed.before.y);
});
