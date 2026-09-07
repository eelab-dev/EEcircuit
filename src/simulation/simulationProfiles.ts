import type { SimulationType } from "../types/commonTypes";

export type SimulationConfig = Exclude<SimulationType, { type: "None" }>;
export type SimulationConfigType = SimulationConfig["type"];

export const simulationConfigTypes: SimulationConfigType[] = ["DC", "AC", "Transient", "Noise"];

const normalizedName = (name: string): string => name.trim().toLowerCase();

export function isSimulationConfigComplete(config: SimulationType): config is SimulationConfig {
  if (config.type === "None") return false;
  if (config.type === "DC") return !!(config.source.trim() && config.start.trim() && config.stop.trim() && config.step.trim());
  if (config.type === "AC") return !!(config.source.trim() && config.frequencyStart.trim() && config.frequencyStop.trim() && config.stepNumber.trim());
  if (config.type === "Transient") return !!(config.stopTime.trim() && config.timeStep.trim());
  return !!(config.netName.trim() && config.source.trim() && config.steps.trim() && config.startFreq.trim() && config.stopFreq.trim());
}

export function areSimulationConfigsEqual(left: SimulationType, right: SimulationType): boolean {
  if (left.type !== right.type) return false;
  if (left.type === "None" || right.type === "None") return true;
  if (left.name !== right.name) return false;
  if (left.type === "DC" && right.type === "DC") {
    return left.source === right.source && left.start === right.start && left.stop === right.stop && left.step === right.step;
  }
  if (left.type === "AC" && right.type === "AC") {
    return left.source === right.source && left.frequencyStart === right.frequencyStart &&
      left.frequencyStop === right.frequencyStop && left.stepNumber === right.stepNumber && left.sweepType === right.sweepType;
  }
  if (left.type === "Transient" && right.type === "Transient") {
    return left.stopTime === right.stopTime && left.timeStep === right.timeStep &&
      (left.initialConditions ?? false) === (right.initialConditions ?? false);
  }
  if (left.type === "Noise" && right.type === "Noise") {
    return left.netName === right.netName && left.source === right.source && left.steps === right.steps &&
      left.startFreq === right.startFreq && left.stopFreq === right.stopFreq && left.sweepType === right.sweepType;
  }
  return false;
}

export function isSimulationConfigNameAvailable(
  name: string,
  configs: readonly SimulationType[],
  ignoredIndex = -1,
): boolean {
  const candidate = normalizedName(name);
  if (!candidate) return false;
  return !configs.some((config, index) =>
    index !== ignoredIndex && config.type !== "None" && normalizedName(config.name ?? "") === candidate
  );
}

export function generateSimulationConfigName(
  type: SimulationConfigType,
  configs: readonly SimulationType[],
): string {
  let counter = 1;
  while (!isSimulationConfigNameAvailable(`${type}-${counter}`, configs)) counter += 1;
  return `${type}-${counter}`;
}

export function createEmptySimulationConfig(
  type: SimulationConfigType,
  configs: readonly SimulationType[] = [],
  requestedName?: string,
): SimulationConfig {
  const name = requestedName?.trim() || generateSimulationConfigName(type, configs);
  if (type === "DC") return { type, name, source: "", start: "", stop: "", step: "" };
  if (type === "AC") return { type, name, source: "", frequencyStart: "", frequencyStop: "", stepNumber: "", sweepType: "dec" };
  if (type === "Transient") return { type, name, stopTime: "", timeStep: "", initialConditions: false };
  return { type, name, netName: "", source: "", steps: "", startFreq: "", stopFreq: "", sweepType: "dec" };
}

export function simulationCommandFor(config: SimulationType): string {
  if (config.type === "DC") return `.dc ${config.source} ${config.start} ${config.stop} ${config.step}`;
  if (config.type === "AC") return `.ac ${config.sweepType} ${config.stepNumber} ${config.frequencyStart} ${config.frequencyStop}`;
  if (config.type === "Transient") return `.tran ${config.timeStep} ${config.stopTime}`;
  if (config.type === "Noise") return `.noise v(${config.netName}) ${config.source} ${config.sweepType} ${config.steps} ${config.startFreq} ${config.stopFreq}`;
  return "";
}

export function normalizeSimulationConfigs(configs: readonly SimulationType[]): SimulationConfig[] {
  const normalized: SimulationConfig[] = [];
  for (const config of configs) {
    if (config.type === "None") continue;
    const requestedName = config.name?.trim();
    const name = requestedName && isSimulationConfigNameAvailable(requestedName, normalized)
      ? requestedName
      : generateSimulationConfigName(config.type, normalized);
    normalized.push({ ...config, name } as SimulationConfig);
  }
  return normalized;
}

export function createDemoSimulationConfigs(): SimulationConfig[] {
  return [
    { type: "DC", name: "DC-1", source: "vin", start: "0", stop: "1.8", step: "0.01" },
    { type: "Transient", name: "Transient-1", stopTime: "10m", timeStep: "10u", initialConditions: false },
  ];
}
