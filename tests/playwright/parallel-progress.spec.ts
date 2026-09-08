import { expect, test } from "./fixtures";
import type { AppStore } from "../../src/store/appStoreTypes";

test("bracket progress hides on completion while results and thread accounting remain available", async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  await page.goto("/");
  await expect(page.locator('[data-canvas-ready="true"]')).toBeVisible({ timeout: 15_000 });

  await page.evaluate(async () => {
    const loadState = new Function("return import('/src/svelte/state/appState.svelte.ts')") as () => Promise<{ appState: AppStore }>;
    const { appState } = await loadState();
    appState.setMaxWebWorkers(4);
    await appState.runParallelSimulation(`
V1 out 0 1
R1 out 0 1k
.tran 10n [1:1:10]u
.end
`);
  });

  const progressOverlay = page.getByLabel("Parallel simulation progress");
  await expect(progressOverlay).toHaveCount(0);
  await expect(page.locator("canvas[data-canvas-id]").first()).toBeVisible();
  await expect(page.locator(".bracket-slider input")).toBeVisible();
  await expect(page.locator(".bracket-slider input")).toHaveAttribute("max", "9");

  const progress = await page.evaluate(async () => {
    const loadState = new Function("return import('/src/svelte/state/appState.svelte.ts')") as () => Promise<{ appState: AppStore }>;
    const { appState } = await loadState();
    return appState.parallelSimulationProgress;
  });

  expect(progress).toMatchObject({ total: 10, completed: 10, successful: 10, failed: 0 });
  const threadStates = progress.threads.filter((thread) => thread.totalAssignedSimulations > 0);
  expect(threadStates.length).toBeGreaterThan(0);
  expect(threadStates.length).toBeLessThanOrEqual(4);
  expect(threadStates.reduce((sum, thread) => sum + thread.completedSimulations, 0)).toBe(10);
  for (const thread of threadStates) {
    expect(thread.completedSimulations).toBe(thread.totalAssignedSimulations);
    expect(thread.isRunning).toBe(false);
    expect(thread.isCompleted).toBe(true);
  }

  await page.getByRole("tab", { name: "Schematic", exact: true }).click();
  await page.getByRole("tab", { name: "plot display", exact: true }).click();
  await expect(page.locator(".bracket-slider input")).toBeVisible();
  await expect(progressOverlay).toHaveCount(0);

  // Hold a subsequent run in progress so visibility does not depend on worker timing.
  await page.evaluate(async () => {
    const loadState = new Function("return import('/src/svelte/state/appState.svelte.ts')") as () => Promise<{ appState: AppStore }>;
    const { appState } = await loadState();
    appState.updateParallelSimulationProgress({ total: 10, completed: 3, successful: 2, failed: 1 });
    appState.setParallelSimulationRunning(true);
  });
  await expect(progressOverlay).toBeVisible();
  await expect(progressOverlay).toContainText("Parallel Simulation");
  await expect(progressOverlay).toContainText("3/10");
  await expect(progressOverlay).toContainText("2 successful");
  await expect(progressOverlay).toContainText("1 failed");
  await expect(progressOverlay.getByRole("progressbar", { exact: true, name: "" })).toHaveAttribute("aria-valuenow", "3");

  // Ending a run must hide the panel even with partial progress or failed jobs.
  await page.evaluate(async () => {
    const loadState = new Function("return import('/src/svelte/state/appState.svelte.ts')") as () => Promise<{ appState: AppStore }>;
    (await loadState()).appState.setParallelSimulationRunning(false);
  });
  await expect(progressOverlay).toHaveCount(0);
  await expect(page.locator("canvas[data-canvas-id]").first()).toBeVisible();
  await expect(page.locator(".bracket-slider input")).toBeVisible();

  await page.screenshot({ path: testInfo.outputPath("completed-bracket-plot.png") });
});
