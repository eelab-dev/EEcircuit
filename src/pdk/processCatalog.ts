export type FetPolarity = "n" | "p";
export type FetInvocation = "mosfet" | "subcircuit";
export type Gf180Corner = "typical" | "ff" | "ss" | "fs" | "sf" | "statistical";

export type GeometryRange = {
  minW: number;
  maxW: number;
  minL: number;
  maxL: number;
};

export type FetModel = {
  name: string;
  label: string;
  polarity: FetPolarity;
  invocation: FetInvocation;
  defaultW: string;
  defaultL: string;
  geometry?: GeometryRange[];
};

export type ProcessDefinition = {
  label: string;
  modelCard: string;
  models: readonly FetModel[];
  defaults: Record<FetPolarity, string>;
};

const geometryBins = (
  widths: readonly (readonly [number, number])[],
  lengths: readonly (readonly [number, number])[],
): GeometryRange[] => widths.flatMap(([minW, maxW]) =>
  lengths.map(([minL, maxL]) => ({ minW, maxW, minL, maxL })),
);

// Keep the individual engine model bins instead of flattening them to their
// outer bounds. Validation can then reject a W/L pair if a future card has a
// hole in its supported bin matrix.
const gf3p3Geometry = geometryBins(
  [
    [0.22e-6, 0.5e-6],
    [0.5e-6, 1.2e-6],
    [1.2e-6, 10e-6],
    [10e-6, 100.001e-6],
  ],
  [
    [0.28e-6, 0.5e-6],
    [0.5e-6, 1.2e-6],
    [1.2e-6, 10e-6],
    [10e-6, 50.001e-6],
  ],
);
const gfN6Geometry = geometryBins(
  [[0.3e-6, 100.001e-6]],
  [
    [0.6e-6, 0.7e-6],
    [0.7e-6, 50.001e-6],
  ],
);
const gfP6Geometry: GeometryRange[] = [
  { minW: 0.3e-6, maxW: 100.01e-6, minL: 0.5e-6, maxL: 50.01e-6 },
];
const gfNativeGeometry: GeometryRange[] = [
  { minW: 0.8e-6, maxW: 100.01e-6, minL: 1.8e-6, maxL: 50.01e-6 },
];

const gfModel = (
  name: string,
  label: string,
  polarity: FetPolarity,
  defaultL: string,
  geometry: GeometryRange[],
): FetModel => ({
  name,
  label,
  polarity,
  invocation: "subcircuit",
  defaultW: "1u",
  defaultL,
  geometry,
});

const primitiveModel = (
  name: string,
  label: string,
  polarity: FetPolarity,
  defaultL: string,
  geometry?: GeometryRange[],
): FetModel => ({
  name,
  label,
  polarity,
  invocation: "mosfet",
  defaultW: "1u",
  defaultL,
  ...(geometry ? { geometry } : {}),
});

const pair = (nName: string, pName: string, label: string, defaultL: string, geometry?: GeometryRange[]) => [
  primitiveModel(nName, `${label} NMOS`, "n", defaultL, geometry),
  primitiveModel(pName, `${label} PMOS`, "p", defaultL, geometry),
] as const;

const singlePairProcess = (
  label: string,
  modelCard: string,
  nName: string,
  pName: string,
  defaultL: string,
  geometry?: GeometryRange[],
): ProcessDefinition => ({
  label,
  modelCard,
  models: pair(nName, pName, label, defaultL, geometry),
  defaults: { n: nName, p: pName },
});

