import {
  createSchematicEditor,
  SchematicValidationError,
  type Schematic,
  type SchematicEditor,
} from "eecircuit-schematic";
import type { EEcircuitFile } from "../types/commonTypes";
import { validateEEcircuitFile } from "./eeCircuitFileValidator";
import type { Gf180Corner, ProcessId } from "../pdk/processCatalog";

type JsonObject = Record<string, unknown>;
type Point = { x: number; y: number };
type TerminalLocation = {
  type: "terminal";
  prop: { instanceName: string; terminalName: string };
};
type JunctionLocation = {
  type: "junction";
  prop: { junctionPosition: Point };
};
type EndpointLocation = TerminalLocation | JunctionLocation;
type LegacyWire = {
  absolutePath: Point[];
  startLocation?: EndpointLocation;
  endLocation?: EndpointLocation;
  netName?: string;
};
type LegacySchematic = {
  componentInstances: Schematic["componentInstances"];
  wires: LegacyWire[];
  text?: Schematic["text"];
};

export type V1ConversionResult =
  | { success: true; file: EEcircuitFile; notes: string[] }
  | { success: false; errors: string[] };

const isRecord = (value: unknown): value is JsonObject =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const isEEcircuitV1 = (value: unknown): value is JsonObject & { schema: "EEcircuitV1" } =>
  isRecord(value) && value.schema === "EEcircuitV1";

export const isEEcircuitV2WithoutProcess = (value: unknown): value is JsonObject & { schema: "EEcircuitV2" } =>
  isRecord(value) && value.schema === "EEcircuitV2" && value.processId === undefined;

const processMetadata = (processId: ProcessId, gf180Corner: Gf180Corner) => ({
  processId,
  ...(processId === "gf180" ? { gf180Corner } : {}),
});

export function assignPdkToEEcircuitV2(
  value: unknown,
  processId: ProcessId,
  gf180Corner: Gf180Corner,
): V1ConversionResult {
  if (!isEEcircuitV2WithoutProcess(value)) {
    return { success: false, errors: ["The selected file is not an EEcircuitV2 document without process metadata."] };
  }
  const validation = validateEEcircuitFile({ ...structuredClone(value), ...processMetadata(processId, gf180Corner) });
  return validation.valid
    ? { success: true, file: validation.file, notes: [`Assigned ${processId} as the circuit process.`] }
    : { success: false, errors: [validation.error] };
}

const isPoint = (value: unknown): value is Point =>
  isRecord(value) && typeof value.x === "number" && Number.isFinite(value.x) &&
  typeof value.y === "number" && Number.isFinite(value.y);

const pointKey = (point: Point): string => `${point.x},${point.y}`;

const normalizeCoordinate = (value: unknown): unknown => {
  if (typeof value !== "number" || !Number.isFinite(value)) return value;
  const integer = Math.round(value);
  return Math.abs(value - integer) < 1e-9 ? integer : value;
};

const normalizePoint = (value: unknown): unknown => {
  if (!isRecord(value)) return value;
  return { ...value, x: normalizeCoordinate(value.x), y: normalizeCoordinate(value.y) };
};

const normalizeLegacySchematic = (value: unknown): unknown => {
  if (!isRecord(value)) return value;
  const schematic = structuredClone(value);
  if (!Array.isArray(schematic.wires)) return schematic;
  schematic.wires = schematic.wires.map((rawWire) => {
    if (!isRecord(rawWire)) return rawWire;
    const wire = { ...rawWire };
    if (Array.isArray(wire.absolutePath)) wire.absolutePath = wire.absolutePath.map(normalizePoint);
    for (const side of ["startLocation", "endLocation"] as const) {
      const location = wire[side];
      if (!isRecord(location) || location.type !== "junction" || !isRecord(location.prop)) continue;
      wire[side] = {
        ...location,
        prop: { ...location.prop, junctionPosition: normalizePoint(location.prop.junctionPosition) },
      };
    }
    return wire;
  });
  return schematic;
};

const parseLegacySchematic = (value: unknown): LegacySchematic | null => {
  if (!isRecord(value) || !Array.isArray(value.componentInstances) || !Array.isArray(value.wires)) return null;
  if (value.componentInstances.length > 100_000 || value.wires.length > 100_000) return null;
  return value as unknown as LegacySchematic;
};

const formatError = (error: unknown): string[] => {
  if (error instanceof SchematicValidationError) {
    return error.issues.map((issue) => `${issue.path}: ${issue.message}`);
  }
  return [error instanceof Error ? error.message : String(error)];
};

const createTemporaryCanvas = (): HTMLCanvasElement => {
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 480;
  Object.assign(canvas.style, {
    position: "fixed",
    left: "-10000px",
    top: "0",
    width: "640px",
    height: "480px",
    opacity: "0",
    pointerEvents: "none",
  });
  canvas.setAttribute("aria-hidden", "true");
  document.body.append(canvas);
  return canvas;
};

