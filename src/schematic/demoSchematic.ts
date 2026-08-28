import type { Schematic } from "eecircuit-schematic";

// Raw v2 representation of the original eecircuit-schematic demo: a
// common-source NMOS amplifier with a resistive drain load and sine input.
export const demoSchematic: Schematic = {
  componentInstances: [
    { typeName: "resistor", name: "R1", value: "1k", origin: { x: 0, y: 13 }, rotation: "90", flip: "none" },
    { typeName: "nFET", name: "M1", value: "PTM90N W=1u L=0.09u", origin: { x: 0, y: 0 }, rotation: "0", flip: "none" },
    { typeName: "VDD", name: "VDD1", value: "1V", origin: { x: 0, y: 20 }, rotation: "0", flip: "none" },
    { typeName: "GND", name: "GND1", origin: { x: 0, y: -14 }, rotation: "0", flip: "none" },
    { typeName: "GND", name: "GND2", origin: { x: -15, y: -14 }, rotation: "0", flip: "none" },
    { typeName: "vdc", name: "Vsup", value: "1.8", origin: { x: 17, y: 1 }, rotation: "0", flip: "none" },
    { typeName: "VDD", name: "8", value: "", origin: { x: 17, y: 9 }, rotation: "0", flip: "none" },
    { typeName: "GND", name: "9", value: "", origin: { x: 17, y: -8 }, rotation: "0", flip: "none" },
    { typeName: "vsin", name: "vin", value: "SIN (0.9 0.3 1k)", origin: { x: -15, y: -7 }, rotation: "0", flip: "none" },
  ],
  wires: [
    {
      absolutePath: [{ x: -15, y: -3 }, { x: -15, y: 0 }, { x: -5, y: 0 }],
      netName: "input",
    },
    {
      absolutePath: [{ x: 0, y: 5 }, { x: 0, y: 8 }],
      netName: "output",
    },
    {
      absolutePath: [{ x: 0, y: 18 }, { x: 0, y: 20 }],
      netName: "VDD",
    },
    {
      absolutePath: [{ x: 0, y: -5 }, { x: 0, y: -14 }],
      netName: "GND",
    },
    {
      absolutePath: [{ x: -15, y: -11 }, { x: -15, y: -14 }],
      netName: "GND",
    },
    {
      absolutePath: [{ x: 0, y: 0 }, { x: 5, y: 0 }, { x: 5, y: -8 }, { x: 0, y: -8 }],
      endLocation: { type: "junction", prop: { junctionPosition: { x: 0, y: -8 } } },
      netName: "GND",
    },
    {
      absolutePath: [{ x: 17, y: -8 }, { x: 17, y: -3 }],
      netName: "GND",
    },
    {
      absolutePath: [{ x: 17, y: 5 }, { x: 17, y: 9 }],
      netName: "VDD",
    },
  ],
};
