import { readFile } from "node:fs/promises";

import { test, expect } from "./fixtures";
import { demoSchematic } from "../../src/schematic/demoSchematic";

type Point = { x: number; y: number };

const segmentDirection = (start: Point, end: Point): "horizontal" | "vertical" | "diagonal" => {
  if (start.x === end.x) return "vertical";
  if (start.y === end.y) return "horizontal";
  return "diagonal";
};

test("Load Demo restores the app-owned schematic after clearing", async ({ page }) => {
  await page.goto("/");

  const canvas = page.locator("canvas#schematic-canvas");
  await expect(canvas).toBeVisible();
  await expect(canvas).toHaveAttribute("data-canvas-ready", "true", { timeout: 15000 });

  await page.getByRole("button", { name: "New Schematic" }).click();
  await page.getByRole("button", { name: "New Empty Schematic" }).click();
  await expect(page.getByRole("dialog")).toBeHidden({ timeout: 5000 });
  const emptyCanvas = await canvas.screenshot();

  await page.getByRole("button", { name: "New Schematic" }).click();
  await page.getByRole("button", { name: "Load Demo" }).click();
  await expect(page.getByRole("dialog")).toBeHidden({ timeout: 5000 });
  const loadedCanvas = await canvas.screenshot();
  expect(loadedCanvas.equals(emptyCanvas)).toBe(false);

  const downloadPromise = page.waitForEvent("download");
  await page.getByLabel("Save EEcircuit file").first().click();
  const download = await downloadPromise;
  const downloadPath = await download.path();
  expect(downloadPath).not.toBeNull();
  if (!downloadPath) return;

  const savedFile = JSON.parse(await readFile(downloadPath, "utf8")) as {
    schematic: {
      componentInstances: Array<{ name: string; typeName: string }>;
      wires: Array<{ netName?: string }>;
    };
  };
  expect(savedFile.schematic.componentInstances).toHaveLength(9);
  expect(savedFile.schematic.wires).toHaveLength(8);
  expect(savedFile.schematic.componentInstances).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ name: "M1", typeName: "nFET" }),
      expect.objectContaining({ name: "R1", typeName: "resistor" }),
      expect.objectContaining({ name: "vin", typeName: "vsin" }),
      expect.objectContaining({ name: "Vsup", typeName: "vdc" }),
    ]),
  );
  expect(savedFile.schematic.wires.map((wire) => wire.netName).sort()).toEqual([
    "GND",
    "GND",
    "GND",
    "GND",
    "VDD",
    "VDD",
    "input",
    "output",
  ]);
});

test("default demo preserves the original common-source amplifier", () => {
  expect(demoSchematic.componentInstances).toHaveLength(9);
  expect(demoSchematic.wires).toHaveLength(8);

  const instances = new Map(
    demoSchematic.componentInstances.map((instance) => [instance.name, instance]),
  );
  expect(instances.get("M1")).toMatchObject({
    typeName: "nFET",
    value: "PTM90N W=1u L=0.09u",
    origin: { x: 0, y: 0 },
  });
  expect(instances.get("R1")).toMatchObject({
    typeName: "resistor",
    value: "1k",
    origin: { x: 0, y: 13 },
    rotation: "90",
  });

  for (const wire of demoSchematic.wires) {
    expect(wire.absolutePath.length).toBeGreaterThan(1);
    for (let index = 1; index < wire.absolutePath.length; index += 1) {
      const start = wire.absolutePath[index - 1]!;
      const end = wire.absolutePath[index]!;
      expect(segmentDirection(start, end), `${wire.netName} contains a diagonal segment`).not.toBe("diagonal");
    }
  }

  const outputWire = demoSchematic.wires.find((wire) => wire.netName === "output");
  const inputWire = demoSchematic.wires.find((wire) => wire.netName === "input");
  expect(outputWire).toBeDefined();
  expect(inputWire).toBeDefined();
  if (!outputWire || !inputWire) return;

  expect(outputWire.absolutePath).toEqual([{ x: 0, y: 5 }, { x: 0, y: 8 }]);
  expect(inputWire.absolutePath).toEqual([
    { x: -15, y: -3 },
    { x: -15, y: 0 },
    { x: -5, y: 0 },
  ]);
});
