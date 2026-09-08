import { describe, expect, it } from "vitest";
import type { Schematic } from "eecircuit-schematic";
import { createDemoSchematic } from "../../src/schematic/demoSchematic";
import {
  defaultFetValue,
  modelCardFor,
  modelCardsFor,
  modelsFor,
  parseEngineeringLength,
  validateGeometry,
} from "../../src/pdk/processCatalog";
import {
  isEngineProvidedSubcircuit,
  currentProbeExpression,
  resolvePdkNetlist,
} from "../../src/pdk/netlistResolver";
import {
  circuitCompatibilityErrors,
  inferSchematicProcess,
  requiredProcessForComponentType,
  schematicPdkRequirements,
} from "../../src/pdk/circuitCompatibility";
import {
  builtinSubcircuitDefinition,
  defaultOpampModelForProcess,
  opampDefinitionForModel,
} from "../../src/pdk/opampRegistry";
import {
  getComponentPropertyConfig,
  parseComponentProperties,
  serializeComponentProperties,
} from "../../src/types/componentTypes";

const schematic = (value: string, typeName: "nFET" | "pFET" = "nFET"): Schematic => ({
  componentInstances: [{
    typeName,
    name: "M1",
    value,
    origin: { x: 0, y: 0 },
    rotation: "0",
    flip: "none",
  }],
  wires: [],
});

describe("PDK catalog", () => {
  it("uses GF180 defaults and emits its selected corner", () => {
    expect(defaultFetValue("gf180", "n")).toBe("nmos_3p3 W=1u L=0.28u");
    expect(defaultFetValue("gf180", "p")).toBe("pmos_3p3 W=1u L=0.28u");
    expect(defaultFetValue("freepdk45", "n")).toBe("PDK45NVTG W=1u L=45n");
    expect(defaultFetValue("freepdk45", "p")).toBe("PDK45PVTG W=1u L=45n");
    expect(modelCardFor("gf180", "ff")).toBe("modelcard.GF180.ff");
    expect(modelCardFor("ptm90", "ff")).toBe("modelcard.ptm");
    expect(modelCardsFor("gf180", "ff"))
      .toEqual(["modelcard.GF180.ff"]);
  });

  it("filters coexistent GF180 models by transistor polarity", () => {
    expect(modelsFor("gf180", "n").map((model) => model.name)).toContain("nmos_6p0_nat");
    expect(modelsFor("gf180", "p").map((model) => model.name)).toEqual(expect.arrayContaining([
      "pmos_3p3",
      "pmos_6p0",
      "pmos_3p3_sab",
      "pmos_6p0_sab",
    ]));
    expect(modelsFor("gf180", "p").some((model) => model.name.startsWith("nmos"))).toBe(false);
  });

  it("parses equivalent engineering-unit lengths and enforces declared GF180 bins", () => {
    expect(parseEngineeringLength("0.28u")).toBeCloseTo(280e-9);
    expect(parseEngineeringLength("280nm")).toBeCloseTo(280e-9);
    const model = modelsFor("gf180", "n").find((candidate) => candidate.name === "nmos_3p3")!;
    expect(model.geometry).toHaveLength(16);
    expect(validateGeometry(model, "0.22u", "0.28u")).toEqual([]);
    expect(validateGeometry(model, "100.001u", "50.001u")).toEqual([]);
    expect(validateGeometry(model, "1u", "280n")).toEqual([]);
    expect(validateGeometry(model, "10u", "10u")).toEqual([]);
    expect(validateGeometry(model, "219n", "0.28u")[0]).toContain("requires");
    expect(validateGeometry(model, "100.002u", "50.001u")[0]).toContain("requires");
    expect(validateGeometry(model, "1u", "90n")[0]).toContain("requires");
    const sixVoltModel = modelsFor("gf180", "n").find((candidate) => candidate.name === "nmos_6p0")!;
    expect(sixVoltModel.geometry).toHaveLength(2);
    expect(validateGeometry(sixVoltModel, "1u", "0.7u")).toEqual([]);
    expect(validateGeometry(modelsFor("ptm90", "n")[0]!, "wide", "0.09u"))
      .toEqual(["Width must be a number with an optional engineering suffix."]);
  });

  it("keeps the app-owned demo fixed to its tested GF180 device", () => {
    const demo = createDemoSchematic();
    expect(demo.componentInstances.find((instance) => instance.name === "M1")?.value)
      .toBe("nmos_3p3 W=0.22u L=0.28u");
  });
});