export const PROCESS_CATALOG = {
  gf180: {
    label: "GF180 MCU",
    modelCard: "modelcard.GF180",
    models: [
      gfModel("nmos_3p3", "3.3 V NMOS", "n", "0.28u", gf3p3Geometry),
      gfModel("nmos_6p0", "6.0 V NMOS", "n", "0.6u", gfN6Geometry),
      gfModel("nmos_3p3_sab", "3.3 V NMOS (SAB)", "n", "0.28u", gf3p3Geometry),
      gfModel("nmos_6p0_sab", "6.0 V NMOS (SAB)", "n", "0.6u", gfN6Geometry),
      gfModel("nmos_6p0_nat", "6.0 V native NMOS", "n", "1.8u", gfNativeGeometry),
      gfModel("pmos_3p3", "3.3 V PMOS", "p", "0.28u", gf3p3Geometry),
      gfModel("pmos_6p0", "6.0 V PMOS", "p", "0.5u", gfP6Geometry),
      gfModel("pmos_3p3_sab", "3.3 V PMOS (SAB)", "p", "0.28u", gf3p3Geometry),
      gfModel("pmos_6p0_sab", "6.0 V PMOS (SAB)", "p", "0.5u", gfP6Geometry),
    ],
    defaults: { n: "nmos_3p3", p: "pmos_3p3" },
  },
  freepdk45: {
    label: "FreePDK45",
    modelCard: "modelcard.FreePDK45",
    models: [
      ...pair("PDK45NTHKOX", "PDK45PTHKOX", "Thick oxide", "45n"),
      ...pair("PDK45NVTG", "PDK45PVTG", "General threshold", "45n"),
      ...pair("PDK45NVTH", "PDK45PVTH", "High threshold", "45n"),
      ...pair("PDK45NVTL", "PDK45PVTL", "Low threshold", "45n"),
    ],
    defaults: { n: "PDK45NVTG", p: "PDK45PVTG" },
  },
  freepdk15: singlePairProcess("FreePDK15", "modelcard.PDK15", "PDK15N", "PDK15P", "18n"),
  cmos90: singlePairProcess("CMOS90 benchmark", "modelcard.CMOS90", "N90", "P90", "90n"),
  ptm65: singlePairProcess("PTM 65 nm", "modelcard.ptm", "PTM65N", "PTM65P", "65n"),
  ptm90: singlePairProcess("PTM 90 nm", "modelcard.ptm", "PTM90N", "PTM90P", "0.09u"),
  ptm130: singlePairProcess("PTM 130 nm", "modelcard.ptm", "PTM130N", "PTM130P", "130n"),
  ptm180: singlePairProcess(
    "PTM 180 nm",
    "modelcard.ptm",
    "PTM180N",
    "PTM180P",
    "180n",
    [{ minW: 180e-9, maxW: 100e-6, minL: 180e-9, maxL: 180e-9 }],
  ),
  ptmlp16: singlePairProcess("PTM LP 16 nm", "modelcard.ptmLP", "PTMLP16N", "PTMLP16P", "16n"),
  ptmlp22: singlePairProcess("PTM LP 22 nm", "modelcard.ptmLP", "PTMLP22N", "PTMLP22P", "22n"),
  ptmlp32: singlePairProcess("PTM LP 32 nm", "modelcard.ptmLP", "PTMLP32N", "PTMLP32P", "32n"),
  ptmlp45: singlePairProcess("PTM LP 45 nm", "modelcard.ptmLP", "PTMLP45N", "PTMLP45P", "45n"),
  ptmhp16: singlePairProcess("PTM HP 16 nm", "modelcard.ptmHP", "PTMHP16N", "PTMHP16P", "16n"),
  ptmhp22: singlePairProcess("PTM HP 22 nm", "modelcard.ptmHP", "PTMHP22N", "PTMHP22P", "22n"),
  ptmhp32: singlePairProcess("PTM HP 32 nm", "modelcard.ptmHP", "PTMHP32N", "PTMHP32P", "32n"),
  ptmhp45: singlePairProcess("PTM HP 45 nm", "modelcard.ptmHP", "PTMHP45N", "PTMHP45P", "45n"),
} as const satisfies Record<string, ProcessDefinition>;

export type ProcessId = keyof typeof PROCESS_CATALOG;

export const PROCESS_IDS = Object.keys(PROCESS_CATALOG) as ProcessId[];
export const GF180_CORNERS: Gf180Corner[] = ["typical", "ff", "ss", "fs", "sf", "statistical"];

export function isProcessId(value: unknown): value is ProcessId {
  return typeof value === "string" && value in PROCESS_CATALOG;
}

export function isGf180Corner(value: unknown): value is Gf180Corner {
  return typeof value === "string" && GF180_CORNERS.includes(value as Gf180Corner);
}

