import { afterEach, describe, expect, it, vi } from "vitest";
import { createSimulationSlice } from "../../src/store/simulationStore";
import type { SimulationConfig } from "../../src/simulation/simulationProfiles";

type HarnessState = ReturnType<Parameters<typeof createSimulationSlice>[1]>;

function createStorage(configs: SimulationConfig[]): Storage {
  const values = new Map<string, string>([["eecircuit-simulation-configs", JSON.stringify(configs)]]);
  return {
    get length() { return values.size; },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => { values.delete(key); },
    setItem: (key, value) => { values.set(key, value); },
  };
}

function createHarness(configs: SimulationConfig[] = []): HarnessState {
  vi.stubGlobal("localStorage", createStorage(configs));
  const state = {} as HarnessState;
  const set: Parameters<typeof createSimulationSlice>[0] = (update) => {
    const next = typeof update === "function" ? update(state) : update;
    Object.assign(state, next);
  };
  const get: Parameters<typeof createSimulationSlice>[1] = () => state;
  Object.assign(state, {
    isSimulationTabEnabled: true,
    isPlottingTabEnabled: false,
    mainTabValue: "simulate" as const,
    setIsSimulationTabEnabled: (enabled: boolean) => { state.isSimulationTabEnabled = enabled; },
    setIsPlottingTabEnabled: (enabled: boolean) => { state.isPlottingTabEnabled = enabled; },
    setMainTabValue: (tab: "schematic" | "simulate" | "plot") => { state.mainTabValue = tab; },
  }, createSimulationSlice(set, get));
  return state;
}

afterEach(() => vi.unstubAllGlobals());

describe("simulation profile state transitions", () => {
  it("keeps saved profiles and incomplete drafts independent across type switches", () => {
    const state = createHarness();
    state.selectSimulationType("DC");
    state.updateActiveSimulationConfig({ type: "DC", name: "DC-1", source: "vin", start: "0", stop: "1", step: "0.1" });
    expect(state.commitActiveSimulationConfig()).toBe(true);

    state.updateActiveSimulationConfig({ type: "DC", name: "DC-1", source: "vin", start: "0.2", stop: "1.8", step: "0.2" });
    expect(state.saveActiveSimulationConfigAsNew()).toBe(true);
    expect(state.simulationConfig).toMatchObject({ name: "DC-2", start: "0.2", stop: "1.8", step: "0.2" });
    state.selectSimulationConfig(0);
    expect(state.simulationConfig).toMatchObject({ name: "DC-1", start: "0", stop: "1", step: "0.1" });

    state.selectSimulationType("Transient");
    state.updateActiveSimulationConfig({ type: "Transient", name: "Transient-1", stopTime: "2m", timeStep: "" });
    expect(state.commitActiveSimulationConfig()).toBe(false);
    expect(state.allSimulationConfigs).toHaveLength(2);

    state.selectSimulationType("DC");
    expect(state.selectedSimulationConfigIndex).toBe(0);
    expect(state.simulationCommandString).toBe(".dc vin 0 1 0.1");
    expect(state.renameSelectedSimulationConfig(" transient-1 ")).toBe(false);
    state.updateActiveSimulationConfig({ type: "DC", name: "DC-1", source: "vin", start: "0", stop: "3", step: "0.1" });
    expect(state.saveActiveSimulationConfigAsNew()).toBe(true);
    expect(state.simulationConfig).toMatchObject({ name: "DC-3", stop: "3" });
    state.selectSimulationType("Transient");
    expect(state.simulationConfig).toMatchObject({ name: "Transient-1", stopTime: "2m", timeStep: "" });

    state.updateActiveSimulationConfig({ type: "Transient", name: "Transient-1", stopTime: "2m", timeStep: "20u" });
    expect(state.commitActiveSimulationConfig()).toBe(true);
    state.selectSimulationConfig(1);
    expect(state.simulationCommandString).toBe(".dc vin 0.2 1.8 0.2");
    state.selectSimulationType("Transient");
    expect(state.simulationCommandString).toBe(".tran 20u 2m");
  });

  it("copies the active AC and Noise values with generated names", () => {
    const state = createHarness([
      { type: "AC", name: "AC-1", source: "vin", frequencyStart: "1", frequencyStop: "1k", stepNumber: "10", sweepType: "dec" },
      { type: "Noise", name: "Noise-1", netName: "out", source: "vin", steps: "10", startFreq: "1", stopFreq: "1k", sweepType: "dec" },
    ]);

    state.updateActiveSimulationConfig({ type: "AC", name: "AC-1", source: "vin", frequencyStart: "2", frequencyStop: "2k", stepNumber: "20", sweepType: "oct" });
    expect(state.saveActiveSimulationConfigAsNew()).toBe(true);
    expect(state.simulationConfig).toMatchObject({ name: "AC-2", frequencyStart: "2", frequencyStop: "2k", stepNumber: "20", sweepType: "oct" });
    state.selectSimulationConfig(0);
    expect(state.simulationConfig).toMatchObject({ name: "AC-1", frequencyStart: "1", frequencyStop: "1k" });

    state.selectSimulationConfig(1);
    state.updateActiveSimulationConfig({ type: "Noise", name: "Noise-1", netName: "out", source: "vin", steps: "25", startFreq: "2", stopFreq: "2k", sweepType: "lin" });
    expect(state.saveActiveSimulationConfigAsNew()).toBe(true);
    expect(state.simulationConfig).toMatchObject({ name: "Noise-2", steps: "25", startFreq: "2", stopFreq: "2k", sweepType: "lin" });
    state.selectSimulationConfig(1);
    expect(state.simulationConfig).toMatchObject({ name: "Noise-1", steps: "10", startFreq: "1", stopFreq: "1k" });
  });

  it("renames uniquely and selects the preceding profile as first, middle, and last entries are deleted", () => {
    const state = createHarness([
      { type: "DC", name: "DC-1", source: "vin", start: "0", stop: "1", step: "0.1" },
      { type: "DC", name: "DC-2", source: "vin", start: "0.2", stop: "1.2", step: "0.2" },
      { type: "Transient", name: "Transient-1", stopTime: "2m", timeStep: "20u" },
      { type: "Transient", name: "Transient-2", stopTime: "4m", timeStep: "40u" },
    ]);

    expect(state.renameSelectedSimulationConfig(" transient-1 ")).toBe(false);
    expect(state.renameSelectedSimulationConfig("Primary sweep")).toBe(true);
    expect(state.allSimulationConfigs[0]).toMatchObject({ name: "Primary sweep" });

    state.selectSimulationConfig(1);
    state.updateActiveSimulationConfig({ type: "DC", name: "DC-2", source: "vin", start: "0.2", stop: "9", step: "0.2" });
    state.selectSimulationConfig(2);
    state.deleteSelectedSimulationConfig();
    expect(state.simulationConfig).toMatchObject({ name: "DC-2", stop: "9" });

    state.selectSimulationConfig(0);
    state.deleteSelectedSimulationConfig();
    expect(state.selectedSimulationConfigIndex).toBe(0);
    expect(state.simulationConfig).toMatchObject({ name: "DC-2", stop: "9" });

    state.selectSimulationConfig(1);
    state.deleteSelectedSimulationConfig();
    expect(state.selectedSimulationConfigIndex).toBe(0);
    state.deleteSelectedSimulationConfig();
    expect(state.selectedSimType).toBe("None");
    expect(state.selectedSimulationConfigIndex).toBe(-1);
    expect(state.allSimulationConfigs).toEqual([]);
  });
});
