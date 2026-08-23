import type { EEcircuitFile, SimulationType } from "../types/commonTypes";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const isString = (value: unknown): value is string => typeof value === "string";
const hasStrings = (value: Record<string, unknown>, fields: string[]): boolean =>
  fields.every((field) => isString(value[field]));

const isFinitePoint = (value: unknown): boolean =>
  isRecord(value) && typeof value.x === "number" && typeof value.y === "number" &&
  Number.isFinite(value.x) && Number.isFinite(value.y);

function isSchematic(value: unknown): boolean {
  if (!isRecord(value)) return false;
  const instances = value.componentInstances;
  const wires = value.wires;
  if (!Array.isArray(instances) || !Array.isArray(wires)) return false;
  if (instances.length > 100_000 || wires.length > 100_000) return false;
  if (!instances.every(isRecord)) return false;
  if (!wires.every((wire) => {
    if (!isRecord(wire) || !Array.isArray(wire.absolutePath)) return false;
    return wire.absolutePath.every(isFinitePoint);
  })) return false;
  return value.text === undefined ||
    (Array.isArray(value.text) && value.text.length <= 100_000 && value.text.every(isRecord));
}

function isSimulation(value: unknown): value is SimulationType {
  if (!isRecord(value) || !isString(value.type)) return false;
  if (value.type === "None") return true;
  if (value.type === "DC") return hasStrings(value, ["source", "start", "stop", "step"]);
  if (value.type === "AC") return hasStrings(value, ["source", "frequencyStart", "frequencyStop", "stepNumber"])
    && ["dec", "oct", "lin"].includes(String(value.sweepType));
  if (value.type === "Transient") return hasStrings(value, ["stopTime", "timeStep"])
    && (value.initialConditions === undefined || typeof value.initialConditions === "boolean");
  if (value.type === "Noise") return hasStrings(value, ["netName", "source", "steps", "startFreq", "stopFreq"])
    && ["dec", "oct", "lin"].includes(String(value.sweepType));
  return false;
}

export function validateEEcircuitFile(value: unknown): { valid: true; file: EEcircuitFile } | { valid: false; error: string } {
  if (!isRecord(value) || value.schema !== "EEcircuitV1") {
    return { valid: false, error: "The file is not an EEcircuitV1 document." };
  }
  for (const field of ["title", "description", "date"]) {
    if (value[field] !== undefined && !isString(value[field])) {
      return { valid: false, error: `The ${field} field must be text.` };
    }
  }
  if (value.schematic !== undefined && !isSchematic(value.schematic)) {
    return { valid: false, error: "The schematic field is malformed." };
  }
  if (value.simulations !== undefined) {
    if (!Array.isArray(value.simulations) || value.simulations.length > 100) {
      return { valid: false, error: "The simulations field must contain at most 100 configurations." };
    }
    if (!value.simulations.every(isSimulation)) {
      return { valid: false, error: "One or more simulation configurations are malformed." };
    }
  }
  return { valid: true, file: value as unknown as EEcircuitFile };
}
