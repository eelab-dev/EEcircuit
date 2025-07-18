import { Schematic } from "eecircuit-schematic";

export type EEcircuitFile = {
  schema: "EEcircuitV1";
  title?: string;
  description?: string;
  date?: string;
  schematic?: Schematic;
};
