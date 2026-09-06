import type { Schematic } from "eecircuit-schematic";
import { defaultFetValue, type ProcessId } from "../pdk/processCatalog";

// Raw v2 representation of the original eecircuit-schematic demo: a
// common-source NMOS amplifier with a resistive drain load and sine input.
export const demoSchematic: Schematic = {
  componentInstances: [
    { typeName: "resistor", name: "R1", value: "100k", origin: { x: 0, y: 13 }, rotation: "90", flip: "none" },
    { typeName: "nFET", name: "M1", value: "nmos_3p3 W=1u L=0.28u", origin: { x: 0, y: 0 }, rotation: "0", flip: "none" },
    { typeName: "VDD", name: "VDD1", value: "1V", origin: { x: 0, y: 20 }, rotation: "0", flip: "none" },
    { typeName: "GND", name: "GND1", origin: { x: 0, y: -14 }, rotation: "0", flip: "none" },
    { typeName: "GND", name: "GND2", origin: { x: -15, y: -14 }, rotation: "0", flip: "none" },
    { typeName: "vdc", name: "Vsup", value: "1.8", origin: { x: 17, y: 1 }, rotation: "0", flip: "none" },
    { typeName: "VDD", name: "8", value: "", origin: { x: 17, y: 9 }, rotation: "0", flip: "none" },
    { typeName: "GND", name: "9", value: "", origin: { x: 17, y: -8 }, rotation: "0", flip: "none" },
    { typeName: "vsin", name: "vin", value: "SIN (0.9 0.1 1k)", origin: { x: -15, y: -7 }, rotation: "0", flip: "none" },
  ],
  wires: [
    {
      absolutePath: [{ x: -15, y: -3 }, { x: -15, y: 0 }, { x: -5, y: 0 }],
      startLocation: { type: "terminal", prop: { instanceName: "vin", terminalName: "pos" } },
      endLocation: { type: "terminal", prop: { instanceName: "M1", terminalName: "G" } },
      netName: "input",
    },
    {
      absolutePath: [{ x: 0, y: 5 }, { x: 0, y: 8 }],
      startLocation: { type: "terminal", prop: { instanceName: "M1", terminalName: "D" } },
      endLocation: { type: "terminal", prop: { instanceName: "R1", terminalName: "2" } },
      netName: "output",
    },
    {
      absolutePath: [{ x: 0, y: 18 }, { x: 0, y: 20 }],
      startLocation: { type: "terminal", prop: { instanceName: "R1", terminalName: "1" } },
      endLocation: { type: "terminal", prop: { instanceName: "VDD1", terminalName: "VDD" } },
      netName: "VDD",
    },
    {
      absolutePath: [{ x: 0, y: -5 }, { x: 0, y: -14 }],
      startLocation: { type: "terminal", prop: { instanceName: "M1", terminalName: "S" } },
      endLocation: { type: "terminal", prop: { instanceName: "GND1", terminalName: "GND" } },
      netName: "GND",
    },
    {
      absolutePath: [{ x: -15, y: -11 }, { x: -15, y: -14 }],
      startLocation: { type: "terminal", prop: { instanceName: "vin", terminalName: "neg" } },
      endLocation: { type: "terminal", prop: { instanceName: "GND2", terminalName: "GND" } },
      netName: "GND",
    },
    {
      absolutePath: [{ x: 0, y: 0 }, { x: 5, y: 0 }, { x: 5, y: -8 }, { x: 0, y: -8 }],
      startLocation: { type: "terminal", prop: { instanceName: "M1", terminalName: "B" } },
      endLocation: { type: "junction", prop: { junctionPosition: { x: 0, y: -8 } } },
      netName: "GND",
    },
    {
      absolutePath: [{ x: 17, y: -8 }, { x: 17, y: -3 }],
      startLocation: { type: "terminal", prop: { instanceName: "9", terminalName: "GND" } },
      endLocation: { type: "terminal", prop: { instanceName: "Vsup", terminalName: "neg" } },
      netName: "GND",
    },
    {
      absolutePath: [{ x: 17, y: 5 }, { x: 17, y: 9 }],
      startLocation: { type: "terminal", prop: { instanceName: "Vsup", terminalName: "pos" } },
      endLocation: { type: "terminal", prop: { instanceName: "8", terminalName: "VDD" } },
      netName: "VDD",
    },
  ],
};

export function createDemoSchematic(processId: ProcessId): Schematic {
  const schematic = structuredClone(demoSchematic);
  const transistor = schematic.componentInstances.find((instance) => instance.name === "M1");
  if (transistor) transistor.value = defaultFetValue(processId, "n");
  return schematic;
}
