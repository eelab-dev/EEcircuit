import { expect, test, type Page } from "@playwright/test";

test.use({ baseURL: process.env.EECIRCUIT_PREVIEW_ORIGIN ?? "http://127.0.0.1:4176" });

type RuntimeMetrics = {
  schematicReadyMs: number;
  primaryUiReadyMs: number;
  engineReadyMs: number;
  jsEncodedBytes: number;
  jsTransferredBytes: number;
  scriptDurationMs: number;
  taskDurationMs: number;
  heapUsedBytes: number;
  longTaskCount: number;
  maxLongTaskMs: number;
};

async function collectRuntimeMetrics(page: Page): Promise<RuntimeMetrics> {
  const session = await page.context().newCDPSession(page);
  await session.send("Performance.enable");
  await page.addInitScript(() => {
    const durations: number[] = [];
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) durations.push(entry.duration);
    }).observe({ type: "longtask", buffered: true });
    (window as typeof window & { __eecircuitLongTasks?: number[] }).__eecircuitLongTasks = durations;
  });

  await page.goto("/");
  await expect(page.locator('[data-canvas-ready="true"]')).toBeVisible({ timeout: 15_000 });
  await expect.poll(() => page.evaluate(() => performance.getEntriesByName("eecircuit:simulation-engine-ready").length), { timeout: 30_000 }).toBe(1);

  const browserMetrics = await session.send("Performance.getMetrics");
  await session.detach();
  const metric = (name: string) => browserMetrics.metrics.find((entry) => entry.name === name)?.value ?? 0;

  return page.evaluate(({ scriptDuration, taskDuration, heapUsed }) => {
    const mark = (name: string) => performance.getEntriesByName(name).at(-1)?.startTime ?? -1;
    const scripts = performance.getEntriesByType("resource").filter((entry) => entry.name.endsWith(".js")) as PerformanceResourceTiming[];
    const longTasks = (window as typeof window & { __eecircuitLongTasks?: number[] }).__eecircuitLongTasks ?? [];
    return {
      schematicReadyMs: mark("eecircuit:schematic-ready"),
      primaryUiReadyMs: mark("eecircuit:primary-ui-ready"),
      engineReadyMs: mark("eecircuit:simulation-engine-ready"),
      jsEncodedBytes: scripts.reduce((sum, entry) => sum + entry.encodedBodySize, 0),
      jsTransferredBytes: scripts.reduce((sum, entry) => sum + entry.transferSize, 0),
      scriptDurationMs: scriptDuration * 1_000,
      taskDurationMs: taskDuration * 1_000,
      heapUsedBytes: heapUsed,
      longTaskCount: longTasks.length,
      maxLongTaskMs: Math.max(0, ...longTasks),
    };
  }, {
    scriptDuration: metric("ScriptDuration"),
    taskDuration: metric("TaskDuration"),
    heapUsed: metric("JSHeapUsedSize"),
  });
}

