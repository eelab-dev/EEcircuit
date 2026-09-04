import { expect, test } from "./xcuitest-fixtures";

const canvasSelector = "#schematic-canvas";
const plotSelector = '.plot-webgl[data-canvas-id="1"]';

test.describe("physical iPad XCUITest application integration", () => {
  test.describe.configure({ mode: "serial" });

  test("native component placement, selection, and property editing use trusted touch and the visible keyboard", async ({ ipad }) => {
    await ipad.start();
    const device = await ipad.deviceInfo();
    expect(device.isSimulator === true || device.isSimulator === 1).toBe(false);
    expect(device.userInterfaceIdiom === 1 || /iPad/iu.test(`${device.name ?? ""} ${device.model ?? ""}`)).toBe(true);
    await ipad.waitFor('button[aria-label^="Current input profile: touchscreen"]');

    await ipad.tapSelector('button[aria-label="Open add component popover"]', "open-components");
    await ipad.waitFor('[aria-label="Add Component"]');
    await ipad.tapSelector('button[aria-label="Add resistor"]', "choose-resistor");
    await ipad.waitFor('button[aria-label="Rotate selection"]');

    await ipad.tapWithin(canvasSelector, .78, .28, "schematic-canvas");
    await ipad.waitFor('button[aria-label="Cancel move"]');
    await ipad.tapSelector('button[aria-label="Cancel move"]', "finish-placement");
    await ipad.tapSelector('button[aria-label="Select"]', "select-mode");
    await ipad.tapWithin(canvasSelector, .78, .28, "schematic-canvas");
    await ipad.waitFor('[data-properties-dialog]');
    expect((await ipad.typeWithOnScreenKeyboard('input[aria-label="Resistance"]', "kohm", true)).toLowerCase()).toBe("kohm");
    await ipad.waitForAbsent('[data-properties-dialog]');

    await ipad.tapWithin(canvasSelector, .78, .28, "schematic-canvas");
    await ipad.waitFor('[data-properties-dialog]');
    expect(`${(await ipad.inspect('input[aria-label="Resistance"]')).value}`.toLowerCase()).toBe("kohm");

    const canvasEvents = (await ipad.events()).filter((event) => event.targetKey === "schematic-canvas");
    const pointerEvents = canvasEvents.filter((event) => event.type === "pointerdown" || event.type === "pointerup");
    expect(pointerEvents.filter((event) => event.type === "pointerdown" && event.isTrusted)).toHaveLength(3);
    expect(pointerEvents.filter((event) => event.type === "pointerup" && event.isTrusted)).toHaveLength(3);
    expect(pointerEvents.every((event) => event.pointerType === "touch")).toBe(true);
  });

  test("default demo runs a real transient simulation and its WebGL plot accepts native touch gestures", async ({ ipad }) => {
    await ipad.start();
    await ipad.tapSelector('button[aria-label="Simulate Circuit"]', "simulate-demo");
    await ipad.waitFor("fieldset.type-picker");
    await ipad.tapSelector('label:has(input[value="Transient"])', "transient-type");
    await ipad.waitFor('input[placeholder="e.g., 10n, 1m, 1"]');
    await ipad.typeWithOnScreenKeyboard('input[placeholder="e.g., 10n, 1m, 1"]', "10u");
    await ipad.typeWithOnScreenKeyboard('input[placeholder="e.g., 1n, 10p, 1m"]', "100n");
    await ipad.tapSelector('button[aria-label="Run Simulation"]', "run-simulation");
    try {
      await ipad.waitFor(plotSelector, undefined, 45_000);
    } catch (error) {
      const status = await ipad.inspect('button[aria-label*="error"]');
      if (!status.exists) throw error;
      await ipad.execute<void>(`document.querySelector('button[aria-label*="error"]')?.click()`);
      await ipad.waitFor(".status-message-list");
      const messages = (await ipad.inspect(".status-message-list")).text?.trim() || "No status details";
      throw new Error(`The physical iPad simulation failed before Plot opened: ${messages}`, { cause: error });
    }

    const mobileDrawer = await ipad.execute<boolean>("return matchMedia('(max-width: 767px)').matches");
    if (mobileDrawer) {
      await ipad.tapSelector('button[aria-label="Open plot variables"]', "open-plot-sidebar");
    } else {
      await ipad.tapSelector('button[aria-label="Unpin drawer"]', "unpin-plot-sidebar");
      await ipad.waitFor('button[aria-label="Open plot variables"]');
      await ipad.tapSelector('button[aria-label="Open plot variables"]', "open-plot-sidebar");
    }
    await ipad.waitFor(".plot-sidebar.overlay");
    await ipad.waitFor('.plot-sidebar input[type="checkbox"]');
    const signal = '.plot-sidebar input[type="checkbox"]';
    const selectedBefore = (await ipad.inspect(signal)).checked;
    expect(typeof selectedBefore).toBe("boolean");
    await ipad.tapSelector(signal, "plot-variable");
    expect((await ipad.inspect(signal)).checked).toBe(!selectedBefore);
    if (selectedBefore) {
      await ipad.tapSelector(signal, "plot-variable");
      expect((await ipad.inspect(signal)).checked).toBe(true);
    }
    await ipad.tapSelector('button[aria-label="Close sidebar"]', "close-plot-sidebar");
    await ipad.waitForAbsent(".plot-sidebar");

    await ipad.tapSelector('button[aria-label="Toggle cursor"]', "show-cursor");
    await ipad.tapSelector('button[aria-label="Toggle cursor snapping"]', "snap-cursor");
    await ipad.mark(plotSelector, "plot-canvas");
    await ipad.dragWithin(plotSelector, { x: .50, y: .5 }, { x: .52, y: .5 });
    await ipad.waitFor(".crosshair-label:not([hidden])");
    await ipad.waitFor("[data-snap-marker]:not([hidden])");

    const baseScale = Number((await ipad.inspect(plotSelector, ["data-scale-x"])).attributes["data-scale-x"]);
    await ipad.pinchWithin(plotSelector);
    await ipad.waitFor(plotSelector, (snapshot) => Number(snapshot.attributes["data-scale-x"]) > baseScale, 10_000);
    const zoomedScale = Number((await ipad.inspect(plotSelector, ["data-scale-x"])).attributes["data-scale-x"]);
    const offsetBefore = Number((await ipad.inspect(plotSelector, ["data-offset-x"])).attributes["data-offset-x"]);
    await ipad.dragWithin(plotSelector, { x: .62, y: .55 }, { x: .42, y: .55 });
    await ipad.waitFor(plotSelector, (snapshot) => Number(snapshot.attributes["data-offset-x"]) !== offsetBefore, 10_000);
    await ipad.doubleTapWithin(plotSelector);
    await ipad.waitFor(plotSelector, (snapshot) => Number(snapshot.attributes["data-scale-x"]) < zoomedScale, 10_000);
    expect((await ipad.inspect('button[aria-label="Reset zoom"]')).exists).toBe(false);

    for (const orientation of ["PORTRAIT", "LANDSCAPE"] as const) {
      await ipad.setOrientation(orientation);
      await ipad.tapSelector('[role="tab"][aria-label="Schematic"]', `schematic-${orientation}`);
      await ipad.waitFor(canvasSelector);
      const schematicLayout = await ipad.execute<{ width: number; height: number; scrollWidth: number; toolbar: DOMRect }>(`
        const toolbar = document.querySelector('.schematic-toolbar').getBoundingClientRect();
        return { width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth,
          toolbar: { left: toolbar.left, top: toolbar.top, right: toolbar.right, bottom: toolbar.bottom } };
      `);
      expect(schematicLayout.scrollWidth).toBeLessThanOrEqual(schematicLayout.width + 1);
      expect(schematicLayout.toolbar.left).toBeGreaterThanOrEqual(-1);
      expect(schematicLayout.toolbar.top).toBeGreaterThanOrEqual(-1);
      expect(schematicLayout.toolbar.right).toBeLessThanOrEqual(schematicLayout.width + 1);
      expect(schematicLayout.toolbar.bottom).toBeLessThanOrEqual(schematicLayout.height + 1);
      await ipad.tapSelector('[role="tab"][aria-label="simulation config"]', `simulation-${orientation}`);
      await ipad.waitFor("fieldset.type-picker");
      const simulationLayout = await ipad.execute<{ width: number; scrollWidth: number; sidebarRight: number }>(`
        const sidebar = document.querySelector('.simulation-sidebar').getBoundingClientRect();
        return { width: innerWidth, scrollWidth: document.documentElement.scrollWidth, sidebarRight: sidebar.right };
      `);
      expect(simulationLayout.scrollWidth).toBeLessThanOrEqual(simulationLayout.width + 1);
      expect(simulationLayout.sidebarRight).toBeLessThanOrEqual(simulationLayout.width + 1);
      await ipad.tapSelector('[role="tab"][aria-label="plot display"]', `plot-${orientation}`);
      await ipad.waitFor(plotSelector);
      const layout = await ipad.execute<{ width: number; height: number; scrollWidth: number; plot: DOMRect }>(`
        const plot = document.querySelector('.plot-workspace').getBoundingClientRect();
        return { width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth,
          plot: { left: plot.left, top: plot.top, right: plot.right, bottom: plot.bottom } };
      `);
      expect(layout.scrollWidth).toBeLessThanOrEqual(layout.width + 1);
      expect(layout.plot.left).toBeGreaterThanOrEqual(-1);
      expect(layout.plot.top).toBeGreaterThanOrEqual(-1);
      expect(layout.plot.right).toBeLessThanOrEqual(layout.width + 1);
      expect(layout.plot.bottom).toBeLessThanOrEqual(layout.height + 1);
    }

    const touchEvents = (await ipad.events()).filter((event) => event.targetKey === "plot-canvas" && event.isTrusted);
    const pointerIds = new Set(touchEvents.filter((event) => event.pointerType === "touch").map((event) => event.pointerId));
    expect(pointerIds.size).toBeGreaterThanOrEqual(2);
  });

  test("portrait and landscape keep the application controls inside the viewport", async ({ ipad }) => {
    await ipad.start();
    for (const orientation of ["PORTRAIT", "LANDSCAPE"] as const) {
      await ipad.setOrientation(orientation);
      expect(await ipad.orientation()).toBe(orientation);
      const layout = await ipad.execute<{ width: number; height: number; scrollWidth: number; headerRight: number; actionsBottom: number }>(`
        const header = document.querySelector('.main-header').getBoundingClientRect();
        const actions = document.querySelector('.header-actions').getBoundingClientRect();
        return { width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth,
          headerRight: header.right, actionsBottom: actions.bottom };
      `);
      if (orientation === "PORTRAIT") expect(layout.height).toBeGreaterThanOrEqual(layout.width);
      else expect(layout.width).toBeGreaterThan(layout.height);
      expect(layout.scrollWidth).toBeLessThanOrEqual(layout.width + 1);
      expect(layout.headerRight).toBeLessThanOrEqual(layout.width + 1);
      expect(layout.actionsBottom).toBeLessThanOrEqual(layout.height);
      await ipad.waitFor('button[aria-label="Simulate Circuit"]');
      const toolbar = await ipad.inspect(".schematic-toolbar");
      expect(toolbar.rect?.x ?? -1).toBeGreaterThanOrEqual(0);
      expect((toolbar.rect?.x ?? 0) + (toolbar.rect?.width ?? 0)).toBeLessThanOrEqual(layout.width + 1);
    }
  });
});
