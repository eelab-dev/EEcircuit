import compatibilityFixture from "../fixtures/browser-project-v2.json";
import { describe, expect, it, vi } from "vitest";
import { BROWSER_PROJECT_KEY, BrowserProjectPersistence, validateBrowserProject, type BrowserProjectSnapshotV1 } from "../../src/persistence/browserProject";

function snapshot(): BrowserProjectSnapshotV1 {
  return {
    version: 1, project: { schema: "EEcircuitV2", simulations: [], schematic: { componentInstances: [], wires: [] } },
    session: {
      selectedSimType: "None", simulationConfig: { type: "None" }, selectedSimulationConfigIndex: -1,
      simulationConfigDrafts: {}, lastSelectedSimulationConfigNames: {}, manualNetlistDirty: true, manualNetlist: "* unfinished deck\n.end",
      mainTabValue: "schematic", toBePlotted: [], numCanvases: 1, selectedVariables: [], canvas1SelectedVariables: [], canvas2SelectedVariables: [],
      isLogX: false, isLogY: false, isLogY1: false, isLogY2: false, canvas1IsLogY: false, canvas2IsLogY: false,
      lineThickness: 2, showInternalSignals: false, resetVariableSelectionsOnNewSim: true,
      resetPlotStateOnNewSim: true, maxWebWorkers: 1,
    },
  };
}
function harness(initial: string | null = null, isolated = false) {
  let value = initial;
  let current = snapshot();
  const storage = { getItem: vi.fn(() => value), setItem: vi.fn((_key: string, next: string) => { value = next; }) };
  const report = vi.fn();
  const persistence = new BrowserProjectPersistence(() => storage, () => current, report, isolated);
  return { storage, report, persistence, value: () => value, replace: (next: BrowserProjectSnapshotV1) => { current = next; } };
}

describe("browser project persistence", () => {
  it("retains the V2 fixture for the eventual Next reader upgrade", async () => {
    expect(await validateBrowserProject(compatibilityFixture)).toEqual(compatibilityFixture);
  });
  it("validates empty projects, manual decks and unfinished simulation drafts", async () => {
    const value = snapshot();
    delete value.project.schematic;
    value.session.simulationConfigDrafts["@new:Transient"] = { type: "Transient", name: "Draft", timeStep: "", stopTime: "" };
    expect(await validateBrowserProject(value)).toEqual(value);
  });
  it("rejects unsupported versions, malformed setup and malformed projects", async () => {
    await expect(validateBrowserProject({ ...snapshot(), version: 2 })).rejects.toThrow(/Unsupported/);
    const value = snapshot();
    value.session.simulationConfigDrafts = { broken: { type: "DC" } } as never;
    await expect(validateBrowserProject(value)).rejects.toThrow(/malformed/);
    await expect(validateBrowserProject({ ...snapshot(), project: { schema: "EEcircuitV1" } })).rejects.toThrow(/EEcircuitV2/);
  });
  it("writes synchronously, skips unchanged values and restores the snapshot", async () => {
    const h = harness();
    h.persistence.save();
    expect(h.storage.setItem).not.toHaveBeenCalled();
    h.persistence.start();
    expect(h.storage.setItem).toHaveBeenCalledTimes(1);
    expect(h.storage.setItem.mock.calls[0]?.[0]).toBe(BROWSER_PROJECT_KEY);
    h.persistence.save();
    expect(h.storage.setItem).toHaveBeenCalledTimes(1);
    expect(await h.persistence.load()).toEqual(snapshot());
  });
  it("saves complete successful transactions and retains the last value on failure", async () => {
    const h = harness();
    h.persistence.start();
    const original = h.value();
    await expect(h.persistence.transaction(async () => {
      const next = snapshot(); next.project.title = "partial"; h.replace(next); h.persistence.save();
      expect(h.value()).toBe(original);
      throw new Error("editor rejected import");
    })).rejects.toThrow(/rejected/);
    expect(h.value()).toBe(original);
    await h.persistence.transaction(async () => { const next = snapshot(); next.project.title = "finished"; h.replace(next); });
    expect(JSON.parse(h.value()!).project.title).toBe("finished");
  });
  it("preserves corrupt data until an explicit successful replacement", async () => {
    const h = harness("bad json");
    expect(await h.persistence.load()).toBeUndefined();
    h.persistence.start(); h.persistence.save();
    expect(h.value()).toBe("bad json");
    expect(h.report).toHaveBeenCalledTimes(1);
    await h.persistence.transaction(async () => undefined, true);
    expect(JSON.parse(h.value()!).version).toBe(1);
  });
  it("contains inaccessible storage and quota failures without changing the last value", async () => {
    const h = harness(); h.persistence.start(); const original = h.value();
    h.storage.setItem.mockImplementation(() => { throw new Error("QuotaExceededError"); });
    const next = snapshot(); next.project.title = "newer"; h.replace(next);
    h.persistence.save(); h.persistence.save();
    expect(h.value()).toBe(original); expect(h.report).toHaveBeenCalledTimes(1);
    const report = vi.fn();
    const unavailable = new BrowserProjectPersistence(() => { throw new Error("SecurityError"); }, snapshot, report);
    expect(await unavailable.load()).toBeUndefined(); unavailable.start(); expect(report).toHaveBeenCalledTimes(1);
  });
  it("never reads or writes project storage in an isolated clean session or after stopping", async () => {
    const h = harness("saved", true); await h.persistence.load(); h.persistence.start();
    await h.persistence.transaction(async () => undefined, true);
    expect(h.storage.getItem).not.toHaveBeenCalled(); expect(h.storage.setItem).not.toHaveBeenCalled();
    const normal = harness(); normal.persistence.start(); normal.persistence.stop();
    const next = snapshot(); next.project.title = "cleared"; normal.replace(next); normal.persistence.save();
    expect(normal.storage.setItem).toHaveBeenCalledTimes(1);
  });
});
