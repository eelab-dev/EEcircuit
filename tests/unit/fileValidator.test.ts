import { describe, expect, it } from "vitest";
import { validateEEcircuitFile } from "../../src/utils/eeCircuitFileValidator";

const validSchematic = {
  componentInstances: [],
  wires: [],
  futureField: { preserved: true },
};

describe("EEcircuit file validation", () => {
  it("accepts compatible unknown schematic fields", () => {
    const result = validateEEcircuitFile({ schema: "EEcircuitV1", schematic: validSchematic });
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.file.schematic).toHaveProperty("futureField");
  });

  it("rejects malformed nested schematic collections", () => {
    expect(validateEEcircuitFile({
      schema: "EEcircuitV1",
      schematic: { componentInstances: {}, wires: [] },
    }).valid).toBe(false);
    expect(validateEEcircuitFile({
      schema: "EEcircuitV1",
      schematic: { componentInstances: [], wires: [{ absolutePath: [{ x: "bad", y: 0 }] }] },
    }).valid).toBe(false);
  });

  it("validates all supported simulation variants", () => {
    const simulations = [
      { type: "None" },
      { type: "DC", source: "V1", start: "0", stop: "1", step: "0.1" },
      { type: "AC", source: "V1", frequencyStart: "1", frequencyStop: "10", stepNumber: "10", sweepType: "dec" },
      { type: "Transient", stopTime: "1", timeStep: "0.1", initialConditions: false },
      { type: "Noise", netName: "out", source: "V1", steps: "10", startFreq: "1", stopFreq: "100", sweepType: "lin" },
    ];
    expect(validateEEcircuitFile({ schema: "EEcircuitV1", simulations }).valid).toBe(true);
    expect(validateEEcircuitFile({ schema: "EEcircuitV1", simulations: [{ type: "DC", source: 1 }] }).valid).toBe(false);
  });
});
