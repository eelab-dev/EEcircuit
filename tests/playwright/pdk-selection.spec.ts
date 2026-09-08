import { readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Page } from "./fixtures";
import { waitForImportedCircuit } from "./file-import-helpers";

async function waitForSchematic(page: Page, path = "/") {
  await page.goto(path);
  await expect(page.locator("#schematic-canvas")).toHaveAttribute("data-canvas-ready", "true", { timeout: 15_000 });
}

async function openSimulationSettings(page: Page) {
  await page.getByRole("button", { name: "Simulation Settings" }).click();
  await expect(page.getByRole("dialog", { name: "Settings" })).toBeVisible();
}

async function readSchematicCoordinate(page: Page, x: number, y: number) {
  await page.mouse.move(Math.round(x), Math.round(y));
  await page.waitForTimeout(60);
  const text = await page.getByLabel("Schematic coordinates").textContent();
  const match = text?.match(/X:\s*([-\d.]+),\s*Y:\s*([-\d.]+)/);
  if (!match?.[1] || !match[2]) throw new Error(`Cannot parse schematic coordinate: ${text}`);
  return { x: Number(match[1]), y: Number(match[2]) };
}

async function clickSchematicPoint(page: Page, schematicX: number, schematicY: number) {
  const canvas = page.locator("#schematic-canvas");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Schematic canvas has no bounding box");
  const center = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  const p1 = await readSchematicCoordinate(page, center.x, center.y);
  const p2 = await readSchematicCoordinate(page, center.x + 200, center.y - 200);
  const scaleX = (p2.x - p1.x) / 200;
  const scaleY = (p2.y - p1.y) / -200;
  await page.mouse.click(
    Math.round(center.x + (schematicX - p1.x) / scaleX),
    Math.round(center.y + (schematicY - p1.y) / scaleY),
  );
}

async function currentComponents(page: Page) {
  return page.evaluate(async () => {
    const loadState = new Function("return import('/src/svelte/state/appState.svelte.ts')") as () => Promise<{
      appState: { currentSchematic?: { componentInstances: Array<{ typeName: string; value?: string }> } };
    }>;
    return (await loadState()).appState.currentSchematic?.componentInstances ?? [];
  });
}

async function currentSchematicSnapshot(page: Page) {
  return page.evaluate(async () => {
    const loadState = new Function("return import('/src/svelte/state/appState.svelte.ts')") as () => Promise<{
      appState: { currentSchematic?: unknown };
    }>;
    return (await loadState()).appState.currentSchematic;
  });
}

test("process settings persist in V2 files and drive placement defaults", async ({ page }) => {
  await waitForSchematic(page, "/?clean=true");
  await openSimulationSettings(page);
  const process = page.getByLabel("Process", { exact: true });
  await expect(process).toHaveValue("gf180");
  await expect(process.locator("option")).toHaveCount(16);
  await expect(process.locator("option", { hasText: /Sky130/i })).toHaveCount(0);
  await expect(page.getByLabel("GF180 process corner")).toHaveValue("typical");
  await page.getByLabel("GF180 process corner").selectOption("ff");
  await process.selectOption("ptm90");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();

  await openSimulationSettings(page);
  await expect(process).toHaveValue("gf180");
  await expect(page.getByLabel("GF180 process corner")).toHaveValue("typical");
  await process.selectOption("ptm90");
  await page.getByRole("button", { name: "Save changes" }).click();
  await page.reload();
  await expect(page.locator("#schematic-canvas")).toHaveAttribute("data-canvas-ready", "true", { timeout: 15_000 });
  await openSimulationSettings(page);
  await expect(page.getByLabel("Process", { exact: true })).toHaveValue("ptm90");
  await expect(page.getByLabel("GF180 process corner")).toHaveCount(0);
  await page.getByRole("button", { name: "Cancel", exact: true }).click();

  await page.keyboard.press("a");
  await page.getByPlaceholder("Search components...").fill("nFET");
  await page.getByRole("button", { name: "Add nFET" }).click();
  const canvasBox = await page.locator("#schematic-canvas").boundingBox();
  if (!canvasBox) throw new Error("Schematic canvas has no bounding box");
  await page.mouse.click(canvasBox.x + canvasBox.width / 2, canvasBox.y + canvasBox.height / 2);
  await page.getByRole("button", { name: "Cancel move" }).click();
  await expect.poll(() => currentComponents(page)).toEqual([
    expect.objectContaining({ typeName: "nFET", value: "PTM90N W=1u L=0.09u" }),
  ]);

  const downloadPromise = page.waitForEvent("download");
  await page.getByLabel("Save EEcircuit file").first().click();
  const path = await (await downloadPromise).path();
  if (!path) throw new Error("Saved EEcircuit file has no path");
  const saved = JSON.parse(await readFile(path, "utf8")) as Record<string, unknown>;
  expect(saved.processId).toBe("ptm90");
  expect(saved.gf180Corner).toBeUndefined();

  await page.locator("#canvas-container").focus();
  await page.keyboard.press("Shift+z");
  await expect.poll(() => currentComponents(page)).toEqual([]);
});

