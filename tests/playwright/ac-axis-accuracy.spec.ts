import { expect, test, type Page } from "./fixtures";
import type { Locator } from "@playwright/test";
import type { AppStore } from "../../src/store/appStoreTypes";
import type { runSingleSimulation } from "../../src/simulation/parallelSimulation";
import type { ResultType } from "eecircuit-engine";
import { gf180Opamp3p3 } from "../../src/Simulate/subcircuits/gf180Opamp3p3";
import { writeFile } from "node:fs/promises";

async function chooseMagnitudeDisplay(page: Page, display: "decade" | "dB") {
  await page.getByRole("button", { name: "Simulation Settings", exact: true }).click();
  await page.getByRole("button", { name: "Plotting Settings", exact: true }).click();
  await page.getByLabel("AC logarithmic magnitude", { exact: true }).selectOption(display);
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await settle(page);
}

async function resultSnapshot(page: Page) {
  return page.evaluate(async () => {
    const load = new Function("return import('/src/svelte/state/appState.svelte.ts')") as () => Promise<{ appState: AppStore }>;
    return JSON.stringify((await load()).appState.results);
  });
}

test("dB setting preserves the RC curve and zoom with correct ticks and cursor", async ({ page }, testInfo) => {
  await start(page);
  await runRC(page);
  const before = await resultSnapshot(page);
  const canvas = page.locator('.plot-webgl').first();
  const pixels = () => canvas.evaluate((node) => (node as HTMLCanvasElement).toDataURL());
  const originalPixels = await pixels();
  await chooseMagnitudeDisplay(page, 'dB');
  expect(await pixels()).toBe(originalPixels);
  expect(await resultSnapshot(page)).toBe(before);
  await expect(page.locator('.plot-y-axis').first()).toHaveAttribute('aria-label', 'Magnitude (dBV)');
  await expect(page.locator('.plot-y-axis').nth(1)).toHaveAttribute('aria-label', 'Phase (°)');
  const drawing = await page.locator('.plot-y-axis').first().evaluate((node) => ({ height: (node as HTMLCanvasElement).height, ticks: (node as AxisCanvas).recordedTicks ?? [] }));
  expect(drawing.ticks.length).toBeGreaterThan(2);
  const minDb = -10 * Math.log10(1 + 1000 ** 2);
  const maxDb = -10 * Math.log10(1 + .01 ** 2);
  for (const tick of drawing.ticks) {
    expect(tick.text).toMatch(/^-?\d+\.\d{2}$/);
    expect(tick.tickY! / drawing.height).toBeCloseTo(1 - (Number(tick.text) - minDb) / (maxDb - minDb), 4);
  }
  await page.getByRole('button', { name: 'Toggle cursor', exact: true }).click();
  await page.getByRole('button', { name: 'Toggle cursor snapping' }).first().click();
  const box = await canvas.boundingBox();
  if (!box) throw new Error('Missing plot');
  await page.mouse.move(box.x + box.width * .4, box.y + box.height * .1);
  await expect(page.locator('.crosshair-label').first()).toContainText(/Y: -3\.0\d+ dBV/);
  await page.screenshot({ path: testInfo.outputPath('rc-decibels.png') });
  await canvas.dispatchEvent('wheel', { deltaY: -100, ctrlKey: true });
  const zoom = await scales(page);
  await chooseMagnitudeDisplay(page, 'decade');
  expect(await scales(page)).toEqual(zoom);
  await expect(page.locator('.plot-y-axis').first()).toHaveAttribute('aria-label', 'Magnitude (V)');
  await chooseMagnitudeDisplay(page, 'dB');
  await page.getByRole('button', { name: 'Log Y1', exact: true }).click();
  await expect(page.locator('.plot-y-axis').first()).toHaveAttribute('aria-label', 'Magnitude (V)');
  await page.getByRole('button', { name: 'Log Y1', exact: true }).click();
  await expect(page.locator('.plot-y-axis').first()).toHaveAttribute('aria-label', 'Magnitude (dBV)');
  expect(await resultSnapshot(page)).toBe(before);
});

