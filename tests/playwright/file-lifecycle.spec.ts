import { expect, test } from "./fixtures";
import { demoSchematic } from "../../src/schematic/demoSchematic";
import { readFile } from "node:fs/promises";

const file = (name: string, value: unknown) => ({
  name,
  mimeType: "application/json",
  buffer: Buffer.from(JSON.stringify(value)),
});

test.describe("file lifecycle", () => {
  test("rejects malformed imports and accepts configuration-only files", async ({ page }) => {
    await page.goto("/");
    const input = page.locator('input[type="file"]').first();

    await input.setInputFiles(file("unsupported-process.json", {
      schema: "EEcircuitV2",
      processId: "not-a-process",
    }));
    await expect(page.getByText("The processId field must name a supported circuit process.")).toBeVisible();

    await input.setInputFiles(file("malformed.json", {
      schema: "EEcircuitV2",
      processId: "gf180",
      schematic: { componentInstances: {}, wires: [] },
    }));
    await expect(page.getByText("The schematic field is malformed.")).toBeVisible();

    await input.setInputFiles(file("configuration-only.json", {
      schema: "EEcircuitV2",
      processId: "gf180",
      title: "Configuration only",
      simulations: [{ type: "None" }],
    }));
    await expect(page.getByLabel("Simulate Circuit")).toBeEnabled();
    await expect(page.locator('[data-canvas-ready="true"]')).toBeVisible();
  });

  test("rejects V1 and offers a separate V2 download without loading it", async ({ page }) => {
    await page.goto("/");
    const input = page.locator('input[type="file"]').first();
    await input.setInputFiles(file("old-config.json", {
      schema: "EEcircuitV1",
      title: "Old configuration",
      simulations: [{ type: "DC", source: "V1", start: "0", stop: "1", step: "0.1" }],
    }));

    const dialog = page.getByRole("dialog", { name: "Obsolete EEcircuit file" });
    await expect(dialog).toContainText("EEcircuitV1 is obsolete");
    await expect.poll(async () => page.evaluate(async () => {
      const loadState = new Function("return import('/src/svelte/state/appState.svelte.ts')") as () => Promise<{
        appState: { currentSchematic?: { componentInstances: unknown[] }; allSimulationConfigs: unknown[] };
      }>;
      const { appState } = await loadState();
      return [appState.currentSchematic?.componentInstances.length, appState.allSimulationConfigs.length];
    })).toEqual([9, 2]);
    await dialog.getByLabel("Circuit Process").selectOption("gf180");
    const downloadPromise = page.waitForEvent("download");
    await dialog.getByRole("button", { name: "Convert and download" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("old-config-v2.json");
    const downloadPath = await download.path();
    expect(downloadPath).not.toBeNull();
    if (downloadPath) {
      const converted = JSON.parse(await readFile(downloadPath, "utf8"));
      expect(converted.schema).toBe("EEcircuitV2");
      expect(converted.processId).toBe("gf180");
      expect(converted.simulations).toHaveLength(1);
    }
  });

  test("rejects invalid V2 endpoint references without replacing the current circuit", async ({ page }) => {
    await page.goto("/");
    const input = page.locator('input[type="file"]').first();
    await input.setInputFiles(file("invalid-reference.json", {
      schema: "EEcircuitV2",
      processId: "ptm90",
      schematic: {
        componentInstances: [
          { typeName: "resistor", name: "R1", value: "1k", origin: { x: 0, y: 0 }, rotation: "0", flip: "none" },
        ],
        wires: [{
          absolutePath: [{ x: -5, y: 0 }, { x: -10, y: 0 }],
          startLocation: { type: "terminal", prop: { instanceName: "R1", terminalName: "2" } },
        }],
      },
    }));
    await expect(page.getByRole("application", { name: "Schematic editor" })
      .getByText(/saved wire endpoint reference is invalid/i)).toBeVisible();
    await expect.poll(async () => page.evaluate(async () => {
      const loadState = new Function("return import('/src/svelte/state/appState.svelte.ts')") as () => Promise<{
        appState: { currentSchematic?: { componentInstances: Array<{ name: string }> }; processId: string };
      }>;
      const { appState } = await loadState();
      return {
        keptDemo: appState.currentSchematic?.componentInstances.some((component) => component.name === "M1"),
        processId: appState.processId,
      };
    })).toEqual({ keptDemo: true, processId: "gf180" });
  });

  test("assigns an inferred process to older V2 files before opening them", async ({ page }) => {
    await page.goto("/");
    const input = page.locator('input[type="file"]').first();
    await input.setInputFiles(file("older-v2.json", {
      schema: "EEcircuitV2",
      schematic: {
        componentInstances: [{
          typeName: "nFET",
          name: "M1",
          value: "PTM90N W=1u L=0.09u",
          origin: { x: 0, y: 0 },
          rotation: "0",
          flip: "none",
        }],
        wires: [],
      },
    }));
    const dialog = page.getByRole("dialog", { name: "Assign circuit process" });
    await expect(dialog.getByLabel("Circuit Process")).toHaveValue("ptm90");
    const downloadPromise = page.waitForEvent("download");
    await dialog.getByRole("button", { name: "Convert and download" }).click();
    const path = await (await downloadPromise).path();
    expect(path).not.toBeNull();
    if (path) expect(JSON.parse(await readFile(path, "utf8")).processId).toBe("ptm90");
  });

  test("reports conflicting legacy PDK requirements and cancellation preserves active state", async ({ page }) => {
    await page.goto("/");
    const input = page.locator('input[type="file"]').first();
    await input.setInputFiles(file("conflicting-pdks.json", {
      schema: "EEcircuitV2",
      schematic: {
        componentInstances: [
          {
            typeName: "nFET",
            name: "M_GF",
            value: "nmos_3p3 W=1u L=0.28u",
            origin: { x: 0, y: 0 },
            rotation: "0",
            flip: "none",
          },
          {
            typeName: "OPAMP90",
            name: "U_PTM",
            value: "chang90",
            origin: { x: 10, y: 0 },
            rotation: "0",
            flip: "none",
          },
        ],
        wires: [],
      },
    }));

    const dialog = page.getByRole("dialog", { name: "Assign circuit process" });
    await expect(dialog.getByLabel("Circuit Process")).toHaveValue("");
    await expect(dialog).toContainText("M_GF: nmos_3p3 belongs to GF180 MCU");
    await expect(dialog).toContainText("U_PTM: OPAMP90 requires PTM 90 nm");
    await dialog.getByRole("button", { name: "Cancel", exact: true }).click();

    await expect.poll(async () => page.evaluate(async () => {
      const loadState = new Function("return import('/src/svelte/state/appState.svelte.ts')") as () => Promise<{
        appState: { currentSchematic?: { componentInstances: Array<{ name: string }> }; processId: string };
      }>;
      const { appState } = await loadState();
      return {
        keptDemo: appState.currentSchematic?.componentInstances.some((component) => component.name === "M1"),
        processId: appState.processId,
      };
    })).toEqual({ keptDemo: true, processId: "gf180" });
  });

  test("converts uniquely inferable V1 wiring and opens the downloaded V2 file", async ({ page }) => {
    await page.goto("/");
    const input = page.locator('input[type="file"]').first();
    const legacyDemo = structuredClone(demoSchematic);
    for (const wire of legacyDemo.wires) {
      delete wire.startLocation;
      delete wire.endLocation;
    }
    // Preserve the one declared T-junction; coordinate inference handles its branch.
    legacyDemo.wires[5]!.endLocation = {
      type: "junction",
      prop: { junctionPosition: { x: 0, y: -8 } },
    };
    await input.setInputFiles(file("legacy-demo.json", {
      schema: "EEcircuitV1",
      title: "Legacy demo",
      schematic: legacyDemo,
      simulations: [{ type: "Transient", stopTime: "10u", timeStep: "100n" }],
    }));

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Convert and download" }).click();
    const download = await downloadPromise;
    const downloadPath = await download.path();
    expect(downloadPath).not.toBeNull();
    if (!downloadPath) return;
    await expect(page.locator("canvas")).toHaveCount(1);

    const converted = JSON.parse(await readFile(downloadPath, "utf8"));
    expect(converted.simulations).toHaveLength(1);
    await input.setInputFiles(file(download.suggestedFilename(), converted));
    await expect.poll(async () => page.evaluate(async () => {
      const loadState = new Function("return import('/src/svelte/state/appState.svelte.ts')") as () => Promise<{
        appState: { currentSchematic?: { componentInstances: unknown[] }; allSimulationConfigs: unknown[] };
      }>;
      const { appState } = await loadState();
      return [appState.currentSchematic?.componentInstances.length, appState.allSimulationConfigs.length];
    })).toEqual([9, 1]);
    for (const dismiss of await page.getByRole("button", { name: "Dismiss message" }).all()) {
      await dismiss.click();
    }
    await page.getByRole("button", { name: "Simulate Circuit" }).click();
    await expect(page.getByText("Simulation Configuration", { exact: true })).toBeVisible();
  });

  test("reports ambiguous V1 endpoint conversion and cleans up its temporary editor", async ({ page }) => {
    await page.goto("/");
    const input = page.locator('input[type="file"]').first();
    await input.setInputFiles(file("ambiguous.json", {
      schema: "EEcircuitV1",
      schematic: {
        componentInstances: [
          { typeName: "GND", name: "G1", origin: { x: 0, y: 0 }, rotation: "0", flip: "none" },
          { typeName: "GND", name: "G2", origin: { x: 0, y: 0 }, rotation: "0", flip: "none" },
        ],
        wires: [{ absolutePath: [{ x: 0, y: 0 }, { x: 0, y: 3 }] }],
      },
    }));
    await page.getByLabel("Circuit Process").selectOption("gf180");
    await page.getByRole("button", { name: "Convert and download" }).click();
    await expect(page.getByRole("alert")).toContainText("matches more than one connection");
    await expect(page.locator("canvas")).toHaveCount(1);
  });

  test("preserves metadata and unmatched floating endpoints during V1 conversion", async ({ page }) => {
    await page.goto("/");
    const input = page.locator('input[type="file"]').first();
    await input.setInputFiles(file("floating.json", {
      schema: "EEcircuitV1",
      title: "Floating wire",
      description: "Keep this description",
      schematic: {
        componentInstances: [
          { typeName: "resistor", name: "R1", value: "2k", origin: { x: 0, y: 0 }, rotation: "0", flip: "none" },
        ],
        wires: [{ absolutePath: [{ x: 20, y: 20 }, { x: 20, y: 25 }], netName: "floating" }],
      },
    }));
    await page.getByLabel("Circuit Process").selectOption("gf180");
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Convert and download" }).click();
    const downloadPath = await (await downloadPromise).path();
    expect(downloadPath).not.toBeNull();
    if (!downloadPath) return;
    const converted = JSON.parse(await readFile(downloadPath, "utf8"));
    expect(converted).toMatchObject({
      schema: "EEcircuitV2",
      title: "Floating wire",
      description: "Keep this description",
    });
    expect(converted.schematic.wires[0]).not.toHaveProperty("startLocation");
    expect(converted.schematic.wires[0]).not.toHaveProperty("endLocation");
    await expect(page.locator("canvas")).toHaveCount(1);
  });

  test("preserves explicit V1 references and rejects invalid junction topology", async ({ page }) => {
    await page.goto("/");
    const input = page.locator('input[type="file"]').first();
    const explicitReference = {
      type: "terminal",
      prop: { instanceName: "R1", terminalName: "1" },
    };
    await input.setInputFiles(file("explicit.json", {
      schema: "EEcircuitV1",
      schematic: {
        componentInstances: [
          { typeName: "resistor", name: "R1", value: "1k", origin: { x: 0, y: 0 }, rotation: "0", flip: "none" },
        ],
        wires: [{
          absolutePath: [{ x: -5, y: 0 }, { x: -10, y: 0 }],
          startLocation: explicitReference,
        }],
      },
    }));
    await page.getByLabel("Circuit Process").selectOption("gf180");
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Convert and download" }).click();
    const downloadPath = await (await downloadPromise).path();
    expect(downloadPath).not.toBeNull();
    if (!downloadPath) return;
    const converted = JSON.parse(await readFile(downloadPath, "utf8"));
    expect(converted.schematic.wires[0].startLocation).toEqual(explicitReference);

    await input.setInputFiles(file("corner-junction.json", {
      schema: "EEcircuitV1",
      schematic: {
        componentInstances: [],
        wires: [
          { absolutePath: [{ x: 0, y: 0 }, { x: 0, y: 5 }, { x: 5, y: 5 }] },
          {
            absolutePath: [{ x: -5, y: 5 }, { x: 0, y: 5 }],
            endLocation: { type: "junction", prop: { junctionPosition: { x: 0, y: 5 } } },
          },
        ],
      },
    }));
    await page.getByLabel("Circuit Process").selectOption("gf180");
    await page.getByRole("button", { name: "Convert and download" }).click();
    await expect(page.getByRole("alert")).toContainText("T-junction must end inside one straight wire segment");
    await expect(page.locator("canvas")).toHaveCount(1);
  });

  test("saves a valid EEcircuit file through the browser download path", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('[data-canvas-ready="true"]')).toBeVisible();
    page.on("dialog", (dialog) => void dialog.accept());

    const downloadPromise = page.waitForEvent("download");
    await page.getByLabel("Save EEcircuit file").first().click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^EEcircuit-.*\.json$/);
    const downloadPath = await download.path();
    expect(downloadPath).not.toBeNull();
    if (downloadPath) {
      const saved = JSON.parse(await readFile(downloadPath, "utf8"));
      expect(saved.schema).toBe("EEcircuitV2");
      expect(saved.processId).toBe("gf180");
      expect(saved.gf180Corner).toBe("typical");
      expect(saved.simulations).toEqual([
        { type: "DC", name: "DC-1", source: "vin", start: "0", stop: "1.8", step: "0.01" },
        { type: "Transient", name: "Transient-1", stopTime: "10m", timeStep: "10u", initialConditions: false },
      ]);
    }
  });
});
