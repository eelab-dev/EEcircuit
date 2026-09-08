import { chang90 } from "../Simulate/subcircuits/chang90";
import { gf180Opamp3p3 } from "../Simulate/subcircuits/gf180Opamp3p3";
import type { ProcessId } from "./processCatalog";

export type OpampDefinition = {
  model: string;
  label: string;
  processId: ProcessId;
  definition: string;
  description: string;
};

export const OPAMP_DEFINITIONS: readonly OpampDefinition[] = [
  {
    model: "chang90",
    label: "PTM90 Opamp",
    processId: "ptm90",
    definition: chang90,
    description: "PTM 90 nm transistor-level opamp",
  },
  {
    model: "gf180_opamp_3p3",
    label: "GF180 3.3 V Opamp",
    processId: "gf180",
    definition: gf180Opamp3p3,
    description: "GF180 3.3 V amplifier with six fixed ideal internal bias sources",
  },
];

const definitionsByModel = new Map(
  OPAMP_DEFINITIONS.map((definition) => [definition.model.toLowerCase(), definition]),
);

export function opampDefinitionForModel(model: string | undefined): OpampDefinition | undefined {
  return model ? definitionsByModel.get(model.trim().toLowerCase()) : undefined;
}

export function opampDefinitionsForProcess(processId: ProcessId): readonly OpampDefinition[] {
  return OPAMP_DEFINITIONS.filter((definition) => definition.processId === processId);
}

export function defaultOpampModelForProcess(processId: ProcessId): string | undefined {
  return opampDefinitionsForProcess(processId)[0]?.model;
}

export function isOpampSupportedForProcess(processId: ProcessId): boolean {
  return opampDefinitionsForProcess(processId).length > 0;
}

export function builtinSubcircuitDefinition(model: string): string | undefined {
  return opampDefinitionForModel(model)?.definition;
}