describe("PDK netlist resolution", () => {
  it("preserves an incompatible transistor instead of silently substituting it", () => {
    const result = resolvePdkNetlist(
      "M1 drain gate source bulk PTM90N W=1u L=0.28u m=2 ad=3p",
      schematic("PTM90N W=1u L=0.28u m=2 ad=3p"),
      "gf180",
    );
    expect(result.netlist).toBe("M1 drain gate source bulk PTM90N W=1u L=0.28u m=2 ad=3p");
    expect(result.componentNameMap.get("M1")).toBe("M1");
    expect(currentProbeExpression(result, "M1", "D")).toBe("I(M1,D)");
    expect(result.geometryErrors).toEqual([]);
    expect(result.compatibilityErrors).toEqual([expect.stringContaining("PTM90N is outside GF180 MCU")]);
  });

  it("rewrites only FET instances captured by the schematic snapshot", () => {
    const result = resolvePdkNetlist(
      "M1 d g s b PTM90N W=1u L=0.09u\nM_EXTERNAL d2 g2 s2 b2 PTM90N W=2u L=0.09u",
      schematic("PTM90N W=1u L=0.09u"),
      "gf180",
    );
    expect(result.netlist.split("\n")).toEqual([
      "M1 d g s b PTM90N W=1u L=0.09u",
      "M_EXTERNAL d2 g2 s2 b2 PTM90N W=2u L=0.09u",
    ]);
  });

  it("infers process requirements and rejects process-specific components", () => {
    expect(inferSchematicProcess(schematic("PTM90N W=1u L=0.09u"))).toBe("ptm90");
    expect(requiredProcessForComponentType("OPAMP90")).toBe("ptm90");
    expect(requiredProcessForComponentType("resistor")).toBeUndefined();
    expect(requiredProcessForComponentType("voltageSource")).toBeUndefined();
    expect(circuitCompatibilityErrors(schematic("PTM90N W=1u L=0.09u"), "gf180"))
      .toEqual([expect.stringContaining("belongs to PTM 90 nm")]);
    expect(circuitCompatibilityErrors(undefined, "gf180", "X1 a b c d e chang90"))
      .toEqual([expect.stringContaining("chang90 requires PTM 90 nm")]);
    const gf180Opamp: Schematic = {
      componentInstances: [{
        typeName: "OPAMP90",
        name: "XGF",
        value: "gf180_opamp_3p3",
        origin: { x: 0, y: 0 },
        rotation: "0",
        flip: "none",
      }],
      wires: [],
    };
    expect(inferSchematicProcess(gf180Opamp)).toBe("gf180");
    expect(circuitCompatibilityErrors(gf180Opamp, "gf180")).toEqual([]);
    expect(circuitCompatibilityErrors(gf180Opamp, "ptm90"))
      .toEqual([expect.stringContaining("gf180_opamp_3p3 requires GF180 MCU")]);
    expect(circuitCompatibilityErrors(undefined, "ptm90", "X1 a b c d e gf180_opamp_3p3"))
      .toEqual([expect.stringContaining("gf180_opamp_3p3 requires GF180 MCU")]);
  });

  it("requires an explicit process for absent or conflicting legacy requirements", () => {
    const conflicting: Schematic = {
      componentInstances: [
        ...schematic("nmos_3p3 W=1u L=0.28u").componentInstances,
        {
          typeName: "OPAMP90",
          name: "U1",
          value: "chang90",
          origin: { x: 10, y: 0 },
          rotation: "0",
          flip: "none",
        },
      ],
      wires: [],
    };
    expect(inferSchematicProcess(undefined)).toBeUndefined();
    expect(inferSchematicProcess(conflicting)).toBeUndefined();
    expect(schematicPdkRequirements(conflicting)).toEqual([
      expect.objectContaining({ componentName: "M1", requiredProcess: "gf180" }),
      expect.objectContaining({ componentName: "U1", requiredProcess: "ptm90" }),
    ]);
  });

  it("blocks catalogued transistor models used with the wrong polarity", () => {
    expect(circuitCompatibilityErrors(schematic("pmos_3p3 W=1u L=0.28u", "nFET"), "gf180"))
      .toEqual(["M1: pmos_3p3 is not a valid NMOS model."]);
  });

  it("keeps compatible models and reports imported geometry outside known bounds", () => {
    const result = resolvePdkNetlist(
      "M1 d g s b nmos_6p0 W=1u L=0.28u",
      schematic("nmos_6p0 W=1u L=0.28u"),
      "gf180",
    );
    expect(result.netlist).toContain("nmos_6p0");
    expect(result.geometryErrors).toEqual([expect.stringContaining("M1:")]);
  });

  it("instruments every selected subcircuit terminal with a current sensor", () => {
    const result = resolvePdkNetlist(
      "M1 d g s b nmos_3p3 W=1u L=0.28u",
      schematic("nmos_3p3 W=1u L=0.28u"),
      "gf180",
      ["D", "G", "S", "B"].map((terminalName) => ({ componentName: "M1", terminalName })),
    );
    expect(result.netlist).toContain("VPDK_M1_D d __pdk_M1_D 0");
    expect(result.netlist).toContain("XM1 __pdk_M1_D __pdk_M1_G __pdk_M1_S __pdk_M1_B nmos_3p3");
    expect(currentProbeExpression(result, "M1", "B")).toBe("I(VPDK_M1_B,1)");
  });

  it("separates engine-provided transistor subcircuits from app-owned opamps", () => {
    expect(isEngineProvidedSubcircuit("nmos_3p3")).toBe(true);
    expect(isEngineProvidedSubcircuit("chang90")).toBe(false);
    expect(isEngineProvidedSubcircuit("nmos_project_specific")).toBe(false);
    expect(defaultOpampModelForProcess("ptm90")).toBe("chang90");
    expect(defaultOpampModelForProcess("gf180")).toBe("gf180_opamp_3p3");
    expect(defaultOpampModelForProcess("freepdk45")).toBeUndefined();
    expect(opampDefinitionForModel("GF180_OPAMP_3P3")?.processId).toBe("gf180");
    expect(builtinSubcircuitDefinition("chang90")).toContain(".subckt chang90 inp inn out vdd vss");
  });

  it("keeps the GF180 opamp definition reusable and free of its source testbench", () => {
    const definition = builtinSubcircuitDefinition("gf180_opamp_3p3")!;
    expect(definition).toContain(".subckt gf180_opamp_3p3 inp inn out vdd vss");
    expect(definition.match(/^X\d+\s/gm)).toHaveLength(20);
    expect(definition.match(/^Vbias\d+\s/gm)).toHaveLength(6);
    expect(definition.match(/^Cc\d+\s/gm)).toHaveLength(2);
    expect(definition).toContain("X4 d4 inn midp vdd pmos_3p3");
    expect(definition).toContain("X1 d1 inn midn vss nmos_3p3");
    expect(definition).not.toMatch(/^\.(?:control|op|dc|ac|tran|include|lib)\b/im);
    expect(definition).not.toMatch(/^(?:Cl|Rl|Vid|Vcm|vdd)\s/im);
  });

  it("round-trips the explicit opamp model through component properties", () => {
    expect(getComponentPropertyConfig("OPAMP90")).toEqual([
      expect.objectContaining({ key: "model", type: "select", required: true }),
    ]);
    const properties = parseComponentProperties("OPAMP90", "gf180_opamp_3p3");
    expect(properties).toMatchObject({ model: "gf180_opamp_3p3" });
    expect(serializeComponentProperties("OPAMP90", properties)).toBe("gf180_opamp_3p3");
    expect(parseComponentProperties("OPAMP90", "")).toMatchObject({ model: "chang90" });
  });
});
