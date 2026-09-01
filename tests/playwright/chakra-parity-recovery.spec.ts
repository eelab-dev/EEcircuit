import { expect, test, type Page } from "./fixtures";

async function loadReadyApp(page: Page) {
  await page.goto("/");
  await expect(page.locator('[data-canvas-ready="true"]')).toBeVisible({ timeout: 15_000 });
}

async function openDemoSimulation(page: Page) {
  await loadReadyApp(page);
  await page.getByRole("button", { name: "New Schematic" }).click();
  await page.getByRole("button", { name: "Load Demo" }).click();
  await page.getByRole("button", { name: "Simulate Circuit" }).click();
  await expect(page.getByRole("group", { name: "Simulation Configuration" })).toBeVisible({ timeout: 10_000 });
}

async function runTransient(page: Page) {
  await openDemoSimulation(page);
  await page.getByText("Transient", { exact: true }).click();
  await page.getByLabel("Stop Time").fill("10u");
  await page.getByLabel("Time Step").fill("100n");
  await page.getByRole("button", { name: "Run Simulation" }).click();
  await expect(page.locator(".plot-webgl").first()).toBeVisible({ timeout: 20_000 });
}

async function hoverSchematicItem(page: Page) {
  const canvas = page.locator("#schematic-canvas");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Schematic canvas is missing");
  const pointerOutput = page.getByLabel("Schematic pointer information");
  const preferredPositions = [
    [.32, .9], [.49, .9], [.68, .78], [.32, .69], [.49, .25], [.68, .54],
  ];
  const gridPositions = Array.from({ length: 15 }, (_, row) => .15 + row * .05)
    .flatMap((y) => Array.from({ length: 17 }, (_, column) => [.1 + column * .05, y]));

  for (const [xFraction, yFraction] of [...preferredPositions, ...gridPositions]) {
    if (xFraction === undefined || yFraction === undefined) continue;
    await page.mouse.move(box.x + box.width * xFraction, box.y + box.height * yFraction);
    await page.waitForTimeout(15);
    if (await pointerOutput.isVisible()) return pointerOutput;
  }
  throw new Error("Could not hover a schematic item with pointer information");
}

test("manual Monaco edits survive leaving and returning to Simulation", async ({ page }) => {
  await openDemoSimulation(page);
  const editor = page.locator(".monaco-editor").first();
  await editor.click();
  await page.keyboard.press("Meta+A");
  await page.keyboard.press("Control+A");
  await page.keyboard.insertText("* retained manual edit\nVkeep 1 0 1\nRkeep 1 0 1k\n.end");
  await expect(page.locator(".view-lines")).toContainText("retained manual edit");

  await page.getByRole("tab", { name: "Schematic", exact: true }).click();
  await page.getByRole("tab", { name: "simulation config" }).click();
  await expect(page.locator(".view-lines")).toContainText("retained manual edit");
});

test("component ID readout sits beside coordinates without covering Simulate", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await loadReadyApp(page);
  await page.getByRole("button", { name: "New Schematic" }).click();
  await page.getByRole("button", { name: "Load Demo" }).click();
  const pointerOutput = await hoverSchematicItem(page);
  const coordinates = page.getByLabel("Schematic coordinates");
  const simulate = page.getByRole("button", { name: "Simulate Circuit" });
  const [coordinateBox, pointerBox, simulateBox] = await Promise.all([
    coordinates.boundingBox(), pointerOutput.boundingBox(), simulate.boundingBox(),
  ]);
  if (!coordinateBox || !pointerBox || !simulateBox) throw new Error("Schematic bottom bar is not measurable");

  expect(pointerBox.x).toBeGreaterThanOrEqual(coordinateBox.x + coordinateBox.width + 8);
  expect(pointerBox.x + pointerBox.width).toBeLessThanOrEqual(simulateBox.x - 8);
  await page.screenshot({ path: testInfo.outputPath("schematic-id-readout.png") });
});

