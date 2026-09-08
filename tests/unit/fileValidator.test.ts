import { describe, expect, it } from "vitest";
import { validateEEcircuitFile } from "../../src/utils/eeCircuitFileValidator";
import { assignPdkToEEcircuitV2 } from "../../src/utils/convertEEcircuitV1ToV2";

const validSchematic = {
  componentInstances: [],
  wires: [],
  futureField: { preserved: true },
};

describe("EEcircuit file validation", () => {
  it("accepts compatible unknown schematic fields", () => {
    const result = validateEEcircuitFile({ schema: "EEcircuitV2", processId: "gf180", schematic: validSchematic });
    expect(result.valid).toBe(true);
    if (result.valid) expect(result.file.schematic).toHaveProperty("futureField");
  });

  it("rejects malformed nested schematic collections", () => {
    expect(validateEEcircuitFile({
      schema: "EEcircuitV2",
      processId: "gf180",
      schematic: { componentInstances: {}, wires: [] },
    }).valid).toBe(false);
    expect(validateEEcircuitFile({
      schema: "EEcircuitV2",
      processId: "gf180",
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
    expect(validateEEcircuitFile({ schema: "EEcircuitV2", processId: "ptm90", simulations }).valid).toBe(true);
    expect(validateEEcircuitFile({ schema: "EEcircuitV2", processId: "ptm90", simulations: [{ type: "DC", source: 1 }] }).valid).toBe(false);
  });

  it("requires a supported process and validates GF180 corners", () => {
    expect(validateEEcircuitFile({ schema: "EEcircuitV2" })).toEqual({
      valid: false,
      error: "The processId field must name a supported circuit process.",
    });
    expect(validateEEcircuitFile({ schema: "EEcircuitV2", processId: "unknown" }).valid).toBe(false);
    expect(validateEEcircuitFile({ schema: "EEcircuitV2", processId: "gf180", gf180Corner: "ff" }).valid).toBe(true);
    expect(validateEEcircuitFile({ schema: "EEcircuitV2", processId: "gf180", gf180Corner: "fast" }).valid).toBe(false);
    expect(validateEEcircuitFile({ schema: "EEcircuitV2", processId: "ptm90", gf180Corner: "ff" }).valid).toBe(false);
  });

  it("rejects obsolete and unsupported schema versions", () => {
    expect(validateEEcircuitFile({ schema: "EEcircuitV1" })).toEqual({
      valid: false,
      error: "The file is not an EEcircuitV2 document.",
    });
    expect(validateEEcircuitFile({ schema: "EEcircuitV3" }).valid).toBe(false);
  });

  it("assigns process metadata without redesigning older V2 component values", () => {
    const result = assignPdkToEEcircuitV2({
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
    }, "gf180", "ss");
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.file.processId).toBe("gf180");
    expect(result.file.gf180Corner).toBe("ss");
    expect(result.file.schematic?.componentInstances[0]?.value).toBe("PTM90N W=1u L=0.09u");
  });
});