test("opening a saved GF180 circuit restores its process and corner", async ({ page }) => {
  await waitForSchematic(page, "/?clean=true");
  await openSimulationSettings(page);
  await page.getByLabel("GF180 process corner").selectOption("fs");
  await page.getByRole("button", { name: "Save changes" }).click();

  const downloadPromise = page.waitForEvent("download");
  await page.getByLabel("Save EEcircuit file").first().click();
  const savedPath = await (await downloadPromise).path();
  if (!savedPath) throw new Error("Saved EEcircuit file has no path");
  const savedBuffer = await readFile(savedPath);
  expect(JSON.parse(savedBuffer.toString())).toMatchObject({ processId: "gf180", gf180Corner: "fs" });

  await openSimulationSettings(page);
  await page.getByLabel("Process", { exact: true }).selectOption("ptm90");
  await page.getByRole("button", { name: "Save changes" }).click();
  await page.locator('input[type="file"]').first().setInputFiles({
    name: "gf180-round-trip.json",
    mimeType: "application/json",
    buffer: savedBuffer,
  });

  await expect.poll(async () => page.evaluate(async () => {
    const loadState = new Function("return import('/src/svelte/state/appState.svelte.ts')") as () => Promise<{
      appState: { processId: string; gf180Corner: string };
    }>;
    const { appState } = await loadState();
    return { processId: appState.processId, gf180Corner: appState.gf180Corner };
  })).toEqual({ processId: "gf180", gf180Corner: "fs" });

  await openSimulationSettings(page);
  await expect(page.getByLabel("Process", { exact: true })).toHaveValue("gf180");
  await expect(page.getByLabel("GF180 process corner")).toHaveValue("fs");
});

test("opening or explicitly loading the startup demo selects GF180 typical", async ({ page }) => {
  await waitForSchematic(page, "/?clean=true");
  await openSimulationSettings(page);
  await page.getByLabel("Process", { exact: true }).selectOption("ptm90");
  await page.getByRole("button", { name: "Save changes" }).click();

  await waitForSchematic(page, "/");
  await openSimulationSettings(page);
  await expect(page.getByLabel("Process", { exact: true })).toHaveValue("gf180");
  await expect(page.getByLabel("GF180 process corner")).toHaveValue("typical");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();

  await openSimulationSettings(page);
  await page.getByLabel("Process", { exact: true }).selectOption("ptm90");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Save changes" }).click();
  await page.getByRole("button", { name: "New Schematic" }).click();
  await page.getByRole("button", { name: "Load Demo" }).click();
  await openSimulationSettings(page);
  await expect(page.getByLabel("Process", { exact: true })).toHaveValue("gf180");
  await expect(page.getByLabel("GF180 process corner")).toHaveValue("typical");
});

test("process-specific components stay visible and enable only for their circuit process", async ({ page }) => {
  await waitForSchematic(page, "/?clean=true");
  await page.keyboard.press("a");
  await page.getByPlaceholder("Search components...").fill("OPAMP90");
  const opamp = page.getByRole("button", { name: "Add OPAMP90" });
  await expect(opamp).toBeVisible();
  await expect(opamp).toBeDisabled();
  await expect(opamp).toContainText("Requires PTM 90 nm");
  await page.getByRole("button", { name: "Close component picker" }).click();

  await openSimulationSettings(page);
  await page.getByLabel("Process", { exact: true }).selectOption("ptm90");
  await page.getByRole("button", { name: "Save changes" }).click();
  await page.keyboard.press("a");
  await page.getByPlaceholder("Search components...").fill("OPAMP90");
  await expect(opamp).toBeEnabled();
});

