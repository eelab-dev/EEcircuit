import { readdir } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";

test.use({ baseURL: process.env.EECIRCUIT_PREVIEW_ORIGIN ?? "http://127.0.0.1:4176" });

const backgroundChunkNames = [
  "SimulationView-",
  "PlotView-",
  "parallelSimulation-",
];

const simulationRuntimeChunkNames = [
  "bracketParser-",
  "resultAggregator-",
];

const expectBackgroundUiPreloaded = async (page: Page, url: string) => {
  await page.goto(url);
  await expect(page.locator('[data-canvas-ready="true"]')).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("tab", { name: "Schematic" })).toHaveAttribute(
    "aria-selected",
    "true",
  );

  await expect
    .poll(
      () =>
        page.evaluate((chunkNames) => {
          const resources = performance
            .getEntriesByType("resource")
            .map((entry) => entry.name)
            .filter((name) => name.endsWith(".js"));
          return chunkNames.filter(
            (chunkName) => !resources.some((resource) => resource.includes(chunkName)),
          );
        }, backgroundChunkNames),
      { timeout: 15_000 },
    )
    .toEqual([]);

  await expect.poll(() => page.evaluate(() => ({
    engineReadyMarks: performance.getEntriesByName("eecircuit:simulation-engine-ready").length,
    status: (window as typeof window & {
      _workerPoolDebug?: {
        getStatus(): {
          initialized: boolean;
          totalWorkers: number;
          availableWorkers: number;
          busyWorkers: number;
          readyWorkers: number;
        };
      };
    })._workerPoolDebug?.getStatus(),
  })), { timeout: 30_000 }).toEqual({
    engineReadyMarks: 1,
    status: {
      initialized: true,
      totalWorkers: 1,
      availableWorkers: 1,
      busyWorkers: 0,
      readyWorkers: 1,
    },
  });

  const preloadTiming = await page.evaluate(({ chunkNames, runtimeChunkNames }) => {
    const readyMark = performance.getEntriesByName("eecircuit:schematic-ready").at(-1);
    const primaryReadyMark = performance.getEntriesByName("eecircuit:primary-ui-ready").at(-1);
    const engineReadyMark = performance.getEntriesByName("eecircuit:simulation-engine-ready").at(-1);
    const resources = performance
      .getEntriesByType("resource")
      .filter((entry) => entry.name.endsWith(".js"));

    return {
      readyAt: readyMark?.startTime ?? -1,
      primaryReadyAt: primaryReadyMark?.startTime ?? -1,
      engineReadyAt: engineReadyMark?.startTime ?? -1,
      starts: chunkNames.map((chunkName) => ({
        chunkName,
        startTimes: resources
          .filter((resource) => resource.name.includes(chunkName))
          .map((resource) => resource.startTime),
      })),
      runtimeStarts: runtimeChunkNames.map((chunkName) => ({
        chunkName,
        startTimes: resources
          .filter((resource) => resource.name.includes(chunkName))
          .map((resource) => resource.startTime),
      })),
    };
  }, { chunkNames: backgroundChunkNames, runtimeChunkNames: simulationRuntimeChunkNames });

  expect(preloadTiming.readyAt).toBeGreaterThanOrEqual(0);
  expect(preloadTiming.primaryReadyAt).toBeGreaterThanOrEqual(preloadTiming.readyAt);
  expect(preloadTiming.engineReadyAt).toBeGreaterThan(preloadTiming.primaryReadyAt);
  for (const chunk of preloadTiming.starts) {
    expect(chunk.startTimes, `${chunk.chunkName} should load exactly once`).toHaveLength(1);
    expect(chunk.startTimes[0], `${chunk.chunkName} loaded before schematic readiness`).toBeGreaterThanOrEqual(
      preloadTiming.readyAt,
    );
  }
  for (const chunk of preloadTiming.runtimeStarts) {
    expect(chunk.startTimes.length, `${chunk.chunkName} must remain lazy before the first run`).toBe(0);
  }

  await expect(page.locator(".monaco-editor")).toHaveCount(0);
  await expect(page.getByText("Plot Variables")).toHaveCount(0);
  await expect(page.getByRole("dialog")).toHaveCount(0);
};

const getJavaScriptResources = (page: Page) => page.evaluate(() =>
  performance
    .getEntriesByType("resource")
    .map((entry) => entry.name)
    .filter((name) => name.endsWith(".js")),
);

