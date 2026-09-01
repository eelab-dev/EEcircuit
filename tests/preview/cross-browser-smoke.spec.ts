import { expect, test } from "@playwright/test";

test.use({ baseURL: process.env.EECIRCUIT_PREVIEW_ORIGIN ?? "http://127.0.0.1:4176" });

test("production UI, Monaco, worker simulation, plot, theme, and pointer input work", async ({ page }) => {
  test.setTimeout(60_000);
  const pageErrors: Error[] = [];
  page.on("pageerror", (error) => pageErrors.push(error));

  await page.goto("/");
  await expect(page.locator('[data-ui-runtime="svelte"]')).toBeVisible();
  const schematic = page.locator('[data-canvas-ready="true"]');
  await expect(schematic).toBeVisible({ timeout: 15_000 });

  const initialTheme = await page.locator("html").getAttribute("class");
  await page.getByRole("button", { name: "Toggle color mode" }).click();
  await expect.poll(() => page.locator("html").getAttribute("class")).not.toBe(initialTheme);

  const box = await schematic.boundingBox();
  if (!box) throw new Error("Schematic canvas has no pointer target");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.up();

  await page.getByRole("button", { name: "Simulate Circuit" }).click();
  await expect(page.locator(".monaco-editor")).toBeVisible({ timeout: 15_000 });
  const workspaceBox = await page.locator(".workspace-stack").boundingBox();
  const simulationBox = await page.locator(".simulation-workspace").boundingBox();
  if (!workspaceBox || !simulationBox) throw new Error("Simulation workspace has no layout bounds");
  expect(Math.abs(simulationBox.y - workspaceBox.y)).toBeLessThan(2);
  expect(Math.abs((simulationBox.y + simulationBox.height) - (workspaceBox.y + workspaceBox.height))).toBeLessThan(2);
  await page.getByText("Transient", { exact: true }).click();
  await page.getByLabel("Stop Time").fill("10u");
  await page.getByLabel("Time Step").fill("100n");
  await page.getByRole("button", { name: "Run Simulation" }).click();

  await expect(page.getByRole("tab", { name: "plot display" })).toHaveAttribute("aria-selected", "true", { timeout: 20_000 });
  await expect(page.locator("canvas.plot-webgl").first()).toBeVisible();
  const plotBox = await page.locator(".plot-workspace").boundingBox();
  if (!plotBox) throw new Error("Plot workspace has no layout bounds");
  expect(Math.abs(plotBox.y - workspaceBox.y)).toBeLessThan(2);
  expect(Math.abs((plotBox.y + plotBox.height) - (workspaceBox.y + workspaceBox.height))).toBeLessThan(2);
  expect(pageErrors).toEqual([]);
});
