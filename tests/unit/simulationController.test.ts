import { describe, expect, it, vi } from "vitest";
import type { Schematic } from "eecircuit-schematic";
import { executeSimulation } from "../../src/controllers/simulationController";
import type { AppStore } from "../../src/store/appStoreTypes";
import { setMessageSink } from "../../src/store/messageBus";

describe("simulation compatibility controller guard", () => {
  it("blocks execution even when UI controls are bypassed", async () => {
    const currentSchematic: Schematic = {
      componentInstances: [{
        typeName: "OPAMP90",
        name: "U1",
        value: "chang90",
        origin: { x: 0, y: 0 },
        rotation: "0",
        flip: "none",
      }],
      wires: [],
    };
    const setNetList = vi.fn();
    const runParallelSimulation = vi.fn();
    const messages: string[] = [];
    const clearSink = setMessageSink((message) => messages.push(message.text));
    const store = {
      currentSchematic,
      processId: "gf180",
      selectedSimType: "None",
      setNetList,
      runParallelSimulation,
    } as unknown as AppStore;

    try {
      await executeSimulation(() => store, "X1 in ref out vdd vss chang90");
    } finally {
      clearSink();
    }

    expect(messages).toEqual(expect.arrayContaining([
      expect.stringContaining("U1: OPAMP90 requires PTM 90 nm"),
      expect.stringContaining("chang90 requires PTM 90 nm"),
    ]));
    expect(setNetList).not.toHaveBeenCalled();
    expect(runParallelSimulation).not.toHaveBeenCalled();
  });
});