test("GF180 follower and open-loop AC decay matches raw engine samples in decade and dB", async ({ page }, testInfo) => {
  test.setTimeout(90_000);
  await start(page);
  for (const openLoop of [false, true]) {
    // Preserve DC feedback/bias while opening the AC loop in the diagnostic case.
    // This is a controlled comparison, not a reconstruction of an unknown reference testbench.
    const netlist = `GF180 ${openLoop ? 'open-loop' : 'follower'} AC diagnostic
.include modelcard.GF180.typical
${gf180Opamp3p3}
VDD vdd 0 3.3
VIN inp 0 DC 1.65 AC 1
${openLoop ? 'LFB out inv 1e12\nCFB inv bias 1e12\nVCM bias 0 1.65' : ''}
XAMP inp ${openLoop ? 'inv' : 'out'} out vdd 0 gf180_opamp_3p3
RLOAD out 0 1k
CLOAD out 0 10p
.save v(inp) v(out)
.ac dec 40 1 10G
.end`;
    const data = await page.evaluate(async (netlist) => {
      const loadState = new Function("return import('/src/svelte/state/appState.svelte.ts')") as () => Promise<{ appState: AppStore }>;
      const loadRunner = new Function("return import('/src/simulation/parallelSimulation.ts')") as () => Promise<{ runSingleSimulation: typeof runSingleSimulation }>;
      const { appState } = await loadState();
      appState.selectSimulationType('None');
      appState.setNetList(netlist);
      appState.clearResults();
      const response = await (await loadRunner()).runSingleSimulation(netlist);
      if (!response.success || !response.result || response.result.dataType !== 'complex') throw new Error(JSON.stringify(response));
      const frequency = response.result.data[0]!.values.map((v) => v.real);
      const output = response.result.data.find((s) => s.name === 'v(out)')!.values;
      const raw = output.map((v) => ({ magnitude: Math.hypot(v.real, v.img), phase: Math.atan2(v.img, v.real) * 180 / Math.PI }));
      appState.handleNewResults([response.result]);
      appState.setCanvas1SelectedVariables(['v(out)[mag]']);
      appState.setCanvas2SelectedVariables(['v(out)[phase]']);
      return { frequency, raw, plotted: appState.results[0] };
    }, netlist);
    const magnitudes = data.raw.map((p) => p.magnitude);
    expect(magnitudes.every((m) => Number.isFinite(m) && m > 0)).toBe(true);
    const plottedMagnitudes = data.plotted!.data.find((s) => s.name === 'v(out)[mag]')!.values as number[];
    magnitudes.forEach((m, i) => expect(plottedMagnitudes[i]! / m).toBeCloseTo(1, 12));
    if (!openLoop) expect(magnitudes[0]).toBeCloseTo(1, 2);
    else expect(magnitudes[0]).toBeGreaterThan(1000);
    const snapshot = await resultSnapshot(page);
    const min = Math.min(...magnitudes.map(Math.log10));
    const max = Math.max(...magnitudes.map(Math.log10));
    const summaries = [1, 10, 100, 1e3, 1e4, 1e5, 1e6, 1e7, 1e8, 1e9, 1e10].map((f) => {
      const i = data.frequency.findIndex((value) => Math.abs(value / f - 1) < 1e-6);
      expect(i).toBeGreaterThanOrEqual(0);
      return { frequency: data.frequency[i], magnitude: magnitudes[i], dB: 20 * Math.log10(magnitudes[i]!), phase: data.raw[i]!.phase };
    });
    for (const display of ['decade', 'dB'] as const) {
      await chooseMagnitudeDisplay(page, display);
      const canvas = page.locator('.plot-webgl').first();
      // Check actual GPU pixels against independently calculated raw-complex magnitudes.
      for (let i = 8; i < data.frequency.length - 8; i += 8) {
        const x = Math.log10(data.frequency[i]!) / 10;
        const y = 1 - (Math.log10(magnitudes[i]!) - min) / (max - min);
        if (y < .02 || y > .98) continue;
        expect(await inkAt(canvas, x, y), `${openLoop ? 'open' : 'follower'} ${display} at ${data.frequency[i]} Hz`).toBe(true);
      }
      await expect(page.locator('.plot-y-axis').first()).toHaveAttribute('aria-label', display === 'dB' ? 'Magnitude (dBV)' : 'Magnitude (V)');
      await expect(page.locator('.plot-y-axis').nth(1)).toHaveAttribute('aria-label', 'Phase (°)');
      await page.screenshot({ path: testInfo.outputPath(`gf180-${openLoop ? 'open-loop' : 'follower'}-${display}.png`) });
      expect(await resultSnapshot(page)).toBe(snapshot);
    }
    const numericalPath = testInfo.outputPath(`gf180-${openLoop ? 'open-loop' : 'follower'}-numerical.json`);
    await writeFile(numericalPath, JSON.stringify({ netlist, summaries, ...data }, null, 2));
    await testInfo.attach('GF180 numerical response', { path: numericalPath, contentType: 'application/json' });
  }
});