/** Convert an obsolete V1 document without changing the active application state. */
export async function convertEEcircuitV1ToV2(
  value: unknown,
  processId: ProcessId,
  gf180Corner: Gf180Corner,
): Promise<V1ConversionResult> {
  if (!isEEcircuitV1(value)) {
    return { success: false, errors: ["The selected file is not an EEcircuitV1 document."] };
  }

  const metadataCandidate: JsonObject = { schema: "EEcircuitV2", ...processMetadata(processId, gf180Corner) };
  for (const field of ["title", "description", "date", "simulations"] as const) {
    if (value[field] !== undefined) metadataCandidate[field] = structuredClone(value[field]);
  }
  const metadataValidation = validateEEcircuitFile(metadataCandidate);
  if (!metadataValidation.valid) return { success: false, errors: [metadataValidation.error] };

  if (value.schematic === undefined) {
    return {
      success: true,
      file: metadataValidation.file,
      notes: ["Converted the configuration-only document to EEcircuitV2."],
    };
  }

  const normalized = normalizeLegacySchematic(value.schematic);
  const structuralValidation = validateEEcircuitFile({ ...metadataCandidate, schematic: normalized });
  if (!structuralValidation.valid) return { success: false, errors: [structuralValidation.error] };
  const schematic = parseLegacySchematic(normalized);
  if (!schematic) return { success: false, errors: ["The V1 schematic field is malformed."] };

  const canvas = createTemporaryCanvas();
  let editor: SchematicEditor | undefined;
  try {
    editor = await createSchematicEditor({
      canvas,
      initialSchematic: { componentInstances: schematic.componentInstances, wires: [] },
    });
    const snapshot = await editor.getSnapshot();
    const terminalsAt = new Map<string, TerminalLocation[]>();
    for (const instance of snapshot.instances) {
      for (const terminal of instance.terminalsComputed) {
        const location: TerminalLocation = {
          type: "terminal",
          prop: { instanceName: instance.name, terminalName: terminal.name },
        };
        const key = pointKey(terminal.position);
        const matches = terminalsAt.get(key) ?? [];
        matches.push(location);
        terminalsAt.set(key, matches);
      }
    }

    const junctionsAt = new Map<string, JunctionLocation>();
    for (const wire of schematic.wires) {
      for (const location of [wire.startLocation, wire.endLocation]) {
        if (isRecord(location) && location.type === "junction" && isRecord(location.prop) &&
          isPoint(location.prop.junctionPosition)) {
          const junction: JunctionLocation = {
            type: "junction",
            prop: { junctionPosition: location.prop.junctionPosition },
          };
          junctionsAt.set(pointKey(junction.prop.junctionPosition), structuredClone(junction));
        }
      }
    }

    const notes: string[] = [];
    const errors: string[] = [];
    const convertedWires = schematic.wires.map((wire, wireIndex) => {
      const converted = structuredClone(wire);
      for (const [side, pathIndex] of [["startLocation", 0], ["endLocation", converted.absolutePath.length - 1]] as const) {
        if (converted[side] !== undefined) continue;
        const endpoint = converted.absolutePath[pathIndex];
        if (!endpoint) continue;
        const terminalMatches = terminalsAt.get(pointKey(endpoint)) ?? [];
        const junctionMatch = junctionsAt.get(pointKey(endpoint));
        const matchCount = terminalMatches.length + (junctionMatch ? 1 : 0);
        const endpointName = `wire ${wireIndex + 1} ${side === "startLocation" ? "start" : "end"}`;
        if (matchCount > 1) {
          errors.push(`${endpointName} at (${endpoint.x}, ${endpoint.y}) matches more than one connection.`);
        } else if (terminalMatches.length === 1) {
          converted[side] = structuredClone(terminalMatches[0]);
          notes.push(`Connected ${endpointName} to ${terminalMatches[0]!.prop.instanceName}.${terminalMatches[0]!.prop.terminalName}.`);
        } else if (junctionMatch) {
          converted[side] = structuredClone(junctionMatch);
          notes.push(`Connected ${endpointName} to the junction at (${endpoint.x}, ${endpoint.y}).`);
        } else {
          notes.push(`Left ${endpointName} floating.`);
        }
      }
      return converted;
    });
    if (errors.length) return { success: false, errors };

    const convertedSchematic: Schematic = {
      componentInstances: schematic.componentInstances,
      wires: convertedWires,
      ...(schematic.text === undefined ? {} : { text: schematic.text }),
    };
    await editor.loadSchematic(convertedSchematic);
    const canonicalSchematic = await editor.getSchematic();
    const candidate = { ...metadataCandidate, schematic: canonicalSchematic };
    const validation = validateEEcircuitFile(candidate);
    if (!validation.valid) return { success: false, errors: [validation.error] };
    return { success: true, file: validation.file, notes };
  } catch (error) {
    return { success: false, errors: formatError(error) };
  } finally {
    await editor?.destroy().catch(() => undefined);
    canvas.remove();
  }
}
