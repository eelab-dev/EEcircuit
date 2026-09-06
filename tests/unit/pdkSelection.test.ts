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
  incompatibleFetInstances,
  incompatibleFetReplacements,
  isEngineProvidedSubcircuit,
  currentProbeExpression,
  resolvePdkNetlist,
} from "../../src/pdk/netlistResolver";

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
    expect(modelCardsFor("gf180", "ff", ["chang90"]))
      .toEqual(["modelcard.GF180.ff", "modelcard.ptm"]);
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

  it("initializes the app-owned demo from the selected process without changing its layout", () => {
    const gf180Demo = createDemoSchematic("gf180");
    const ptm90Demo = createDemoSchematic("ptm90");
    expect(ptm90Demo.componentInstances.find((instance) => instance.name === "M1")?.value)
      .toBe("PTM90N W=1u L=0.09u");
    expect(ptm90Demo.wires).toEqual(gf180Demo.wires);
    const layouts = (value: Schematic) => value.componentInstances.map((instance) => ({
      typeName: instance.typeName,
      name: instance.name,
      origin: instance.origin,
      rotation: instance.rotation,
      flip: instance.flip,
    }));
    expect(layouts(ptm90Demo)).toEqual(layouts(gf180Demo));
  });
});

describe("PDK netlist resolution", () => {
  it("preserves parameters while using GF180 subcircuit names", () => {
    const result = resolvePdkNetlist(
      "M1 drain gate source bulk PTM90N W=1u L=0.28u m=2 ad=3p",
      schematic("PTM90N W=1u L=0.28u m=2 ad=3p"),
      "gf180",
    );
    expect(result.netlist).toBe("XM1 drain gate source bulk nmos_3p3 W=1u L=0.28u m=2 ad=3p");
    expect(result.componentNameMap.get("M1")).toBe("XM1");
    expect(currentProbeExpression(result, "M1", "D")).toBe("@m.xm1.m0[id]");
    expect(result.geometryErrors).toEqual([]);
  });

  it("rewrites only FET instances captured by the schematic snapshot", () => {
    const result = resolvePdkNetlist(
      "M1 d g s b PTM90N W=1u L=0.09u\nM_EXTERNAL d2 g2 s2 b2 PTM90N W=2u L=0.09u",
      schematic("PTM90N W=1u L=0.09u"),
      "gf180",
    );
    expect(result.netlist.split("\n")).toEqual([
      "XM1 d g s b nmos_3p3 W=1u L=0.09u",
      "M_EXTERNAL d2 g2 s2 b2 PTM90N W=2u L=0.09u",
    ]);
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

  it("finds models that need fallback without mutating schematic data", () => {
    const source = schematic("PTM90N W=1u L=0.09u");
    expect(incompatibleFetInstances(source, "gf180")).toEqual(["M1"]);
    expect(incompatibleFetReplacements(source, "gf180")).toEqual([{ name: "M1", replacement: "nmos_3p3" }]);
    expect(source.componentInstances[0]?.value).toBe("PTM90N W=1u L=0.09u");
    expect(incompatibleFetInstances(source, "ptm90")).toEqual([]);
  });

  it("recognizes only catalogued engine subcircuits and the built-in op-amp", () => {
    expect(isEngineProvidedSubcircuit("nmos_3p3")).toBe(true);
    expect(isEngineProvidedSubcircuit("chang90")).toBe(true);
    expect(isEngineProvidedSubcircuit("nmos_project_specific")).toBe(false);
  });
});
