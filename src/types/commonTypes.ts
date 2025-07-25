import { Schematic } from "eecircuit-schematic";

export type EEcircuitFile = {
  schema: "EEcircuitV1";
  title?: string;
  description?: string;
  date?: string;
  schematic?: Schematic;
  simulations?: SimulationType[];
};

export type SimulationDC = {
  name?: string;
  type: "DC";
  source: string;
  start: string;
  stop: string;
  step: string;
};

export type SimulationAC = {
  name?: string;
  type: "AC";
  source: string;
  frequencyStart: string;
  frequencyStop: string;
  stepNumber: string;
  sweepType: "dec" | "oct" | "lin";
};

export type SimulationTransient = {
  name?: string;
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
