import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "./fixtures";

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

test("process settings cancel, persist, stay outside V2 files, and drive placement defaults", async ({ page }) => {
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
  expect(saved.processId).toBeUndefined();
  expect(saved.gf180Corner).toBeUndefined();

  await page.locator("#canvas-container").focus();
  await page.keyboard.press("Shift+z");
  await expect.poll(() => currentComponents(page)).toEqual([]);
});

test("NFET properties filter models, enforce GF180 geometry, and show process fallback", async ({ page }) => {
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
  await page.getByLabel("Length").fill("600nm");
  await expect(page.getByRole("alert")).toHaveCount(0);
  await page.getByRole("button", { name: "Apply" }).click();
  const beforeProcessChange = await currentSchematicSnapshot(page);

  await openSimulationSettings(page);
  await page.getByLabel("Process", { exact: true }).selectOption("ptm90");
  page.once("dialog", async (dialog) => {
    expect(dialog.message()).toContain("M1");
    expect(dialog.message()).toContain("M1 → PTM90N");
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
  await expect(model).toHaveValue("PTM90N");
  await expect.poll(async () => (await currentComponents(page)).find((component) => component.typeName === "nFET")?.value)
    .toBe("nmos_6p0 W=1u L=600nm");

  await page.getByRole("button", { name: "Simulate Circuit" }).click();
  await expect(page.getByText("Simulation Configuration", { exact: true })).toBeVisible({ timeout: 10_000 });
  await expect.poll(async () => ((await page.locator(".view-lines").textContent()) ?? "").replace(/\u00a0/g, " "))
    .toContain(".include modelcard.ptm");
  const netlist = ((await page.locator(".view-lines").textContent()) ?? "").replace(/\u00a0/g, " ");
  expect(netlist).toContain("PTM90N W=1u L=600nm");
  expect(netlist).not.toContain("nmos_6p0");
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
  await page.keyboard.insertText("* PDK manual sentinel\nV1 out 0 1\nR1 out 0 1k\n.op\n.end");
  await expect.poll(async () => ((await page.locator(".view-lines").textContent()) ?? "").replace(/\u00a0/g, " "))
    .toContain("* PDK manual sentinel");
  const before = ((await page.locator(".view-lines").textContent()) ?? "").replace(/\u00a0/g, " ");

  await openSimulationSettings(page);
  await page.getByLabel("Process", { exact: true }).selectOption("freepdk45");
  await page.getByRole("button", { name: "Save changes" }).click();
  const after = ((await page.locator(".view-lines").textContent()) ?? "").replace(/\u00a0/g, " ");
  expect(after).toBe(before);
  expect(after).toContain("* PDK manual sentinel");
  expect(after).not.toContain("modelcard.FreePDK45");
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
  expect(generated).toContain("XM1 __pdk_M1_D input GND GND nmos_3p3 W=1u L=0.28u");
  await page.getByRole("button", { name: "Run Simulation" }).click();
  await expect(page.getByRole("tab", { name: "Plot" })).toHaveAttribute("aria-selected", "true", { timeout: 30_000 });
  await expect(page.getByRole("checkbox", { name: "i(vpdk_m1_d)", exact: true })).toBeChecked();
});