export function modelsFor(processId: ProcessId, polarity: FetPolarity): readonly FetModel[] {
  return PROCESS_CATALOG[processId].models.filter((model) => model.polarity === polarity);
}

export function defaultModelFor(processId: ProcessId, polarity: FetPolarity): FetModel {
  const process = PROCESS_CATALOG[processId];
  const name = process.defaults[polarity];
  return process.models.find((model) => model.name === name)!;
}

export function compatibleModelFor(
  processId: ProcessId,
  polarity: FetPolarity,
  modelName: string | undefined,
): FetModel | undefined {
  const normalized = modelName?.toLowerCase();
  return modelsFor(processId, polarity).find((model) => model.name.toLowerCase() === normalized);
}

export function effectiveModelFor(processId: ProcessId, polarity: FetPolarity, modelName?: string): FetModel {
  return compatibleModelFor(processId, polarity, modelName) ?? defaultModelFor(processId, polarity);
}

export function modelCardFor(processId: ProcessId, corner: Gf180Corner): string {
  const base = PROCESS_CATALOG[processId].modelCard;
  return processId === "gf180" ? `${base}.${corner}` : base;
}

export function modelCardsFor(
  processId: ProcessId,
  corner: Gf180Corner,
  requiredSubcircuits: Iterable<string> = [],
): string[] {
  const cards = new Set([modelCardFor(processId, corner)]);
  if ([...requiredSubcircuits].some((model) => model.toLowerCase() === "chang90")) cards.add("modelcard.ptm");
  return [...cards];
}

export function defaultFetValue(processId: ProcessId, polarity: FetPolarity): string {
  const model = defaultModelFor(processId, polarity);
  return `${model.name} W=${model.defaultW} L=${model.defaultL}`;
}

export function parseEngineeringLength(input: string): number | undefined {
  const match = input.trim().match(/^([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?)\s*(meg|[tgkmunpf])?\s*(?:m(?:eter(?:s)?)?)?$/i);
  if (!match) return undefined;
  const value = Number(match[1]);
  if (!Number.isFinite(value)) return undefined;
  const multipliers: Record<string, number> = {
    t: 1e12, g: 1e9, meg: 1e6, k: 1e3, m: 1e-3, u: 1e-6, n: 1e-9, p: 1e-12, f: 1e-15,
  };
  const suffix = match[2]?.toLowerCase();
  return value * (suffix ? multipliers[suffix]! : 1);
}

export function formatLength(value: number): string {
  if (value >= 1e-3) return `${value / 1e-3}m`;
  if (value >= 1e-6) return `${value / 1e-6}u`;
  if (value >= 1e-9) return `${value / 1e-9}n`;
  return `${value}m`;
}

export function geometryDescription(model: FetModel): string | undefined {
  if (!model.geometry?.length) return undefined;
  const minW = Math.min(...model.geometry.map((range) => range.minW));
  const maxW = Math.max(...model.geometry.map((range) => range.maxW));
  const minL = Math.min(...model.geometry.map((range) => range.minL));
  const maxL = Math.max(...model.geometry.map((range) => range.maxL));
  return `W ${formatLength(minW)}–${formatLength(maxW)}; L ${formatLength(minL)}–${formatLength(maxL)}`;
}

export function validateGeometry(model: FetModel, width: string | undefined, length: string | undefined): string[] {
  const w = width ? parseEngineeringLength(width) : undefined;
  const l = length ? parseEngineeringLength(length) : undefined;
  const errors: string[] = [];
  if (w === undefined) errors.push("Width must be a number with an optional engineering suffix.");
  if (l === undefined) errors.push("Length must be a number with an optional engineering suffix.");
  if (w === undefined || l === undefined) return errors;
  if (!model.geometry?.length) return errors;
  const within = (value: number, min: number, max: number) => {
    const tolerance = Math.max(Math.abs(value), Math.abs(min), Math.abs(max)) * Number.EPSILON * 8;
    return value >= min - tolerance && value <= max + tolerance;
  };
  const supported = model.geometry.some((range) =>
    within(w, range.minW, range.maxW) && within(l, range.minL, range.maxL),
  );
  if (!supported) errors.push(`${model.name} requires ${geometryDescription(model)}.`);
  return errors;
}
