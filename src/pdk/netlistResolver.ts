import type { Schematic } from "eecircuit-schematic";
import { parseComponentProperties } from "../types/componentTypes";
import {
  compatibleModelFor,
  PROCESS_CATALOG,
  type FetPolarity,
  type ProcessId,
  validateGeometry,
} from "./processCatalog";

const engineSubcircuitModels = new Set(
  Object.values(PROCESS_CATALOG).flatMap((process) =>
    process.models
      .filter((model) => model.invocation === "subcircuit")
      .map((model) => model.name.toLowerCase()),
  ),
);

export type PdkResolution = {
  netlist: string;
  componentNameMap: ReadonlyMap<string, string>;
  subcircuitComponents: ReadonlySet<string>;
  currentProbeMap: ReadonlyMap<string, string>;
  geometryErrors: string[];
  compatibilityErrors: string[];
};

export type CurrentProbeRequest = { componentName: string; terminalName: string };

const probeKey = (componentName: string, terminalName: string) =>
  `${componentName.toUpperCase()}:${terminalName.toUpperCase()}`;

function spiceIdentifier(value: string): string {
  return value.replace(/[^a-z0-9_]/gi, "_");
}

function fetInstances(schematic: Schematic | undefined) {
  const instances = new Map<string, { name: string; polarity: FetPolarity; value?: string }>();
  for (const instance of schematic?.componentInstances ?? []) {
    if (instance.typeName !== "nFET" && instance.typeName !== "pFET") continue;
    instances.set(instance.name.toUpperCase(), {
      name: instance.name,
      polarity: instance.typeName === "nFET" ? "n" : "p",
      value: instance.value,
    });
  }
  return instances;
}

export function resolvePdkNetlist(
  netlist: string,
  schematic: Schematic | undefined,
  processId: ProcessId,
  currentProbes: readonly CurrentProbeRequest[] = [],
): PdkResolution {
  const instances = fetInstances(schematic);
  const componentNameMap = new Map<string, string>();
  const subcircuitComponents = new Set<string>();
  const currentProbeMap = new Map<string, string>();
  const geometryErrors: string[] = [];
  const compatibilityErrors: string[] = [];
  const requestedTerminals = new Map<string, Set<string>>();
  for (const probe of currentProbes) {
    const component = probe.componentName.toUpperCase();
    const terminals = requestedTerminals.get(component) ?? new Set<string>();
    terminals.add(probe.terminalName.toUpperCase());
    requestedTerminals.set(component, terminals);
  }

  const resolvedLines = netlist.split("\n").map((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("*") || trimmed.startsWith(".")) return line;
    const tokens = trimmed.split(/\s+/);
    const instance = instances.get(tokens[0]?.toUpperCase() ?? "");
    if (!instance || tokens.length < 6) return line;

    const type = instance.polarity === "n" ? "nFET" : "pFET";
    const properties = parseComponentProperties(type, instance.value ?? "");
    const storedModel = "model" in properties ? properties.model : undefined;
    const model = compatibleModelFor(processId, instance.polarity, storedModel);
    if (!model) {
      compatibilityErrors.push(`${instance.name}: ${storedModel || "missing transistor model"} is outside ${PROCESS_CATALOG[processId].label}.`);
      componentNameMap.set(instance.name.toUpperCase(), tokens[0]!);
      return line;
    }
    const generatedName = model.invocation === "subcircuit" ? `X${tokens[0]}` : tokens[0]!;
    const instanceKey = instance.name.toUpperCase();
    const sensorLines: string[] = [];
    if (model.invocation === "subcircuit") {
      subcircuitComponents.add(instanceKey);
      const terminals = requestedTerminals.get(instanceKey);
      for (const [terminal, nodeIndex] of [["D", 1], ["G", 2], ["S", 3], ["B", 4]] as const) {
        if (!terminals?.has(terminal)) continue;
        const externalNode = tokens[nodeIndex];
        if (!externalNode) continue;
        const suffix = `${spiceIdentifier(instance.name)}_${terminal}`;
        const internalNode = `__pdk_${suffix}`;
        const sensorName = `VPDK_${suffix}`;
        tokens[nodeIndex] = internalNode;
        sensorLines.push(`${sensorName} ${externalNode} ${internalNode} 0`);
        currentProbeMap.set(probeKey(instance.name, terminal), `I(${sensorName},1)`);
      }
    }
    tokens[0] = generatedName;
    tokens[5] = model.name;
    componentNameMap.set(instance.name.toUpperCase(), generatedName);

    const errors = validateGeometry(
      model,
      "W" in properties ? properties.W : undefined,
      "L" in properties ? properties.L : undefined,
    );
    geometryErrors.push(...errors.map((error) => `${instance.name}: ${error}`));
    return [...sensorLines, tokens.join(" ")].join("\n");
  });

  return {
    netlist: resolvedLines.join("\n"),
    componentNameMap,
    subcircuitComponents,
    currentProbeMap,
    geometryErrors,
    compatibilityErrors,
  };
}

export function currentProbeExpression(
  resolution: PdkResolution,
  componentName: string,
  terminalName: string,
): string {
  const key = componentName.toUpperCase();
  const mappedProbe = resolution.currentProbeMap.get(probeKey(componentName, terminalName));
  if (mappedProbe) return mappedProbe;
  const generatedName = resolution.componentNameMap.get(key) ?? componentName;
  if (resolution.subcircuitComponents.has(key) && terminalName.toUpperCase() === "D") {
    return `@m.${generatedName.toLowerCase()}.m0[id]`;
  }
  return `I(${generatedName},${terminalName})`;
}

export function isEngineProvidedSubcircuit(modelName: string): boolean {
  const normalized = modelName.toLowerCase();
  return engineSubcircuitModels.has(normalized);
}
