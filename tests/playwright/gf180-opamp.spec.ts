import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { expect, test } from "./fixtures";
import { waitForImportedCircuit } from "./file-import-helpers";

async function loadGf180OpampExample(page: import("@playwright/test").Page) {
  await page.locator('input[type="file"]').first().setInputFiles(
    resolve(process.cwd(), "src/schematic/gf180OpampExample.json"),
  );
  await waitForImportedCircuit(page, {
    configCount: 3,
    componentNames: ["X1", "Vin", "Vdd", "RL", "CL"],
  });
}

async function readSchematicCoordinate(page: import("@playwright/test").Page, x: number, y: number) {
  await page.mouse.move(Math.round(x), Math.round(y));
  await page.waitForTimeout(60);
  const text = await page.getByLabel("Schematic coordinates").textContent();
  const match = text?.match(/X:\s*([-\d.]+),\s*Y:\s*([-\d.]+)/);
  if (!match?.[1] || !match[2]) throw new Error(`Cannot parse schematic coordinate: ${text}`);
  return { x: Number(match[1]), y: Number(match[2]) };
}

async function clickSchematicPoint(page: import("@playwright/test").Page, schematicX: number, schematicY: number) {
  const canvas = page.locator("#schematic-canvas");
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Schematic canvas has no bounding box");
  const center = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  const p1 = await readSchematicCoordinate(page, center.x, center.y);
  const p2 = await readSchematicCoordinate(page, center.x + 200, center.y - 200);
  await page.mouse.click(
    Math.round(center.x + (schematicX - p1.x) / ((p2.x - p1.x) / 200)),
    Math.round(center.y + (schematicY - p1.y) / ((p2.y - p1.y) / -200)),
  );
}

test("GF180 opamp voltage-follower example file loads its model and simulates", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/?clean=true");
  await expect(page.locator("#schematic-canvas")).toHaveAttribute("data-canvas-ready", "true", { timeout: 15_000 });

  await loadGf180OpampExample(page);

  await expect.poll(async () => page.evaluate(async () => {
    const loadState = new Function("return import('/src/svelte/state/appState.svelte.ts')") as () => Promise<{
      appState: { processId: string; gf180Corner: string };
    }>;
    const { appState } = await loadState();
    return { processId: appState.processId, corner: appState.gf180Corner };
  })).toEqual({ processId: "gf180", corner: "typical" });

  const downloadPromise = page.waitForEvent("download");
  await page.getByLabel("Save EEcircuit file").first().click();
  const downloadPath = await (await downloadPromise).path();
  if (!downloadPath) throw new Error("Saved GF180 opamp example has no download path");
  const savedBuffer = await readFile(downloadPath);
  const saved = JSON.parse(savedBuffer.toString()) as {
    processId: string;
    gf180Corner: string;
    schematic: { componentInstances: Array<{ name: string; value?: string }> };
  };
  expect(saved.processId).toBe("gf180");
  expect(saved.gf180Corner).toBe("typical");
  expect(saved.schematic.componentInstances.find((component) => component.name === "X1")?.value)
    .toBe("gf180_opamp_3p3");

  await page.locator('input[type="file"]').first().setInputFiles({
    name: "gf180-opamp-round-trip.json",
    mimeType: "application/json",
    buffer: savedBuffer,
  });
  await waitForImportedCircuit(page, { configCount: 3, componentNames: ["X1", "Vin", "Vdd", "RL", "CL"] });
  await expect.poll(async () => page.evaluate(async () => {
    const loadState = new Function("return import('/src/svelte/state/appState.svelte.ts')") as () => Promise<{
      appState: { currentSchematic?: { componentInstances: Array<{ name: string; value?: string }> } };
    }>;
    return (await loadState()).appState.currentSchematic?.componentInstances
      .find((component) => component.name === "X1")?.value;
  })).toBe("gf180_opamp_3p3");

  await page.getByLabel("Simulate Circuit").click();
  await expect(page.getByLabel("Saved simulation configuration", { exact: true })).toHaveValue("0");
  await expect(page.getByLabel("Saved simulation configuration", { exact: true }).locator("option"))
    .toHaveText(["Select Configuration", "DC follower sweep (DC)", "AC follower response (AC)", "Transient follower response (Transient)"]);
  await expect(page.locator(".simulation-compatibility-errors")).toHaveCount(0);

  const generated = ((await page.locator(".view-lines").textContent()) ?? "").replace(/\u00a0/g, " ");
  expect(generated).toContain("X1 in out out VDD GND gf180_opamp_3p3");
  expect(generated).toContain(".subckt gf180_opamp_3p3 inp inn out vdd vss");
  expect(generated.match(/\.subckt gf180_opamp_3p3/g)).toHaveLength(1);
  expect(generated).not.toMatch(/^\.(?:control|op|lib)\b/im);

  await page.getByRole("button", { name: "Run Simulation" }).click();
  await expect(page.getByRole("tab", { name: "Plot" })).toHaveAttribute("aria-selected", "true", { timeout: 30_000 });
  await expect(page.getByText("v(out)", { exact: true }).first()).toBeVisible();
});

test("Properties explicitly replaces an opamp implementation for the selected PDK", async ({ page }) => {
  await page.goto("/?clean=true");
  await expect(page.locator("#schematic-canvas")).toHaveAttribute("data-canvas-ready", "true", { timeout: 15_000 });
  await loadGf180OpampExample(page);

  await clickSchematicPoint(page, 4, 0);
  const properties = page.getByRole("dialog", { name: "Component properties" });
  await expect(properties).toContainText("Opamp");
  await expect(properties.getByLabel("Model")).toHaveValue("gf180_opamp_3p3");
  await expect(properties).toContainText("six fixed ideal internal bias sources");
  await properties.getByRole("button", { name: "Close properties" }).click();

  await page.getByRole("button", { name: "Simulation Settings" }).click();
  await page.getByLabel("Process", { exact: true }).selectOption("ptm90");
  page.once("dialog", (dialog) => void dialog.accept());
  await page.getByRole("button", { name: "Save changes" }).click();

  await clickSchematicPoint(page, 4, 0);
  await expect(properties.getByLabel("Model")).toHaveValue("gf180_opamp_3p3");
  await expect(properties).toContainText("outside selected process");
  await properties.getByLabel("Model").selectOption("chang90");
  await properties.getByRole("button", { name: "Apply" }).click();
  await expect.poll(async () => page.evaluate(async () => {
    const loadState = new Function("return import('/src/svelte/state/appState.svelte.ts')") as () => Promise<{
      appState: { currentSchematic?: { componentInstances: Array<{ name: string; value?: string }> } };
    }>;
    return (await loadState()).appState.currentSchematic?.componentInstances
      .find((component) => component.name === "X1")?.value;
  })).toBe("chang90");
});
