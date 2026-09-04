import { expect, test } from "./safaridriver-fixtures";

test.describe("physical iPad SafariDriver application controls", () => {
  test.describe.configure({ mode: "serial" });

  test("trusted single-touch reaches the Svelte shell and schematic integration exactly once", async ({ ipad }) => {
    await ipad.open();
    const metadata = await ipad.metadata();
    expect(metadata.platformName.toLowerCase(), "SafariDriver must report physical iOS").toContain("ios");
    expect(metadata.browserName.toLowerCase()).toContain("safari");
    expect(metadata.maxTouchPoints).toBeGreaterThan(0);
    expect(metadata.viewport.width).toBeGreaterThan(0);
    expect(metadata.viewport.height).toBeGreaterThan(0);
    expect(metadata.viewport.dpr).toBeGreaterThanOrEqual(1);
    expect(await ipad.execute<boolean>("return document.hasFocus()"), "iPad Safari document focus").toBe(true);

    await ipad.waitFor('button[aria-label^="Current input profile: touchscreen"]');
    const initialTheme = await ipad.execute<string>("return document.documentElement.className");
    await ipad.tapSelector('button[aria-label="Toggle color mode"]', "theme");
    expect(await ipad.execute<string>("return document.documentElement.className")).not.toBe(initialTheme);

    await ipad.tapSelector('button[aria-label="Simulation Settings"]', "settings");
    await ipad.waitFor(".settings-modal");
    await ipad.tapSelector('.settings-modal button[aria-label="Close dialog"]', "close-settings");

    await ipad.tapSelector('button[aria-label="Open add component popover"]', "component-picker");
    await ipad.waitFor('[aria-label="Add Component"]');
    await ipad.tapSelector('[aria-label="Add Component"] button[aria-label="Close component picker"]', "close-picker");

    await ipad.tapSelector('button[aria-label="About EEcircuit"]', "about");
    await ipad.waitFor(".about-modal");
    await ipad.tapSelector('.about-modal button[aria-label="Close dialog"]', "close-about");

    await ipad.tapSelector('button[aria-label="Simulate Circuit"]', "simulate");
    await ipad.waitFor('fieldset.type-picker');
    await ipad.tapSelector('[role="tab"][aria-label="Schematic"]', "schematic-tab");
    await ipad.waitFor('#schematic-canvas');
    await ipad.tapSelector('[role="tab"][aria-label="simulation config"]', "simulation-tab");
    await ipad.waitFor('fieldset.type-picker');

    const events = await ipad.events();
    for (const key of ["theme", "settings", "close-settings", "component-picker", "close-picker", "about", "close-about", "simulate", "schematic-tab", "simulation-tab"]) {
      expect(events.filter((event) => event.type === "click" && event.targetKey === key), `${key} activation`).toHaveLength(1);
      expect(events.some((event) => event.targetKey === key && event.isTrusted &&
        (event.pointerType === "touch" || event.type.startsWith("touch"))), `${key} trusted touch`).toBe(true);
    }
  });
});
