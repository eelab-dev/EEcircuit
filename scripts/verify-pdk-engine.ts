import { Simulation } from "eecircuit-engine";
import {
  defaultModelFor,
  GF180_CORNERS,
  modelCardFor,
  PROCESS_CATALOG,
  PROCESS_IDS,
  type FetModel,
  type Gf180Corner,
  type ProcessId,
} from "../src/pdk/processCatalog.ts";

function deviceLine(name: string, model: FetModel, nodes: string): string {
  const designator = model.invocation === "subcircuit" ? "X" : "M";
  return `${designator}${name} ${nodes} ${model.name} W=${model.defaultW} L=${model.defaultL}`;
}

function processNetlist(processId: ProcessId, corner: Gf180Corner): string {
  const nmos = defaultModelFor(processId, "n");
  const pmos = defaultModelFor(processId, "p");
  return `* ${PROCESS_CATALOG[processId].label} engine smoke test
.include ${modelCardFor(processId, corner)}
VDD vdd 0 1
VIN in 0 0.5
${deviceLine("N", nmos, "out in 0 0")}
${deviceLine("P", pmos, "out in vdd vdd")}
RLOAD out 0 1meg
.op
.save v(out)
.end`;
}

function modelNetlist(model: FetModel): string {
  const isNmos = model.polarity === "n";
  const sources = isNmos
    ? "VDD d 0 1\nVG g 0 1"
    : "VDD s 0 3.3\nVG g 0 0\nRLOAD d 0 1meg";
  const nodes = isNmos ? "d g 0 0" : "d g s s";
  return `* GF180 ${model.name} engine smoke test
.include modelcard.GF180.typical
${sources}
${deviceLine("1", model, nodes)}
.op
.save v(d)
.end`;
}

async function runCase(simulation: Simulation, label: string, netlist: string): Promise<void> {
  simulation.setNetList(netlist);
  const result = await simulation.runSim();
  const blockingErrors = simulation.getError().filter((message) =>
    /\b(error|fatal|failed)\b|unknown model|could not find/i.test(message),
  );
  if (blockingErrors.length > 0) throw new Error(`${label}: ${blockingErrors.join(" | ")}`);
  if (result.numPoints < 1 || result.variableNames.length < 1) {
    throw new Error(`${label}: simulation returned no data`);
  }
  console.log(`PASS ${label}`);
}

async function main(): Promise<void> {
  const simulation = new Simulation();

  for (const processId of PROCESS_IDS) {
    await runCase(simulation, PROCESS_CATALOG[processId].label, processNetlist(processId, "typical"));
  }

  for (const corner of GF180_CORNERS) {
    await runCase(simulation, `GF180 ${corner}`, processNetlist("gf180", corner));
  }

  for (const model of PROCESS_CATALOG.gf180.models) {
    await runCase(simulation, `GF180 ${model.name}`, modelNetlist(model));
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