async function medianSettingsLatency(page: Page): Promise<number> {
  const samples: number[] = [];
  for (let index = 0; index < 7; index += 1) {
    const start = performance.now();
    await page.getByRole("button", { name: "Simulation Settings" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    samples.push(performance.now() - start);
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
  }
  samples.sort((left, right) => left - right);
  return samples[Math.floor(samples.length / 2)] ?? -1;
}

async function medianPropertyEditLatency(page: Page): Promise<number> {
  const canvas = page.locator("#schematic-canvas");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Schematic canvas has no bounding box");
  let target: { x: number; y: number } | undefined;
  for (let y = box.y + 30; y < box.y + box.height - 30 && !target; y += 25) {
    for (let x = box.x + 30; x < box.x + box.width - 30; x += 25) {
      await page.mouse.move(x, y);
      const componentHit = await page.evaluate(() => [...document.querySelectorAll("button, output")].some((element) => /^(?:R1|M1|Vsup|vin)\s*[—-]\s*\d+/i.test(element.textContent?.trim() ?? "")));
      if (componentHit) { target = { x, y }; break; }
    }
  }
  if (!target) throw new Error("Could not locate a demo component for the property benchmark");
  await page.mouse.click(target.x, target.y);
  const panel = page.locator("[data-properties-dialog]");
  await expect(panel).toBeVisible();
  const input = page.getByPlaceholder("Component name (e.g., R1, C1)");
  const original = await input.inputValue();
  const samples: number[] = [];
  for (let index = 0; index < 7; index += 1) {
    const value = `${original}_${index}`;
    const start = performance.now();
    await input.fill(value);
    await expect(input).toHaveValue(value);
    samples.push(performance.now() - start);
  }
  await page.getByRole("button", { name: "Cancel" }).click();
  samples.sort((left, right) => left - right);
  return samples[Math.floor(samples.length / 2)] ?? -1;
}

async function measureSimulationInteractions(page: Page) {
  const tabStart = performance.now();
  await page.getByRole("button", { name: "Simulate Circuit" }).click();
  await expect(page.getByText("Simulation Configuration", { exact: false }).first()).toBeVisible();
  const simulationTabMs = performance.now() - tabStart;

  await page.getByText("Transient", { exact: true }).click();
  await page.getByLabel("Stop Time").fill("10u");
  await page.getByLabel("Time Step").fill("100n");
  await page.getByRole("button", { name: "Run Simulation" }).click();
  await expect(page.getByText("Plot Variables").first()).toBeVisible({ timeout: 20_000 });

  const checkbox = page.getByRole("checkbox").first();
  const samples: number[] = [];
  for (let index = 0; index < 7; index += 1) {
    const wasChecked = await checkbox.isChecked();
    const start = performance.now();
    await checkbox.evaluate((element: HTMLInputElement) => element.click());
    await expect(checkbox).toBeChecked({ checked: !wasChecked });
    samples.push(performance.now() - start);
  }
  samples.sort((left, right) => left - right);
  return { simulationTabMs, variableSelectionMedianMs: samples[Math.floor(samples.length / 2)] ?? -1 };
}

async function measureFrameStability(page: Page) {
  return page.evaluate(() => new Promise<{ medianFrameMs: number; p95FrameMs: number; maxFrameMs: number; framesOver25Ms: number }>((resolve) => {
    const intervals: number[] = [];
    let previous = performance.now();
    const sample = (now: number) => {
      intervals.push(now - previous);
      previous = now;
      if (intervals.length < 120) requestAnimationFrame(sample);
      else {
        intervals.sort((left, right) => left - right);
        resolve({
          medianFrameMs: intervals[Math.floor(intervals.length / 2)] ?? -1,
          p95FrameMs: intervals[Math.floor(intervals.length * .95)] ?? -1,
          maxFrameMs: intervals.at(-1) ?? -1,
          framesOver25Ms: intervals.filter((interval) => interval > 25).length,
        });
      }
    };
    requestAnimationFrame(sample);
  }));
}

test("records representative cold and warm production performance", async ({ page }) => {
  test.setTimeout(90_000);
  const cold = await collectRuntimeMetrics(page);
  const frameStability = await measureFrameStability(page);
  const settingsMedianMs = await medianSettingsLatency(page);
  const propertyEditMedianMs = await medianPropertyEditLatency(page);
  const interactions = await measureSimulationInteractions(page);
  await page.reload();
  await expect(page.locator('[data-canvas-ready="true"]')).toBeVisible({ timeout: 15_000 });
  const warmReadyMs = await page.evaluate(() => performance.getEntriesByName("eecircuit:schematic-ready").at(-1)?.startTime ?? -1);

  expect(cold.schematicReadyMs).toBeGreaterThan(0);
  expect(cold.primaryUiReadyMs).toBeGreaterThanOrEqual(cold.schematicReadyMs);
  expect(cold.engineReadyMs).toBeGreaterThanOrEqual(cold.primaryUiReadyMs);
  expect(warmReadyMs).toBeGreaterThan(0);
  console.log(`[PERF] ${JSON.stringify({ cold, frameStability, warmReadyMs, settingsMedianMs, propertyEditMedianMs, ...interactions })}`);
});
