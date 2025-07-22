import { Schematic } from "eecircuit-schematic";

export type EEcircuitFile = {
  schema: "EEcircuitV1";
  title?: string;
  description?: string;
  date?: string;
  schematic?: Schematic;
  simulation?: SimulationType;
};

export type SimulationDC = {
  type: "DC";
  source: string;
  start: number;
  stop: number;
  step: number;
};

export type SimulationAC = {
  type: "AC";
  source: string;
  frequencyStart: number;
  frequencyStop: number;
  frequencyStep: number;
  sweepType: "lin" | "log" | "dec";
};

export type SimulationTransient = {
  type: "Transient";
  stopTime: number;
  timeStep: number;
  initialConditions?: boolean;
};

export type SimulationType = SimulationDC | SimulationAC | SimulationTransient;