const startTabFallbackObserver = (page: Page) => page.evaluate(() => {
  const observedLabels: string[] = [];
  const observer = new MutationObserver((records) => {
    for (const record of records) {
      for (const addedNode of record.addedNodes) {
        if (!(addedNode instanceof Element)) continue;
        const loadingPanels = [
          ...(addedNode.matches("[data-tab-panel-loading]") ? [addedNode] : []),
          ...addedNode.querySelectorAll("[data-tab-panel-loading]"),
        ];
        for (const loadingPanel of loadingPanels) {
          const label = loadingPanel.getAttribute("data-tab-panel-loading");
          if (label) observedLabels.push(label);
        }
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
  (window as typeof window & {
    __tabFallbackObservation?: { observer: MutationObserver; observedLabels: string[] };
  }).__tabFallbackObservation = { observer, observedLabels };
});

const stopTabFallbackObserver = (page: Page) => page.evaluate(() => {
  const observation = (window as typeof window & {
    __tabFallbackObservation?: { observer: MutationObserver; observedLabels: string[] };
  }).__tabFallbackObservation;
  observation?.observer.disconnect();
  return observation?.observedLabels ?? [];
});

test("production preview evaluates lazy features and every browser chunk without errors", async ({ page }) => {
  test.setTimeout(60_000);
  const browserErrors: Error[] = [];
  const consoleErrors: string[] = [];
  page.on("pageerror", (error) => browserErrors.push(error));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });

  await expectBackgroundUiPreloaded(page, "/?clean=true");
  await expectBackgroundUiPreloaded(page, "/");

  await page.getByRole("button", { name: "New Schematic" }).click();
  await expect(page.getByText("Create New Schematic", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Load Demo" }).click();

  await page.getByRole("button", { name: "Simulation Settings" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Cancel" }).click();

  await page.getByRole("button", { name: "About EEcircuit" }).click();
  await expect(page.getByText("About EEcircuit", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Close dialog" }).click();

  await page.getByRole("button", { name: "Open keyboard shortcuts" }).click();
  await expect(page.getByText("Keyboard Shortcuts", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Close shortcuts dialog" }).click();

  await page.getByRole("button", { name: "Export schematic image" }).click();
  await expect(page.getByText("Export Schematic", { exact: true })).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: "Close export dialog" }).click();

  await startTabFallbackObserver(page);
  const resourcesBeforeSimulationTab = await getJavaScriptResources(page);
  await page.getByRole("button", { name: "Simulate Circuit" }).click();

  await expect(page.getByRole("tab", { name: "simulation config" })).toHaveAttribute(
    "aria-selected",
    "true",
    { timeout: 15_000 },
  );
  await expect(page.locator(".monaco-editor")).toBeVisible({ timeout: 15_000 });
  const resourcesAfterSimulationTab = await getJavaScriptResources(page);
  expect(resourcesAfterSimulationTab.filter((resource) =>
    !resourcesBeforeSimulationTab.includes(resource) &&
    simulationRuntimeChunkNames.some((chunkName) => resource.includes(chunkName)),
  )).toEqual([]);
  await expect(page.getByText("Loading engine", { exact: true })).toHaveCount(0);

  await page.getByText("Transient", { exact: true }).click();
  await page.getByLabel("Stop Time").fill("10m");
  await page.getByLabel("Time Step").fill("100u");
  const resourcesBeforeRun = await getJavaScriptResources(page);
  await page.getByRole("button", { name: /Run Simulation|Run/i }).click();
  await expect(page.getByText("Plot Variables")).toBeVisible({ timeout: 20_000 });
  const resourcesAfterRun = await getJavaScriptResources(page);
  const newlyLoadedSimulationRuntime = resourcesAfterRun.filter((resource) =>
    !resourcesBeforeRun.includes(resource) &&
    simulationRuntimeChunkNames.some((chunkName) => resource.includes(chunkName)),
  );
  expect(newlyLoadedSimulationRuntime.filter((resource) => resource.includes("bracketParser-"))).toHaveLength(1);
  expect(newlyLoadedSimulationRuntime.some((resource) => resource.includes("resultAggregator-"))).toBe(false);
  expect(await stopTabFallbackObserver(page)).toEqual([]);

  const browserChunks = (await readdir("dist/assets"))
    .filter((file) => file.endsWith(".js"))
    .filter((file) => !/^(?:canvas|exporters|simulationWorker)-/.test(file))
    .filter((file) => !/^(?:editor|json|html|css|ts)\.worker-/.test(file));

  expect(browserChunks.length).toBeGreaterThan(0);
  for (const chunk of browserChunks) {
    await page.evaluate(async (url) => {
      await import(url);
    }, `/assets/${chunk}`);
  }

  expect(browserErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