test("an existing PTM90 op-amp is preserved but blocked after changing to GF180", async ({ page }) => {
  await waitForSchematic(page);
  await page.locator('input[type="file"]').first().setInputFiles(path.resolve("tests/test-circuit-tia.json"));
  await waitForImportedCircuit(page, { configCount: 0, componentNames: ["X1"] });

  await openSimulationSettings(page);
  await expect(page.getByLabel("Process", { exact: true })).toHaveValue("ptm90");
  await page.getByLabel("Process", { exact: true }).selectOption("gf180");
  page.once("dialog", async (dialog) => {
    expect(dialog.message()).toContain("X1");
    expect(dialog.message()).toContain("OPAMP90 requires PTM 90 nm");
    await dialog.accept();
  });
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect.poll(async () => (await currentComponents(page)).find((component) => component.typeName === "OPAMP90")?.value)
    .toBe("chang90");

  await page.getByLabel("Simulate Circuit").click();
  await expect(page.locator(".simulation-compatibility-errors"))
    .toContainText("X1: OPAMP90 requires PTM 90 nm");
  await expect(page.getByRole("button", { name: "Run Simulation" })).toBeDisabled();
  await expect.poll(async () => ((await page.locator(".view-lines").textContent()) ?? "").replace(/\u00a0/g, " "))
    .toContain("chang90");
  const netlist = ((await page.locator(".view-lines").textContent()) ?? "").replace(/\u00a0/g, " ");
  expect(netlist).toContain("chang90");
  expect(netlist).toContain(".include modelcard.GF180.typical");
  expect(netlist).not.toContain(".include modelcard.ptm");
});

test("NFET properties enforce geometry and preserve incompatible models across process changes", async ({ page }) => {
  await waitForSchematic(page);
  await clickSchematicPoint(page, -2, 0);
  const properties = page.locator("[data-properties-dialog]");
  await expect(properties).toBeVisible();
  const model = page.getByLabel("Model");
  await expect(model.locator("option", { hasText: "nmos_6p0_nat" })).toHaveCount(1);
  await expect(model.locator("option", { hasText: /pmos/i })).toHaveCount(0);

  await model.selectOption("nmos_6p0");
  await expect(page.getByRole("alert")).toContainText("nmos_6p0 requires");
  await expect(page.getByRole("button", { name: "Apply" })).toBeDisabled();
  await page.getByLabel("Width").fill("300nm");
  await page.getByLabel("Length").fill("600nm");
  await expect(page.getByRole("alert")).toHaveCount(0);
  await page.getByRole("button", { name: "Apply" }).click();
  const beforeProcessChange = await currentSchematicSnapshot(page);

  await openSimulationSettings(page);
  await page.getByLabel("Process", { exact: true }).selectOption("ptm90");
  page.once("dialog", async (dialog) => {
    expect(dialog.message()).toContain("M1");
    expect(dialog.message()).toContain("Simulation will remain blocked");
    await dialog.dismiss();
  });
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("dialog", { name: "Settings" })).toBeVisible();
  await expect.poll(async () => page.evaluate(async () => {
    const loadState = new Function("return import('/src/svelte/state/appState.svelte.ts')") as () => Promise<{ appState: { processId: string } }>;
    return (await loadState()).appState.processId;
  })).toBe("gf180");

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Save changes" }).click();
  expect(await currentSchematicSnapshot(page)).toEqual(beforeProcessChange);
  await clickSchematicPoint(page, -2, 0);
  await expect(properties.getByRole("status")).toContainText("nmos_6p0 is outside the selected process");
  await expect(model).toHaveValue("nmos_6p0");
  await expect.poll(async () => (await currentComponents(page)).find((component) => component.typeName === "nFET")?.value)
    .toBe("nmos_6p0 W=300nm L=600nm");

  await page.getByRole("button", { name: "Simulate Circuit" }).click();
  await expect(page.getByText("Simulation Configuration", { exact: true })).toBeVisible({ timeout: 10_000 });
  const netlist = ((await page.locator(".view-lines").textContent()) ?? "").replace(/\u00a0/g, " ");
  expect(netlist).toContain("nmos_6p0 W=300nm L=600nm");
  await expect(page.getByRole("button", { name: "Run Simulation" })).toBeDisabled();
  await expect(page.locator(".simulation-compatibility-errors"))
    .toContainText("nmos_6p0 belongs to GF180 MCU");
});

