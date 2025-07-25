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
  start: string;
  stop: string;
  step: string;
};

export type SimulationAC = {
  type: "AC";
  source: string;
  frequencyStart: string;
  frequencyStop: string;
  stepNumber: string;
  sweepType: "dec" | "oct" | "lin";
};

export type SimulationTransient = {
  type: "Transient";
  stopTime: string;
  timeStep: string;
  initialConditions?: boolean;
};

export type SimulationNone = {
  type: "None";
};

export type SimulationType =
  | SimulationNone
  | SimulationDC
  | SimulationAC
  | SimulationTransient;

export type ToBePlotted = {
  type: "voltage" | "current";
  name: string;
};