type Tick = { text: string; x: number; y: number; tickX?: number; tickY?: number };
type AxisCanvas = HTMLCanvasElement & { recordedTicks?: Tick[] };

async function start(page: Page) {
  // Record the labels and tick positions actually sent to the 2D canvas.
  await page.addInitScript(() => {
    const proto = CanvasRenderingContext2D.prototype;
    const originalText = proto.fillText;
    const originalClear = proto.clearRect;
    const originalMove = proto.moveTo;
    proto.clearRect = function (...args) {
      (this.canvas as AxisCanvas).recordedTicks = [];
      originalClear.apply(this, args);
    };
    proto.fillText = function (text, x, y, maxWidth) {
      const canvas = this.canvas as AxisCanvas;
      (canvas.recordedTicks ??= []).push({ text, x, y });
      if (maxWidth === undefined) originalText.call(this, text, x, y);
      else originalText.call(this, text, x, y, maxWidth);
    };
    proto.moveTo = function (x, y) {
      const tick = (this.canvas as AxisCanvas).recordedTicks?.at(-1);
      if (tick) { tick.tickX = x; tick.tickY = y; }
      originalMove.call(this, x, y);
    };
  });
  await page.goto("/");
  await expect(page.locator('[data-canvas-ready="true"]')).toBeVisible({ timeout: 15_000 });
}

async function runRC(page: Page, start = 10, stop = 1e6) {
  const result = await page.evaluate(async ({ start, stop }) => {
    const loadState = new Function("return import('/src/svelte/state/appState.svelte.ts')") as () => Promise<{ appState: AppStore }>;
    const loadRunner = new Function("return import('/src/simulation/parallelSimulation.ts')") as () => Promise<{ runSingleSimulation: typeof runSingleSimulation }>;
    const { appState } = await loadState();
    const netlist = `RC low pass\nV1 in 0 DC 0 AC 1\nR1 in out 1k\nC1 out 0 159.154943091895n\n.ac dec 40 ${start} ${stop}\n.end`;
    appState.selectSimulationType("None");
    appState.setNetList(netlist);
    appState.clearResults();
    const response = await (await loadRunner()).runSingleSimulation(netlist);
    if (!response.success || !response.result) throw new Error(response.errorMessage ?? "RC simulation failed");
    appState.handleNewResults([response.result]);
    appState.setCanvas1SelectedVariables(["v(out)[mag]"]);
    appState.setCanvas2SelectedVariables(["v(out)[phase]"]);
    return appState.results[0];
  }, { start, stop });
  await expect(page.locator('.plot-webgl')).toHaveCount(2);
  await expect(page.locator('.plot-webgl').first()).toHaveAttribute('data-scale-x', /.+/);
  await settle(page);
  return result;
}

async function settle(page: Page) {
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
}

async function scales(page: Page) {
  await settle(page);
  return page.locator(".plot-webgl").evaluateAll((canvases) => canvases.map((node) => {
    const canvas = node as HTMLCanvasElement;
    return { x: Number(canvas.dataset.scaleX), offset: Number(canvas.dataset.offsetX) };
  }));
}

