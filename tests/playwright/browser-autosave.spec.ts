import { expect, test, type Page } from "./fixtures";
import type { AppStore } from "../../src/store/appStoreTypes";
import { demoSchematic } from "../../src/schematic/demoSchematic";
import { readFile } from "node:fs/promises";

async function ready(page: Page) {
  await expect(page.locator("#schematic-canvas")).toHaveAttribute("data-canvas-ready", "true", { timeout: 15_000 });
}

async function drawing(page: Page) {
  return page.evaluate(async () => {
    const load = new Function("return import('/src/svelte/state/appState.svelte.ts')") as () => Promise<{ appState: AppStore }>;
    return JSON.parse(JSON.stringify((await load()).appState.currentSchematic));
  });
}

test("browser autosave restores UI component placement and property edits after refresh and reopening", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/");
  await ready(page);
  await page.getByRole("button", { name: "New Schematic" }).click();
  await page.getByRole("button", { name: "New Empty Schematic" }).click();
  await expect.poll(() => drawing(page)).toMatchObject({ componentInstances: [], wires: [] });
  await page.getByRole("button", { name: "Open add component popover" }).click();
  await page.getByPlaceholder("Search components...").fill("resistor");
  await page.getByRole("button", { name: "Add resistor", exact: true }).click();
  const canvas = page.locator("#schematic-canvas");
  await expect(page.getByRole("button", { name: "Rotate selection" })).toBeVisible();
  await canvas.click({ position: { x: 300, y: 220 } });
  await page.getByRole("button", { name: "Cancel move" }).click();
  await expect.poll(async () => (await drawing(page)).componentInstances.length).toBe(1);
  await page.getByRole("button", { name: "Select", exact: true }).click();
  await canvas.click({ position: { x: 300, y: 220 } });
  await page.getByLabel("Component name").fill("R_AUTOSAVED");
  await page.getByRole("textbox", { name: "Resistance", exact: true }).fill("4.7k");
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  await expect.poll(() => drawing(page)).toMatchObject({ componentInstances: [{ name: "R_AUTOSAVED", value: "4.7k" }] });
  const expected = await drawing(page);
  expect(JSON.parse((await saved(page))!).project.schematic).toEqual(expected);
  expect(await exportedDrawing(page)).toEqual(expected);
  await page.reload();
  await ready(page);
  expect(await drawing(page)).toEqual(expected);
  await expect(page.getByRole("application", { name: "Schematic editor" })).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Save EEcircuit file", exact: true }).click();
  const path = await (await download).path();
  if (!path) throw new Error("No exported project");
  expect(JSON.parse(await readFile(path, "utf8")).schematic).toEqual(expected);
  const reopened = await page.context().newPage();
  await reopened.goto(page.url());
  await ready(reopened);
  expect(await drawing(reopened)).toEqual(expected);
  expect(await exportedDrawing(reopened)).toEqual(expected);
  await reopened.close();
});