test("plot zoom, cursor, snap mode, and GPU line instances survive tab changes", async ({ page }) => {
  await runTransient(page);
  const canvas = page.locator(".plot-webgl").first();
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Plot canvas is missing");

  const showCursor = page.locator(".plot-toolbar").getByRole("button", { name: "Show", exact: true });
  await showCursor.click();
  await canvas.hover({ position: { x: box.width * 0.45, y: box.height * 0.45 } });
  const cursor = page.locator(".crosshair-v").first();
  await expect(cursor).toBeVisible();

  await page.getByRole("button", { name: "Toggle cursor snapping" }).first().click();
  await expect(page.getByRole("button", { name: "Toggle cursor snapping" }).first()).toHaveAttribute("aria-pressed", "true");

  await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.65, box.y + box.height * 0.5);
  await page.mouse.up();
  await expect(page.getByRole("button", { name: "Reset zoom" }).first()).toBeVisible();

  const offsetBeforePan = Number(await canvas.getAttribute("data-offset-x"));
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
  await page.mouse.down({ button: "right" });
  await page.mouse.move(box.x + box.width * 0.62, box.y + box.height * 0.5);
  await page.mouse.up({ button: "right" });
  await expect.poll(async () => Number(await canvas.getAttribute("data-offset-x"))).not.toBe(offsetBeforePan);

  await page.mouse.move(box.x + box.width + 20, box.y + box.height + 20);
  await expect(cursor).toBeVisible();
  const rebuildsBeforeHover = await canvas.getAttribute("data-rebuild-count");
  await page.locator(".plot-sidebar label").first().hover();
  await page.waitForTimeout(100);
  await expect(canvas).toHaveAttribute("data-rebuild-count", rebuildsBeforeHover ?? "");

  await page.getByRole("tab", { name: "simulation config" }).click();
  await page.getByRole("tab", { name: "plot display" }).click();
  await expect(page.locator(".plot-toolbar").getByRole("button", { name: "Hide", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Toggle cursor snapping" }).first()).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "Reset zoom" }).first()).toBeVisible();
  await expect(canvas).toHaveAttribute("data-rebuild-count", rebuildsBeforeHover ?? "");
});

test("large bracket sweep emphasis updates line styles without rebuilding plot data", async ({ page }) => {
  await loadReadyApp(page);
  await page.evaluate(async () => {
    type TestState = {
      handleNewResults: (results: unknown[], options?: { switchToPlot?: boolean }) => void;
    };
    const loadState = new Function("return import('/src/svelte/state/appState.svelte.ts')") as () => Promise<{ appState: TestState }>;
    const { appState } = await loadState();
    const pointCount = 5_000;
    const xValues = Array.from({ length: pointCount }, (_, index) => index / 1_000);
    const sweeps = Array.from({ length: 12 }, (_, parameterIndex) => ({
      parameterValue: `${parameterIndex + 1}k`,
      parameterIndex,
      data: [
        { name: "time", values: xValues },
        {
          name: "v(out)",
          values: xValues.map((x) => Math.sin(x * 8) * (parameterIndex + 1)),
        },
      ],
    }));
    appState.handleNewResults([{
      header: "Synthetic bracket sweep",
      numVariables: 2,
      variableNames: ["time", "v(out)"],
      numPoints: pointCount,
      dataType: "real",
      data: sweeps[0]?.data ?? [],
      bracketOperation: {},
      parameterValues: sweeps.map((sweep) => sweep.parameterValue),
      parameterCount: sweeps.length,
      successfulResults: sweeps.length,
      failedResults: 0,
      bracketPlotData: sweeps,
    }]);
  });

  const canvas = page.locator(".plot-webgl").first();
  const slider = page.locator(".bracket-slider input[type=range]");
  await expect(canvas).toBeVisible({ timeout: 10_000 });
  await expect(slider).toBeVisible();
  await expect(canvas).toHaveAttribute("data-rebuild-count", /\d+/);
  await page.waitForTimeout(100);
  const rebuildsBeforeSweep = await canvas.getAttribute("data-rebuild-count");

  const samples = await slider.evaluate(async (element: HTMLInputElement) => {
    const durations: number[] = [];
    for (const value of [1, 4, 7, 10, 2, 8, 11]) {
      const start = performance.now();
      element.value = String(value);
      element.dispatchEvent(new Event("input", { bubbles: true }));
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      durations.push(performance.now() - start);
    }
    return durations;
  });

  await expect(slider).toHaveValue("11");
  await expect(canvas).toHaveAttribute("data-rebuild-count", rebuildsBeforeSweep ?? "");
  expect(samples.sort((left, right) => left - right)[Math.floor(samples.length / 2)]).toBeLessThan(50);
});

test("stale saved sources fall back to a detected source and forms retain unit guidance", async ({ page }) => {
  await openDemoSimulation(page);
  await page.evaluate(async () => {
    type Config = { type: "DC"; name: string; source: string; start: string; stop: string; step: string };
    type TestState = {
      setRawNetlist: (netlist: string) => Promise<void>;
      setAllSimulationConfigs: (configs: Config[]) => void;
      setSelectedSimType: (type: "DC") => void;
      setSimulationConfig: (config: Config) => void;
    };
    const loadState = new Function("return import('/src/svelte/state/appState.svelte.ts')") as () => Promise<{ appState: TestState }>;
    const { appState } = await loadState();
    const stale = { type: "DC" as const, name: "Stale source", source: "Vmissing", start: "0", stop: "1", step: "0.1" };
    await appState.setRawNetlist("Vavailable 1 0 1\nR1 1 0 1k\n.end");
    appState.setAllSimulationConfigs([stale]);
    appState.setSelectedSimType("DC");
    appState.setSimulationConfig(stale);
  });

  await expect(page.getByLabel("Sweep Source")).toHaveValue("Vavailable");
  await expect(page.getByLabel("Start Value")).toHaveAttribute("placeholder", "e.g., 0, 1m");
  await expect(page.getByLabel("Stop Value")).toHaveAttribute("placeholder", "e.g., 10, 1.5k");
  await page.getByText("Transient", { exact: true }).click();
  await expect(page.getByLabel("Stop Time")).toHaveAttribute("placeholder", "e.g., 10n, 1m, 1");
  await expect(page.getByLabel("Use initial conditions")).toHaveCount(0);
});

test("status badge counts follow category filters", async ({ page }) => {
  await loadReadyApp(page);
  await page.evaluate(async () => {
    type TestState = { addMessage: (message: { text: string; type: "warning"; category: "Schematic" | "Simulation"; mLevel: "user" }) => void };
    const loadState = new Function("return import('/src/svelte/state/appState.svelte.ts')") as () => Promise<{ appState: TestState }>;
    const { appState } = await loadState();
    appState.addMessage({ text: "Schematic warning", type: "warning", category: "Schematic", mLevel: "user" });
    appState.addMessage({ text: "Simulation warning", type: "warning", category: "Simulation", mLevel: "user" });
  });

  await page.getByRole("button", { name: "2 warnings" }).click();
  await page.getByRole("dialog", { name: "Application Status" }).getByLabel("Schematic").uncheck();
  // Ark correctly removes the page header from the accessibility tree while
  // the modal is open, so verify the badge's updated accessible label in DOM.
  await expect(page.locator('button[aria-label="1 warning"]')).toBeAttached();
});

test("schematic controls remain usable in short and narrow viewports", async ({ page }) => {
  await page.setViewportSize({ width: 1100, height: 600 });
  await loadReadyApp(page);
  const toolbar = page.locator(".schematic-toolbar");
  await expect.poll(() => toolbar.evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(" ").length)).toBe(2);
  await expect(toolbar.locator(".tool-divider").first()).toBeHidden();
  await toolbar.getByRole("button", { name: "Select" }).hover();
  await expect(page.getByRole("tooltip", { name: "Select" })).toBeVisible();

  await page.setViewportSize({ width: 580, height: 800 });
  await expect(page.getByLabel("Schematic coordinates")).toBeVisible();
  await expect(page.getByRole("button", { name: "Simulate Circuit" })).toBeVisible();
});
