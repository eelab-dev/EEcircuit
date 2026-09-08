import type { Schematic } from "eecircuit-schematic";
import { parseComponentProperties } from "../types/componentTypes";
import {
  compatibleModelFor,
  PROCESS_CATALOG,
  PROCESS_IDS,
  validateGeometry,
  type FetPolarity,
  type ProcessId,
} from "./processCatalog";
import {
  defaultOpampModelForProcess,
  isOpampSupportedForProcess,
  opampDefinitionForModel,
} from "./opampRegistry";

export type PdkRequirement = {
  componentName: string;
  requiredProcess: ProcessId;
  reason: string;
};

const modelProcesses = new Map<string, ProcessId>();
for (const processId of PROCESS_IDS) {
  for (const model of PROCESS_CATALOG[processId].models) {
    modelProcesses.set(model.name.toLowerCase(), processId);
  }
}

export function requiredProcessForModel(modelName: string | undefined): ProcessId | undefined {
  return modelName ? modelProcesses.get(modelName.toLowerCase()) : undefined;
}

export function requiredProcessForComponentType(
  typeName: string,
  value?: string,
): ProcessId | undefined {
  if (typeName.toUpperCase() !== "OPAMP90") return undefined;
  // Empty values in older schematic documents used the symbol's chang90 default.
  return opampDefinitionForModel(value?.trim() || "chang90")?.processId;
}

export function isComponentTypeSupportedForProcess(typeName: string, processId: ProcessId): boolean {
  return typeName.toUpperCase() !== "OPAMP90" || isOpampSupportedForProcess(processId);
}

export function defaultComponentValueForProcess(typeName: string, processId: ProcessId): string | undefined {
  return typeName.toUpperCase() === "OPAMP90" ? defaultOpampModelForProcess(processId) : undefined;
}

export function schematicPdkRequirements(schematic: Schematic | undefined): PdkRequirement[] {
  const requirements: PdkRequirement[] = [];
  for (const instance of schematic?.componentInstances ?? []) {
    const componentProcess = requiredProcessForComponentType(instance.typeName, instance.value);
    if (componentProcess) {
      requirements.push({
        componentName: instance.name,
        requiredProcess: componentProcess,
        reason: `${instance.value?.trim() || "chang90"} requires ${PROCESS_CATALOG[componentProcess].label}`,
      });
      continue;
    }
    if (instance.typeName !== "nFET" && instance.typeName !== "pFET") continue;
    const properties = parseComponentProperties(instance.typeName, instance.value ?? "");
    const model = "model" in properties ? properties.model : undefined;
    const modelProcess = requiredProcessForModel(model);
    if (modelProcess) {
      requirements.push({
        componentName: instance.name,
        requiredProcess: modelProcess,
        reason: `${model} belongs to ${PROCESS_CATALOG[modelProcess].label}`,
      });
    }
  }
  return requirements;
}

export function inferSchematicProcess(schematic: Schematic | undefined): ProcessId | undefined {
  const processes = new Set(schematicPdkRequirements(schematic).map((item) => item.requiredProcess));
  return processes.size === 1 ? [...processes][0] : undefined;
}

export function circuitCompatibilityErrors(
  schematic: Schematic | undefined,
  processId: ProcessId,
  manualNetlist = "",
): string[] {
  const errors = schematicPdkRequirements(schematic)
    .filter((item) => item.requiredProcess !== processId)
    .map((item) => `${item.componentName}: ${item.reason}; circuit uses ${PROCESS_CATALOG[processId].label}.`);

  for (const instance of schematic?.componentInstances ?? []) {
    if (instance.typeName.toUpperCase() !== "OPAMP90") continue;
    const modelName = instance.value?.trim() || "chang90";
    if (!opampDefinitionForModel(modelName)) {
      errors.push(`${instance.name}: unknown opamp model ${modelName}.`);
    }
  }

  for (const instance of schematic?.componentInstances ?? []) {
    if (instance.typeName !== "nFET" && instance.typeName !== "pFET") continue;
    const polarity: FetPolarity = instance.typeName === "nFET" ? "n" : "p";
    const properties = parseComponentProperties(instance.typeName, instance.value ?? "");
    const modelName = "model" in properties ? properties.model : undefined;
    const model = compatibleModelFor(processId, polarity, modelName);
    if (!model) {
      const modelProcess = requiredProcessForModel(modelName);
      if (!modelProcess) {
        errors.push(`${instance.name}: unknown transistor model ${modelName || "(missing)"}.`);
      } else if (modelProcess === processId) {
        errors.push(`${instance.name}: ${modelName} is not a valid ${polarity === "n" ? "NMOS" : "PMOS"} model.`);
      }
      continue;
    }
    errors.push(...validateGeometry(
      model,
      "W" in properties ? properties.W : undefined,
      "L" in properties ? properties.L : undefined,
    ).map((message) => `${instance.name}: ${message}`));
  }

  const seenManual = new Set<string>();
  for (const rawLine of manualNetlist.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("*") || line.startsWith(".")) continue;
    for (const token of line.split(/\s+/)) {
      const requiredProcess = opampDefinitionForModel(token)?.processId ?? requiredProcessForModel(token);
      if (!requiredProcess || requiredProcess === processId) continue;
      const message = `${token} requires ${PROCESS_CATALOG[requiredProcess].label}; circuit uses ${PROCESS_CATALOG[processId].label}.`;
      if (!seenManual.has(message)) {
        errors.push(message);
        seenManual.add(message);
      }
    }
  }
  return [...new Set(errors)];
}
