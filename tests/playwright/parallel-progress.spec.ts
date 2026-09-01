import { expect, test } from "./fixtures";

test("completed bracket simulation shows truthful full per-thread progress", async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  await page.goto("/");
  await expect(page.locator('[data-canvas-ready="true"]')).toBeVisible({ timeout: 15_000 });

  await page.evaluate(async () => {
    type TestState = {
      setMaxWebWorkers: (count: number) => void;
      runParallelSimulation: (netlist: string) => Promise<void>;
    };
    const loadState = new Function("return import('/src/svelte/state/appState.svelte.ts')") as () => Promise<{ appState: TestState }>;
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
  await expect(progressOverlay).toContainText("Parallel Simulation Complete");
  await expect(progressOverlay).toContainText("10/10");
  await expect(progressOverlay).toContainText("10 successful");
  await expect(progressOverlay).toContainText("0 failed");

  const threadStates = await progressOverlay.locator(".thread-progress-list > div").evaluateAll((rows) =>
    rows.map((row) => {
      const progress = row.querySelector("progress");
      const text = row.querySelector("span:last-child")?.textContent?.trim() ?? "";
      const [completed = -1, assigned = -2] = text.split("/").map(Number);
      return { completed, assigned, value: progress?.value ?? -1, max: progress?.max ?? -2 };
    }),
  );

  expect(threadStates.length).toBeGreaterThan(0);
  expect(threadStates.length).toBeLessThanOrEqual(4);
  expect(threadStates.reduce((sum, thread) => sum + thread.completed, 0)).toBe(10);
  for (const thread of threadStates) {
    expect(thread.completed).toBe(thread.assigned);
    expect(thread.value).toBe(thread.max);
  }

  await page.screenshot({ path: testInfo.outputPath("completed-thread-progress.png") });
});
