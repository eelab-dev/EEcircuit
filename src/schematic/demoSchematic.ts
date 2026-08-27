import type { Schematic } from "eecircuit-schematic";

// The v2 editor validates raw schematics before loading them, so the host owns
// a deliberately simple, fully connected demo rather than the old computed
// snapshot that relied on v1's permissive endpoint handling.
export const demoSchematic: Schematic = {
  componentInstances: [
    { typeName: "vdc", name: "Vsup", value: "1.8", origin: { x: 0, y: 0 }, rotation: "0", flip: "none" },
    { typeName: "vsin", name: "vin", value: "SIN (0.9 0.3 1k)", origin: { x: -15, y: -7 }, rotation: "0", flip: "none" },
    { typeName: "resistor", name: "R1", value: "1k", origin: { x: 0, y: 9 }, rotation: "0", flip: "none" },
    { typeName: "GND", name: "GND1", origin: { x: 0, y: -8 }, rotation: "0", flip: "none" },
    { typeName: "GND", name: "GND2", origin: { x: -15, y: -15 }, rotation: "0", flip: "none" },
  ],
  wires: [
    {
      absolutePath: [
        { x: 0, y: 4 },
        { x: 0, y: 5 },
        { x: 8, y: 5 },
        { x: 8, y: 9 },
        { x: 5, y: 9 },
      ],
      startLocation: { type: "terminal", prop: { instanceName: "Vsup", terminalName: "pos" } },
      endLocation: { type: "terminal", prop: { instanceName: "R1", terminalName: "2" } },
      netName: "output",
    },
    {
      absolutePath: [{ x: -15, y: -3 }, { x: -15, y: 9 }, { x: -5, y: 9 }],
      startLocation: { type: "terminal", prop: { instanceName: "vin", terminalName: "pos" } },
      endLocation: { type: "terminal", prop: { instanceName: "R1", terminalName: "1" } },
      netName: "input",
    },
    {
      absolutePath: [{ x: 0, y: -4 }, { x: 0, y: -8 }],
      startLocation: { type: "terminal", prop: { instanceName: "Vsup", terminalName: "neg" } },
      endLocation: { type: "terminal", prop: { instanceName: "GND1", terminalName: "GND" } },
      netName: "GND",
    },
    {
      absolutePath: [{ x: -15, y: -11 }, { x: -15, y: -15 }],
      startLocation: { type: "terminal", prop: { instanceName: "vin", terminalName: "neg" } },
      endLocation: { type: "terminal", prop: { instanceName: "GND2", terminalName: "GND" } },
      netName: "GND",
    },
  ],
};