const storageKey = "eecircuit-browser-project";
const upload = (value: unknown) => ({ name: "autosave-project.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(value)) });
async function saved(page: Page) {
  return page.evaluate((key) => localStorage.getItem(key), storageKey);
}
async function exportedDrawing(page: Page) {
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Save EEcircuit file", exact: true }).click();
  const path = await (await download).path();
  if (!path) throw new Error("No exported project");
  return JSON.parse(await readFile(path, "utf8")).schematic;
}
async function emptyProject(page: Page) {
  await page.getByRole("button", { name: "New Schematic" }).click();
  await page.getByRole("button", { name: "New Empty Schematic" }).click();
  await expect.poll(() => drawing(page)).toMatchObject({ componentInstances: [], wires: [] });
}
async function readProject(page: Page) {
  return page.evaluate(async () => {
    const loadApp = new Function("return import('/src/svelte/state/appState.svelte.ts')") as () => Promise<{ appState: AppStore }>;
    const s = (await loadApp()).appState;
    return JSON.parse(JSON.stringify({ schematic: s.currentSchematic, present: s.hasSchematicDocument,
      metadata: s.projectMetadata,
      profiles: s.allSimulationConfigs, active: s.simulationConfig, selected: s.selectedSimType,
      index: s.selectedSimulationConfigIndex, drafts: s.simulationConfigDrafts, lastNames: s.lastSelectedSimulationConfigNames,
      manualDeck: s.selectedSimType === "None" ? s.netList : undefined, dirty: s.manualNetlistDirty,
      canvases: s.numCanvases, logX: s.isLogX, secondPlotVariables: s.canvas2SelectedVariables,
      plots: s.toBePlotted, plotVariables: s.canvas1SelectedVariables, lineThickness: s.lineThickness }));
  });
}

test("movement, rotation, deletion and undo/redo save the displayed history state", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/"); await ready(page); await emptyProject(page);
  await page.getByRole("button", { name: "Open add component popover" }).click();
  await page.getByPlaceholder("Search components...").fill("resistor");
  await page.getByRole("button", { name: "Add resistor", exact: true }).click();
  await page.getByRole("button", { name: "Rotate selection" }).click();
  const canvas = page.locator("#schematic-canvas");
  await canvas.click({ position: { x: 300, y: 220 } });
  await page.getByRole("button", { name: "Cancel move" }).click();
  await expect.poll(async () => (await drawing(page)).componentInstances[0]?.rotation).toBe("90");
  const placed = await drawing(page);
  await page.getByRole("button", { name: "Move (M)", exact: true }).click();
  const box = await canvas.boundingBox(); if (!box) throw new Error("No schematic canvas");
  await page.mouse.move(box.x + 300, box.y + 220); await page.mouse.down();
  await page.mouse.move(box.x + 370, box.y + 220, { steps: 5 }); await page.mouse.up();
  if (await page.getByRole("button", { name: "Cancel move" }).isVisible()) await page.getByRole("button", { name: "Cancel move" }).click();
  await expect.poll(async () => (await drawing(page)).componentInstances[0]?.origin).not.toEqual(placed.componentInstances[0].origin);
  const moved = await drawing(page);
  await page.getByRole("button", { name: "Remove (Shift+D)", exact: true }).click();
  await canvas.click({ position: { x: 370, y: 220 } });
  await expect.poll(async () => (await drawing(page)).componentInstances.length).toBe(0);
  await page.locator("#canvas-container").focus(); await page.keyboard.press("Shift+z");
  await expect.poll(() => drawing(page)).toEqual(moved);
  await page.keyboard.press("Shift+r");
  await expect.poll(async () => (await drawing(page)).componentInstances.length).toBe(0);
  await page.keyboard.press("Shift+z");
  await expect.poll(() => drawing(page)).toEqual(moved);
  await page.reload(); await ready(page);
  expect(await drawing(page)).toEqual(moved);
  // Undo history starts fresh; the document retains the displayed undo state.
  await page.locator("#canvas-container").focus(); await page.keyboard.press("Shift+z");
  expect(await drawing(page)).toEqual(moved);
});

test("redo is saved before an immediate refresh", async ({ page }) => {
  await page.goto("/"); await ready(page); await emptyProject(page);
  await page.getByRole("button", { name: "Open add component popover" }).click();
  await page.getByPlaceholder("Search components...").fill("resistor");
  await page.getByRole("button", { name: "Add resistor", exact: true }).click();
  await page.locator("#schematic-canvas").click({ position: { x: 300, y: 220 } });
  await page.getByRole("button", { name: "Cancel move" }).click();
  await expect.poll(async () => (await drawing(page)).componentInstances.length).toBe(1);
  const placed = await drawing(page);
  await page.locator("#canvas-container").focus(); await page.keyboard.press("Shift+z");
  await expect.poll(async () => (await drawing(page)).componentInstances.length).toBe(0);
  await page.keyboard.press("Shift+r");
  await expect.poll(() => drawing(page)).toEqual(placed);
  await page.reload(); await ready(page);
  expect(await drawing(page)).toEqual(placed);
});

test("a previously active Plot workspace restores Simulation without saved results", async ({ page }) => {
  await page.goto("/"); await ready(page);
  await page.getByRole("button", { name: "Simulate Circuit", exact: true }).click();
  await expect(page.getByRole("group", { name: "Simulation Configuration" })).toBeVisible();
  await page.evaluate(async () => {
    const load = new Function("return import('/src/svelte/state/appState.svelte.ts')") as () => Promise<{ appState: AppStore }>;
    (await load()).appState.setMainTabValue("plot");
  });
  await expect(page.getByRole("tab", { name: "plot display", exact: true })).toHaveAttribute("aria-selected", "true");
  await page.reload(); await ready(page);
  await expect(page.getByRole("tab", { name: "simulation config", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tab", { name: "plot display", exact: true })).toHaveAttribute("aria-disabled", "true");
});

test("empty projects remain empty and explicit Load Demo becomes the saved project", async ({ page }) => {
  await page.goto("/"); await ready(page); await emptyProject(page);
  await page.reload(); await ready(page);
  expect(await drawing(page)).toMatchObject({ componentInstances: [], wires: [] });
  expect((await readProject(page)).present).toBe(false);
  await page.getByRole("button", { name: "New Schematic" }).click();
  await page.getByRole("button", { name: "Load Demo" }).click();
  await expect.poll(async () => (await drawing(page)).componentInstances.length).toBe(9);
  const demo = await drawing(page);
  await page.reload(); await ready(page);
  expect(await drawing(page)).toEqual(demo);
});

test("V2 imports retain wires, text, metadata, profiles, drafts and plot setup", async ({ page }) => {
  await page.goto("/"); await ready(page);
  const source = structuredClone(demoSchematic);
  source.text = [{ text: "Saved amplifier", origin: { x: -40, y: 35 }, rotation: "0", fontSize: 2 }];
  await page.locator('input[type="file"]').first().setInputFiles(upload({
    schema: "EEcircuitV2", title: "Autosaved board", description: "Full project", date: "2026-10-06",
    schematic: source, simulations: [{ type: "Transient", name: "Fast", stopTime: "1m", timeStep: "1u" }],
  }));
  await expect(page.locator(".loading-overlay")).toHaveCount(0);
  await expect.poll(async () => (await readProject(page)).metadata.title).toBe("Autosaved board");
  await page.evaluate(async () => {
    const load = new Function("return import('/src/svelte/state/appState.svelte.ts')") as () => Promise<{ appState: AppStore }>;
    const s = (await load()).appState;
    s.selectSimulationType("AC");
    s.updateActiveSimulationConfig({ type: "AC", name: "Draft AC", source: "vin", frequencyStart: "1", frequencyStop: "", stepNumber: "10", sweepType: "dec" });
    s.selectSimulationType("None");
    s.setNetList("* my unfinished manual deck\nR1 out 0 3.3k\n.end");
    s.setToBePlotted([{ type: "voltage", netName: "output" }]);
    s.setCanvas1SelectedVariables(["v(output)"]);
    s.setCanvas2SelectedVariables(["i(vin)"]);
    s.setNumCanvases(2);
    s.setIsLogX(true);
    s.setLineThickness(4);
  });
  const expected = await readProject(page);
  expect(JSON.parse((await saved(page))!).project.schematic).toEqual(expected.schematic);
  await page.reload(); await ready(page);
  expect(await readProject(page)).toEqual(expected);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Save EEcircuit file", exact: true }).click();
  const path = await (await download).path();
  if (!path) throw new Error("No exported project");
  expect(JSON.parse(await readFile(path, "utf8")).schematic).toEqual(expected.schematic);
});

test("active simulation drafts restore in the Simulation UI and manual decks stay editable", async ({ page }) => {
  await page.goto("/"); await ready(page);
  await page.getByRole("button", { name: "Simulate Circuit", exact: true }).click();
  await page.getByLabel("Stop Value", { exact: true }).fill("1.25");
  await expect(page.getByRole("status")).toContainText("Modified");
  await page.reload(); await ready(page);
  await expect(page.getByRole("tab", { name: "simulation config", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByLabel("Stop Value", { exact: true })).toHaveValue("1.25");
  await page.getByText("None", { exact: true }).click();
  await expect(page.getByRole("radio", { name: "None", exact: true })).toBeChecked();
  await page.locator(".monaco-editor").click();
  await page.keyboard.press("Meta+A");
  await page.keyboard.insertText("* manually edited\nV1 n 0 1\nR1 n 0 1k\n.tran 1u 1m\n.end");
  await expect.poll(async () => (await readProject(page)).manualDeck).toContain("* manually edited");
  const expected = await readProject(page);
  await page.reload(); await ready(page);
  await expect(page.getByRole("tab", { name: "simulation config", exact: true })).toHaveAttribute("aria-selected", "true");
  expect(await readProject(page)).toEqual(expected);
  await expect(page.locator(".view-lines")).toContainText("manually edited");
});

test("failed imports retain the complete saved project", async ({ page }) => {
  await page.goto("/"); await ready(page);
  const previous = await saved(page);
  await page.locator('input[type="file"]').first().setInputFiles(upload({ schema: "EEcircuitV2",
    schematic: { componentInstances: [{ typeName: "resistor", name: "R_BROKEN", value: "1k", origin: { x: 0, y: 0 }, rotation: "0", flip: "none" }],
      wires: [{ absolutePath: [{ x: -5, y: 0 }, { x: -10, y: 0 }], startLocation: { type: "terminal", prop: { instanceName: "R_BROKEN", terminalName: "2" } } }] } }));
  await expect(page.getByText(/saved wire endpoint reference is invalid/i).first()).toBeVisible();
  expect(await saved(page)).toBe(previous);
  await page.reload(); await ready(page);
  expect((await drawing(page)).componentInstances).toHaveLength(9);
});

test("corrupt and unsupported snapshots remain untouched until explicit replacement", async ({ page }) => {
  for (const raw of ["broken json", JSON.stringify({ version: 99 })]) {
    await page.goto("/"); await ready(page);
    await page.evaluate(({ key, value }) => localStorage.setItem(key, value), { key: storageKey, value: raw });
    await page.reload(); await ready(page);
    expect(await drawing(page)).toMatchObject({ componentInstances: [], wires: [] });
    expect(await saved(page)).toBe(raw);
    await expect(page.getByText(/browser project could not be restored/i)).toBeVisible();
    await emptyProject(page);
    expect(JSON.parse((await saved(page))!).version).toBe(1);
  }
});

test("semantically invalid saved schematics recover to a ready blank editor without overwriting data", async ({ page }) => {
  await page.goto("/"); await ready(page);
  const raw = await page.evaluate((key) => {
    const value = JSON.parse(localStorage.getItem(key)!);
    value.project.schematic.componentInstances[0].typeName = "invalid-type";
    const next = JSON.stringify(value); localStorage.setItem(key, next); return next;
  }, storageKey);
  await page.reload(); await ready(page);
  expect(await drawing(page)).toMatchObject({ componentInstances: [], wires: [] });
  expect(await saved(page)).toBe(raw);
});

test("clean visits never replace the saved project or obsolete storage entry", async ({ page }) => {
  await page.goto("/"); await ready(page);
  const previous = await saved(page);
  await page.evaluate(() => localStorage.setItem("schematicComputed", "legacy data"));
  await page.goto("/?clean=true"); await ready(page); await emptyProject(page);
  expect(await saved(page)).toBe(previous);
  expect(await page.evaluate(() => localStorage.getItem("schematicComputed"))).toBe("legacy data");
  await page.goto("/"); await ready(page);
  expect((await drawing(page)).componentInstances).toHaveLength(9);
});

test("quota failures retain the previous snapshot and issue one notification", async ({ page }) => {
  await page.goto("/"); await ready(page);
  const previous = await saved(page);
  await page.evaluate((key) => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (name, value) {
      if (name === key) throw new DOMException("Quota reached", "QuotaExceededError");
      return original.call(this, name, value);
    };
  }, storageKey);
  await emptyProject(page);
  await page.evaluate(async () => {
    const load = new Function("return import('/src/svelte/state/appState.svelte.ts')") as () => Promise<{ appState: AppStore }>;
    (await load()).appState.setLineThickness(4);
  });
  expect(await saved(page)).toBe(previous);
  await expect(page.getByText(/Browser autosave failed/i)).toHaveCount(1);
  await page.reload(); await ready(page);
  expect((await drawing(page)).componentInstances).toHaveLength(9);
});

test("unavailable browser storage leaves a functional blank editor", async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(window, "localStorage", { configurable: true, get: () => { throw new DOMException("Storage disabled", "SecurityError"); } }));
  await page.goto("/"); await ready(page);
  expect(await drawing(page)).toMatchObject({ componentInstances: [], wires: [] });
  await expect(page.getByText(/browser project could not be restored/i)).toHaveCount(1);
  await emptyProject(page);
});

test("configuration-only imports preserve the current schematic across refresh", async ({ page }) => {
  await page.goto("/"); await ready(page);
  const before = await drawing(page);
  await page.locator('input[type="file"]').first().setInputFiles(upload({
    schema: "EEcircuitV2", title: "Profiles only",
    simulations: [{ type: "Transient", name: "Slow", stopTime: "2m", timeStep: "10u" }],
  }));
  await expect(page.locator(".loading-overlay")).toHaveCount(0);
  expect(await drawing(page)).toEqual(before);
  await page.reload(); await ready(page);
  expect(await drawing(page)).toEqual(before);
  expect((await readProject(page)).profiles).toEqual([{ type: "Transient", name: "Slow", stopTime: "2m", timeStep: "10u" }]);
});

test("pointer activity and view changes do not rewrite the snapshot or retain transient state", async ({ page }) => {
  await page.goto("/"); await ready(page);
  const previous = await saved(page);
  await page.evaluate((key) => {
    const original = Storage.prototype.setItem;
    Object.assign(window, { autosaveWrites: 0 });
    Storage.prototype.setItem = function (name, value) {
      if (name === key) (window as unknown as { autosaveWrites: number }).autosaveWrites++;
      return original.call(this, name, value);
    };
  }, storageKey);
  const box = await page.locator("#schematic-canvas").boundingBox();
  if (!box) throw new Error("No schematic canvas");
  await page.mouse.move(box.x + 200, box.y + 200);
  await page.mouse.move(box.x + 500, box.y + 300, { steps: 12 });
  await page.locator("#canvas-container").focus();
  await page.keyboard.press("f");
  expect(await saved(page)).toBe(previous);
  expect(await page.evaluate(() => (window as unknown as { autosaveWrites: number }).autosaveWrites)).toBe(0);
  const value = JSON.parse(previous!);
  expect(value).toHaveProperty("project.schema", "EEcircuitV2");
  for (const key of ["results", "rawNetlist", "isMoving", "pointerInfo", "camera", "history", "editorMode"]) {
    expect(value.session).not.toHaveProperty(key);
  }
});

test("clearing local data stops persistence before reload and creates a fresh demo", async ({ page }) => {
  await page.goto("/"); await ready(page); await emptyProject(page);
  await page.evaluate(() => localStorage.setItem("obsolete-probe", "remove"));
  await page.getByRole("button", { name: "Simulation Settings", exact: true }).click();
  await page.getByRole("button", { name: "General Settings", exact: true }).click();
  page.once("dialog", (dialog) => void dialog.accept());
  await Promise.all([
    page.waitForNavigation(),
    page.getByRole("button", { name: "Clear Local Storage", exact: true }).click(),
  ]);
  await ready(page);
  expect(await page.evaluate(() => localStorage.getItem("obsolete-probe"))).toBeNull();
  expect((await drawing(page)).componentInstances).toHaveLength(9);
  await expect.poll(() => saved(page)).not.toBeNull();
  expect(JSON.parse((await saved(page))!).project.schematic.componentInstances).toHaveLength(9);
});