async function inkAt(canvas: Locator, x: number, y: number) {
  return canvas.evaluate((node, point) => {
    const canvas = node as HTMLCanvasElement;
    const gl = canvas.getContext("webgl2");
    if (!gl) throw new Error("WebGL2 context unavailable");
    const pixels = new Uint8Array(9 * 9 * 4);
    gl.readPixels(Math.round(point.x * (canvas.width - 1)) - 4, Math.round((1 - point.y) * (canvas.height - 1)) - 4, 9, 9, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    return pixels.some((value, index) => index % 4 === 3 && value > 30);
  }, { x, y });
}

function tickNumber(text: string) {
  const match = text.trim().match(/^([-+\d.e]+)\s*([GMkmunpf]?)$/i);
  if (!match) throw new Error(`Unexpected tick ${text}`);
  const multipliers: Record<string, number> = { G: 1e9, M: 1e6, k: 1e3, m: 1e-3, u: 1e-6, n: 1e-9, p: 1e-12, f: 1e-15 };
  return Number(match[1]) * (multipliers[match[2] ?? ""] ?? 1);
}

test("AC RC curves, ticks and cursors agree in physical units", async ({ page }, testInfo) => {
  await start(page);
  const result = await runRC(page);
  if (!result) throw new Error("Missing RC results");
  const frequencies = result.data[0]!.values as number[];
  const index = frequencies.findIndex((f) => Math.abs(f - 1000) < .01);
  expect(index).toBeGreaterThan(0);
  const magnitude = result.data.find((series) => series.name === "v(out)[mag]")!.values[index];
  const phase = result.data.find((series) => series.name === "v(out)[phase]")!.values[index];
  expect(magnitude).toBeCloseTo(Math.SQRT1_2, 5);
  expect(phase).toBeCloseTo(-45, 4);
  await expect(page.getByRole("button", { name: "Log X", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator('.plot-y-axis').first()).toHaveAttribute("aria-label", "Magnitude (V)");
  await expect(page.locator('.plot-y-axis').nth(1)).toHaveAttribute("aria-label", "Phase (°)");
  await expect(page.locator('.plot-x-axis').first()).toHaveAttribute("aria-label", "Frequency (Hz)");
  await settle(page);

  const magCoordinate = (f: number) => Math.log10(1 / Math.sqrt(1 + (f / 1000) ** 2));
  const phaseCoordinate = (f: number) => -Math.atan(f / 1000) * 180 / Math.PI;
  const yFraction = (value: number, min: number, max: number) => 1 - (value - min) / (max - min);
  const magY = yFraction(Math.log10(Math.SQRT1_2), magCoordinate(1e6), magCoordinate(10));
  const phaseY = yFraction(-45, phaseCoordinate(1e6), phaseCoordinate(10));
  // Read actual WebGL pixels at analytically predicted coordinates.
  expect(await inkAt(page.locator(".plot-webgl").first(), .4, magY)).toBe(true);
  expect(await inkAt(page.locator(".plot-webgl").nth(1), .4, phaseY)).toBe(true);
  expect(await inkAt(page.locator(".plot-webgl").first(), .4, .7)).toBe(false);

  for (const axis of await page.locator('.plot-x-axis').all()) {
    const drawing = await axis.evaluate((node) => ({ width: (node as HTMLCanvasElement).width, ticks: (node as AxisCanvas).recordedTicks ?? [] }));
    expect(drawing.ticks.length).toBeGreaterThan(3);
    for (const tick of drawing.ticks) {
      const expectedFraction = (Math.log10(tickNumber(tick.text)) - 1) / 5;
      expect(tick.tickX! / drawing.width).toBeCloseTo(expectedFraction, 4);
    }
  }
  const magnitudeTicks = await page.locator('.plot-y-axis').first().evaluate((node) => ({ height: (node as HTMLCanvasElement).height, ticks: (node as AxisCanvas).recordedTicks ?? [] }));
  expect(magnitudeTicks.ticks.length).toBeGreaterThan(2);
  for (const tick of magnitudeTicks.ticks) {
    expect(tick.tickY! / magnitudeTicks.height).toBeCloseTo(yFraction(Math.log10(tickNumber(tick.text)), magCoordinate(1e6), magCoordinate(10)), 3);
    expect(tick.y).toBeLessThan(magnitudeTicks.height - 2);
    expect(tick.y).toBeGreaterThan(10);
  }
  const phaseTicks = await page.locator('.plot-y-axis').nth(1).evaluate((node) => ({ height: (node as HTMLCanvasElement).height, ticks: (node as AxisCanvas).recordedTicks ?? [] }));
  expect(phaseTicks.ticks.length).toBeGreaterThan(1);
  for (const tick of phaseTicks.ticks) {
    expect(tick.text).toMatch(/^-?\d+\.\d{2}$/);
    expect(tick.tickY! / phaseTicks.height).toBeCloseTo(yFraction(Number(tick.text), phaseCoordinate(1e6), phaseCoordinate(10)), 3);
    expect(tick.y).toBeLessThan(phaseTicks.height - 2);
    expect(tick.y).toBeGreaterThan(10);
  }

  await page.getByRole("button", { name: "Toggle cursor", exact: true }).click();
  await page.getByRole("button", { name: "Toggle cursor snapping" }).first().click();
  const box = await page.locator('.plot-webgl').first().boundingBox();
  if (!box) throw new Error("Missing plot bounds");
  await page.mouse.move(box.x + box.width * .4, box.y + box.height * magY);
  await expect(page.locator('.crosshair-label').first()).toContainText(/X: .* (Hz|kHz), Y: .* (mV|V)/);
  const readout = await page.locator('.crosshair-label').first().innerText();
  const values = readout.match(/^X: ([\d.e+-]+) ([kM]?Hz), Y: ([\d.e+-]+) ([m]?V)$/);
  expect(values).not.toBeNull();
  expect(Number(values![1]) * (values![2] === 'kHz' ? 1000 : 1)).toBeCloseTo(1000, -1);
  expect(Number(values![3]) * (values![4] === 'mV' ? .001 : 1)).toBeCloseTo(Math.SQRT1_2, 2);
  await page.screenshot({ path: testInfo.outputPath("rc-ac-physical-units.png") });
});

test("zoom cannot leak through log toggles, reruns, selection or edited analysis", async ({ page }) => {
  await start(page);
  await runRC(page);
  expect(await scales(page)).toEqual([{ x: expect.closeTo(.4, 5), offset: expect.closeTo(-1.4, 5) }, { x: expect.closeTo(.4, 5), offset: expect.closeTo(-1.4, 5) }]);
  const canvas = page.locator('.plot-webgl').first();
  await canvas.dispatchEvent('wheel', { deltaY: -100, ctrlKey: true });
  const zoomed = await scales(page);
  expect(zoomed[0]!.x).toBeGreaterThan(.4);
  expect(zoomed[1]).toEqual(zoomed[0]);
  await page.evaluate(async () => {
    const load = new Function("return import('/src/svelte/state/appState.svelte.ts')") as () => Promise<{ appState: AppStore }>;
    const { appState } = await load();
    appState.setCanvas1SelectedVariables([]);
    appState.selectSimulationType("Transient");
  });
  expect(await scales(page)).toEqual(zoomed);
  await expect(page.getByText("Phase", { exact: true }).first()).toBeVisible();
  await page.setViewportSize({ width: 1100, height: 760 });
  expect(await scales(page)).toEqual(zoomed);
  const logX = page.getByRole('button', { name: 'Log X', exact: true });
  await logX.click();
  const linear = await scales(page);
  expect(linear[0]!.x).toBeCloseTo(2 / (1e6 - 10), 10);
  expect(linear[1]).toEqual(linear[0]);
  await logX.click();
  expect((await scales(page))[0]!.x).toBeCloseTo(.4, 6);
  await canvas.dispatchEvent('wheel', { deltaY: -100, ctrlKey: true });
  await runRC(page, 100, 10000);
  const rerun = await scales(page);
  expect(rerun[0]!.x).toBeCloseTo(1, 5);
  expect(rerun[0]!.offset).toBeCloseTo(-3, 5);
  expect(rerun[1]).toEqual(rerun[0]);
});

async function publishFixture(page: Page, values: number[], name: string, logY: boolean) {
  await page.evaluate(async ({ values, name, logY }) => {
    const load = new Function("return import('/src/svelte/state/appState.svelte.ts')") as () => Promise<{ appState: AppStore }>;
    const { appState } = await load();
    const axis = name.endsWith('[phase]') ? 'frequency' : 'time';
    const result: ResultType = {
      header: "Fixture", dataType: "real", numPoints: values.length, numVariables: 2, variableNames: [axis, name],
      data: [{ name: axis, type: axis, values: values.map((_, i) => i + 1) }, { name, type: name.startsWith('i(') ? 'current' : 'voltage', values }],
    };
    appState.selectSimulationType('Transient');
    appState.clearResults();
    appState.handleNewResults([result]);
    appState.setSelectedVariables([name]);
    appState.setIsLogY(logY);
  }, { values, name, logY });
  await expect(page.locator(".plot-webgl")).toHaveCount(name.endsWith("[phase]") ? 2 : 1);
  await expect(page.locator(".plot-webgl").last()).toHaveAttribute("data-scale-x", /.+/);
  await settle(page);
}

test("constant traces stay visible and log-domain gaps have no fabricated curves", async ({ page }, testInfo) => {
  await start(page);
  for (const [name, value, logarithmic] of [['v(out)', 100, true], ['i(v1)', .001, true], ['v(out)[phase]', -90, false]] as const) {
    await publishFixture(page, [value, value, value, value], name, logarithmic);
    const activeCanvas = page.locator('.plot-webgl').last();
    expect(await inkAt(activeCanvas, .5, .5), name).toBe(true);
    await page.getByRole('button', { name: 'Toggle cursor', exact: true }).click();
    const box = await activeCanvas.boundingBox();
    if (!box) throw new Error('Missing canvas');
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await expect(page.locator('.crosshair-label').last()).toContainText(name.includes('phase') ? '°' : name.startsWith('i') ? 'mA' : 'V');
    await page.getByRole('button', { name: 'Toggle cursor', exact: true }).click();
  }
  await publishFixture(page, [1, 1, 0, -1, 1, 1], 'v(out)', true);
  expect(await inkAt(page.locator('.plot-webgl').first(), .1, .5)).toBe(true);
  expect(await inkAt(page.locator('.plot-webgl').first(), .5, .5)).toBe(false);
  expect(await inkAt(page.locator('.plot-webgl').first(), .9, .5)).toBe(true);
  await page.getByRole('button', { name: 'Toggle cursor', exact: true }).click();
  await page.getByRole('button', { name: 'Toggle cursor snapping' }).click();
  const box = await page.locator('.plot-webgl').first().boundingBox();
  if (!box) throw new Error('Missing canvas');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await expect(page.locator('[data-snap-marker]')).toBeHidden();
  await publishFixture(page, [0, 0, 0, 0], 'v(out)', true);
  await expect(page.getByText('No plottable samples')).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('zero-log-magnitude.png') });
});

test("AC bracket curves retain units and manual scales during progressive updates", async ({ page }, testInfo) => {
  await start(page);
  await page.evaluate(async () => {
    const load = new Function("return import('/src/svelte/state/appState.svelte.ts')") as () => Promise<{ appState: AppStore }>;
    const { appState } = await load();
    const netlist = 'RC sweep\nV1 in 0 AC 1\nR1 in out [1:1:2]k\nC1 out 0 159.154943091895n\n.ac dec 40 10 1Meg\n.end';
    appState.selectSimulationType('None');
    appState.setNetList(netlist);
    await appState.runParallelSimulation(netlist);
    appState.setCanvas1SelectedVariables(['v(out)[mag]']);
    appState.setCanvas2SelectedVariables(['v(out)[phase]']);
  });
  await expect(page.locator('.bracket-slider input')).toHaveAttribute('max', '1');
  await expect(page.locator('.plot-y-axis').nth(1)).toHaveAttribute('aria-label', 'Phase (°)');
  await settle(page);
  const min = Math.log10(1 / Math.sqrt(1 + 2000 ** 2));
  const max = Math.log10(1 / Math.sqrt(1 + .01 ** 2));
  for (const gain of [Math.SQRT1_2, 1 / Math.sqrt(5)]) {
    expect(await inkAt(page.locator('.plot-webgl').first(), .4, 1 - (Math.log10(gain) - min) / (max - min))).toBe(true);
  }
  await expect(page.getByRole('button', { name: 'Log X', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Log Y1', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Log Y2', exact: true })).toHaveAttribute('aria-pressed', 'false');
  await page.screenshot({ path: testInfo.outputPath('ac-bracket-log-axes.png') });
  const bracketSnapshot = await resultSnapshot(page);
  await chooseMagnitudeDisplay(page, 'dB');
  for (const gain of [Math.SQRT1_2, 1 / Math.sqrt(5)]) {
    expect(await inkAt(page.locator('.plot-webgl').first(), .4, 1 - (Math.log10(gain) - min) / (max - min))).toBe(true);
  }
  await expect(page.locator('.plot-y-axis').first()).toHaveAttribute('aria-label', 'Magnitude (dBV)');
  expect(await resultSnapshot(page)).toBe(bracketSnapshot);
  await page.screenshot({ path: testInfo.outputPath('ac-bracket-decibels.png') });
  await page.getByRole('button', { name: 'Log X', exact: true }).click();
  await page.getByRole('button', { name: 'Log Y1', exact: true }).click();
  // Replay a progressive publication deterministically after manual interaction.
  await page.evaluate(async () => {
    const load = new Function("return import('/src/svelte/state/appState.svelte.ts')") as () => Promise<{ appState: AppStore }>;
    const { appState } = await load();
    appState.handleNewResults([{ ...appState.results[0]! }], { switchToPlot: false });
  });
  await expect(page.getByRole('button', { name: 'Log X', exact: true })).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByRole('button', { name: 'Log Y1', exact: true })).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('.plot-y-axis').first()).toHaveAttribute('aria-label', 'Magnitude (V)');
  await page.evaluate(async () => {
    const load = new Function("return import('/src/svelte/state/appState.svelte.ts')") as () => Promise<{ appState: AppStore }>;
    const { appState } = await load();
    const current = appState.results[0]!.variableNames.find((name) => name.startsWith('i(') && name.endsWith('[mag]'));
    if (!current) throw new Error('Missing current magnitude');
    appState.setCanvas1SelectedVariables([current]);
  });
  await expect(page.locator('.plot-y-axis').first()).toHaveAttribute('aria-label', 'Magnitude (A)');
  await page.screenshot({ path: testInfo.outputPath('ac-bracket-current-units.png') });
});

