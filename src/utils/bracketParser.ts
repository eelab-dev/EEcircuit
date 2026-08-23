import { normalizeUnit } from "./unitCorrection";

export const MAX_BRACKET_VALUES = 1000;

const UNIT_FACTORS: Record<string, number> = {
  Meg: 1e6, G: 1e9, T: 1e12, M: 1e6, k: 1e3, m: 1e-3,
  u: 1e-6, n: 1e-9, p: 1e-12, f: 1e-15, a: 1e-18,
};

export interface BracketOperation {
  start: number;
  step: number;
  stop: number;
  unit?: string;
  originalText: string;
  position: number;
  startScale?: number;
  stepScale?: number;
  stopScale?: number;
}

export interface ParseResult {
  hasBracketOperation: boolean;
  bracketOperation?: BracketOperation;
  values?: string[];
}

const UNIT_PATTERN = "Meg|u|m|M|k|G|T|p|n|f|a";
export const BRACKET_REGEX = new RegExp(
  `\\[(-?\\d+(?:\\.\\d+)?)(?:(${UNIT_PATTERN}))?\\s*:\\s*(-?\\d+(?:\\.\\d+)?)(?:(${UNIT_PATTERN}))?\\s*:\\s*(-?\\d+(?:\\.\\d+)?)(?:(${UNIT_PATTERN}))?\\](?:\\s*(${UNIT_PATTERN}))?`
);

function scaleFor(unit: string | undefined): number {
  if (!unit) return 1;
  const normalized = normalizeUnit(unit) ?? unit;
  return UNIT_FACTORS[normalized] ?? 1;
}

function formatNumber(value: number): string {
  if (Object.is(value, -0)) return "0";
  return Number(value.toPrecision(15)).toString();
}

function generateValues(start: number, step: number, stop: number): number[] {
  if (![start, step, stop].every(Number.isFinite)) {
    throw new Error("Bracket values must be finite numbers");
  }
  if (step === 0) throw new Error("Step size cannot be zero");
  if ((step > 0 && start > stop) || (step < 0 && start < stop)) {
    throw new Error("Step direction does not reach the stop value");
  }
  const count = Math.floor(Math.abs((stop - start) / step) + 1e-12) + 1;
  if (!Number.isSafeInteger(count) || count > MAX_BRACKET_VALUES) {
    throw new Error(`Bracket operation would generate more than ${MAX_BRACKET_VALUES} values`);
  }
  return Array.from({ length: count }, (_, index) => {
    const value = start + index * step;
    return Math.abs(value - stop) < Math.abs(step) * 1e-10 ? stop : value;
  });
}

export function findFirstBracketOperation(netlist: string): BracketOperation | null {
  const match = netlist.match(BRACKET_REGEX);
  if (!match) return null;
  const [fullMatch, startStr, startUnit, stepStr, stepUnit, stopStr, stopUnit, externalUnit] = match;
  const start = Number(startStr);
  const step = Number(stepStr);
  const stop = Number(stopStr);
  if (![start, step, stop].every(Number.isFinite)) {
    throw new Error(`Invalid bracket operation: ${fullMatch}`);
  }

  const units = [normalizeUnit(startUnit), normalizeUnit(stepUnit), normalizeUnit(stopUnit)].filter(Boolean);
  const sameEmbeddedUnit = units.length > 0 && units.every((unit) => unit === units[0]);
  const outputUnit = normalizeUnit(externalUnit) || (sameEmbeddedUnit ? units[0] : undefined);
  return {
    start,
    step,
    stop,
    unit: outputUnit,
    originalText: fullMatch,
    position: match.index ?? 0,
    startScale: scaleFor(startUnit || externalUnit),
    stepScale: scaleFor(stepUnit || externalUnit),
    stopScale: scaleFor(stopUnit || externalUnit),
  };
}

export function parseBracketOperation(netlist: string): ParseResult {
  try {
    const bracketOperation = findFirstBracketOperation(netlist);
    if (!bracketOperation) return { hasBracketOperation: false };
    const embeddedUnits = [bracketOperation.startScale, bracketOperation.stepScale, bracketOperation.stopScale];
    const useBaseUnits = !bracketOperation.unit || new Set(embeddedUnits).size > 1;
    const start = useBaseUnits ? bracketOperation.start * (bracketOperation.startScale ?? 1) : bracketOperation.start;
    const step = useBaseUnits ? bracketOperation.step * (bracketOperation.stepScale ?? 1) : bracketOperation.step;
    const stop = useBaseUnits ? bracketOperation.stop * (bracketOperation.stopScale ?? 1) : bracketOperation.stop;
    const values = generateValues(start, step, stop).map(
      (value) => `${formatNumber(value)}${bracketOperation.unit ?? ""}`
    );
    return { hasBracketOperation: true, bracketOperation, values };
  } catch (error) {
    throw new Error(
      `Failed to parse bracket operation: ${error instanceof Error ? error.message : "Unknown error"}`,
      { cause: error }
    );
  }
}

export function validateBracketOperation(netlist: string): { isValid: boolean; error?: string } {
  try {
    parseBracketOperation(netlist);
    return { isValid: true };
  } catch (error) {
    return { isValid: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}
