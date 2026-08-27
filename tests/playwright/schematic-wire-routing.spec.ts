import { test, expect } from "./fixtures";
import { demoSchematic } from "../../src/schematic/demoSchematic";

type Point = { x: number; y: number };
type Bounds = { left: number; right: number; bottom: number; top: number };

// These are the drawable symbol bodies in the demo's zero-degree orientation.
// Terminal stubs are intentionally excluded so a wire may touch a terminal
// without being treated as an overlap with the component body.
const componentBodyBounds: Record<string, Bounds> = {
  Vsup: { left: -2, right: 2, bottom: -2, top: 2 },
  vin: { left: -17, right: -13, bottom: -9, top: -5 },
  R1: { left: -3, right: 3, bottom: 8, top: 10 },
  GND1: { left: -2, right: 2, bottom: -11, top: -9 },
  GND2: { left: -17, right: -13, bottom: -18, top: -16 },
};

const segmentDirection = (start: Point, end: Point): "horizontal" | "vertical" | "diagonal" => {
  if (start.x === end.x) return "vertical";
  if (start.y === end.y) return "horizontal";
  return "diagonal";
};

const segmentCrossesBody = (start: Point, end: Point, body: Bounds): boolean => {
  if (start.x === end.x) {
    const segmentYMin = Math.min(start.y, end.y);
    const segmentYMax = Math.max(start.y, end.y);
    return start.x > body.left && start.x < body.right &&
      segmentYMax > body.bottom && segmentYMin < body.top;
  }
  if (start.y === end.y) {
    const segmentXMin = Math.min(start.x, end.x);
    const segmentXMax = Math.max(start.x, end.x);
    return start.y > body.bottom && start.y < body.top &&
      segmentXMax > body.left && segmentXMin < body.right;
  }
  return true;
};

test("default demo routes wires around component bodies", async ({ page }) => {
  await page.goto("/");

  const canvas = page.locator("canvas#schematic-canvas");
  await expect(canvas).toBeVisible();
  await expect(canvas).toHaveAttribute("data-canvas-ready", "true", { timeout: 15000 });

  await page.getByRole("button", { name: "New Schematic" }).click();
  await page.getByRole("button", { name: "Load Demo" }).click();
  await expect(page.getByRole("dialog")).toBeHidden({ timeout: 5000 });

  expect(demoSchematic.componentInstances).toHaveLength(5);
  expect(demoSchematic.wires).toHaveLength(4);

  for (const wire of demoSchematic.wires) {
    expect(wire.absolutePath.length).toBeGreaterThan(1);
    const firstSegment = wire.absolutePath.slice(0, 2);
    const lastSegment = wire.absolutePath.slice(-2);
    expect(segmentDirection(firstSegment[0]!, firstSegment[1]!)).not.toBe("diagonal");
    expect(segmentDirection(lastSegment[0]!, lastSegment[1]!)).not.toBe("diagonal");

    for (let index = 1; index < wire.absolutePath.length; index += 1) {
      const start = wire.absolutePath[index - 1]!;
      const end = wire.absolutePath[index]!;
      expect(segmentDirection(start, end), `${wire.netName} contains a diagonal segment`).not.toBe("diagonal");

      for (const [instanceName, body] of Object.entries(componentBodyBounds)) {
        expect(
          segmentCrossesBody(start, end, body),
          `${wire.netName} crosses the body of ${instanceName}`,
        ).toBe(false);
      }
    }
  }

  const outputWire = demoSchematic.wires.find((wire) => wire.netName === "output");
  const inputWire = demoSchematic.wires.find((wire) => wire.netName === "input");
  expect(outputWire).toBeDefined();
  expect(inputWire).toBeDefined();
  if (!outputWire || !inputWire) return;

  expect(segmentDirection(outputWire.absolutePath[0]!, outputWire.absolutePath[1]!)).toBe("vertical");
  expect(segmentDirection(outputWire.absolutePath.at(-2)!, outputWire.absolutePath.at(-1)!)).toBe("horizontal");
  expect(segmentDirection(inputWire.absolutePath[0]!, inputWire.absolutePath[1]!)).toBe("vertical");
  expect(segmentDirection(inputWire.absolutePath.at(-2)!, inputWire.absolutePath.at(-1)!)).toBe("horizontal");
});