test("dB constant current, zero magnitude and invalid gaps keep physical rendering", async ({ page }) => {
  await start(page);
  await runRC(page);
  await chooseMagnitudeDisplay(page, 'dB');
  const publish = async (values: number[]) => {
    await page.evaluate(async (values) => {
      const load = new Function("return import('/src/svelte/state/appState.svelte.ts')") as () => Promise<{ appState: AppStore }>;
      const { appState } = await load();
      appState.clearResults();
      appState.selectSimulationType('AC');
      appState.handleNewResults([{
        header: 'AC current fixture', dataType: 'real', numPoints: values.length, numVariables: 3,
        variableNames: ['frequency', 'i(v1)[mag]', 'i(v1)[phase]'],
        data: [
          { name: 'frequency', type: 'frequency', values: values.map((_, i) => 10 ** i) },
          { name: 'i(v1)[mag]', type: 'current', values },
          { name: 'i(v1)[phase]', type: 'current', values: values.map(() => -90) },
        ],
      }]);
    }, values);
    await settle(page);
  };
  await publish([.001, .001, .001, .001, .001, .001]);
  const canvas = page.locator('.plot-webgl').first();
  await expect(page.locator('.plot-y-axis').first()).toHaveAttribute('aria-label', 'Magnitude (dBA)');
  expect(await inkAt(canvas, .5, .5)).toBe(true);
  expect(await inkAt(page.locator('.plot-webgl').nth(1), .5, .5)).toBe(true);
  await page.getByRole('button', { name: 'Toggle cursor', exact: true }).click();
  await page.getByRole('button', { name: 'Toggle cursor snapping' }).first().click();
  const box = await canvas.boundingBox();
  if (!box) throw new Error('Missing plot');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await expect(page.locator('.crosshair-label').first()).toContainText('Y: -60.000 dBA');
  await publish([.001, .001, 0, -1, .001, .001]);
  expect(await inkAt(canvas, .1, .5)).toBe(true);
  expect(await inkAt(canvas, .5, .5)).toBe(false);
  expect(await inkAt(canvas, .9, .5)).toBe(true);
  await page.mouse.move(box.x + box.width * .51, box.y + box.height / 2);
  await expect(page.locator('[data-snap-marker]').first()).toBeHidden();
  await publish([0, 0, 0, 0]);
  await expect(page.getByText('No plottable samples')).toBeVisible();
});