test("process changes preserve manual netlists in None mode", async ({ page }) => {
  await waitForSchematic(page, "/?clean=true");
  await page.getByRole("button", { name: "Simulate Circuit" }).click();
  const noneRadio = page.getByRole("radio", { name: "None" });
  await page.getByText("None", { exact: true }).click();
  await expect(noneRadio).toBeChecked();
  const editor = page.locator(".monaco-editor").first();
  await editor.click();
  await page.keyboard.press("Meta+A");
  await page.keyboard.press("Control+A");
  await page.keyboard.press("Delete");
  await page.keyboard.insertText("* PDK manual sentinel\nV1 out 0 1\nR1 out 0 1k\nX1 out out out out 0 chang90\n.op\n.end");
  await expect.poll(async () => ((await page.locator(".view-lines").textContent()) ?? "").replace(/\u00a0/g, " "))
    .toContain("* PDK manual sentinel");
  const before = ((await page.locator(".view-lines").textContent()) ?? "").replace(/\u00a0/g, " ");

  await openSimulationSettings(page);
  await page.getByLabel("Process", { exact: true }).selectOption("freepdk45");
  page.once("dialog", async (dialog) => {
    expect(dialog.message()).toContain("chang90 requires PTM 90 nm");
    await dialog.accept();
  });
  await page.getByRole("button", { name: "Save changes" }).click();
  const after = ((await page.locator(".view-lines").textContent()) ?? "").replace(/\u00a0/g, " ");
  expect(after).toBe(before);
  expect(after).toContain("* PDK manual sentinel");
  expect(after).not.toContain("modelcard.FreePDK45");
  await expect(page.locator(".simulation-compatibility-errors"))
    .toContainText("chang90 requires PTM 90 nm");
  await expect(page.getByRole("button", { name: "Run Simulation" })).toBeDisabled();
});

test("the GF180 demo simulates with a generated subcircuit current probe", async ({ page }) => {
  test.setTimeout(45_000);
  await waitForSchematic(page);
  await page.evaluate(async () => {
    const loadState = new Function("return import('/src/svelte/state/appState.svelte.ts')") as () => Promise<{
      appState: { setToBePlotted: (items: Array<{ type: "current"; componentName: string; terminalName: string }>) => void };
    }>;
    (await loadState()).appState.setToBePlotted([{ type: "current", componentName: "M1", terminalName: "D" }]);
  });
  await page.getByRole("button", { name: "Simulate Circuit" }).click();
  await page.getByText("Transient", { exact: true }).click();
  await page.getByLabel("Stop Time").fill("10u");
  await page.getByLabel("Time Step").fill("100n");
  await expect.poll(async () => ((await page.locator(".view-lines").textContent()) ?? "").replace(/\u00a0/g, " "))
    .toContain(".include modelcard.GF180.typical");
  const generated = ((await page.locator(".view-lines").textContent()) ?? "").replace(/\u00a0/g, " ");
  expect(generated).toContain("VPDK_M1_D output __pdk_M1_D 0");
  expect(generated).toContain("XM1 __pdk_M1_D input GND GND nmos_3p3 W=0.22u L=0.28u");
  await page.getByRole("button", { name: "Run Simulation" }).click();
  await expect(page.getByRole("tab", { name: "Plot" })).toHaveAttribute("aria-selected", "true", { timeout: 30_000 });
  await expect(page.getByRole("checkbox", { name: "i(vpdk_m1_d)", exact: true })).toBeChecked();
});
