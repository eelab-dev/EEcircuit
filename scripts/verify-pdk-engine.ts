import { Simulation } from "eecircuit-engine";
import type { ResultType } from "eecircuit-engine";
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
import { gf180Opamp3p3 } from "../src/Simulate/subcircuits/gf180Opamp3p3.ts";

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

async function runCase(simulation: Simulation, label: string, netlist: string): Promise<ResultType> {
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
  return result;
}

const fixedGf180Corners: readonly Gf180Corner[] = ["typical", "ff", "ss", "fs", "sf"];

function opampNetlist(corner: Gf180Corner, analysis: string): string {
  return `* GF180 3.3 V opamp voltage-follower verification
.include ${modelCardFor("gf180", corner)}
${gf180Opamp3p3}
VDD vdd 0 3.3
VIN inp 0 DC 1.65 AC 1 SIN(1.65 10m 10k)
XAMP inp out out vdd 0 gf180_opamp_3p3
RLOAD out 0 1k
CLOAD out 0 10p
.save v(inp) v(out)
${analysis}
.end`;
}

function realSeries(result: ResultType, name: string): number[] {
  if (result.dataType !== "real") throw new Error(`${name}: expected real simulation data`);
  const series = result.data.find((item) => item.name.toLowerCase() === name.toLowerCase());
  if (!series) throw new Error(`${name}: result is missing`);
  return series.values;
}

function complexSeries(result: ResultType, name: string): { real: number; img: number }[] {
  if (result.dataType !== "complex") throw new Error(`${name}: expected complex simulation data`);
  const series = result.data.find((item) => item.name.toLowerCase() === name.toLowerCase());
  if (!series) throw new Error(`${name}: result is missing`);
  return series.values;
}

function assertFinite(label: string, values: readonly number[]): void {
  if (!values.length || values.some((value) => !Number.isFinite(value))) {
    throw new Error(`${label}: returned missing or non-finite data`);
  }
}

async function verifyGf180Opamp(corner: Gf180Corner): Promise<void> {
  // Use a fresh engine instance for each numerical assertion so an earlier
  // analysis cannot retain ngspice state and influence the next operating point.
  const op = await runCase(new Simulation(), `GF180 opamp ${corner} operating point`, opampNetlist(corner, ".op"));
  const opOut = realSeries(op, "v(out)");
  assertFinite(`${corner} operating point`, opOut);
  if (Math.abs(opOut.at(-1)! - 1.65) >= 5e-3) {
    throw new Error(`${corner} operating point: output did not track 1.65 V within 5 mV`);
  }

  const dc = await runCase(new Simulation(), `GF180 opamp ${corner} DC`, opampNetlist(corner, ".dc VIN 0 3.3 0.1"));
  const dcOut = realSeries(dc, "v(out)");
  assertFinite(`${corner} DC`, dcOut);
  const centralError = Math.max(...dcOut.slice(3, 31).map((output, index) =>
    Math.abs(output - (index + 3) * 0.1),
  ));
  if (centralError >= 5e-3) {
    throw new Error(`${corner} DC: central-range tracking error ${centralError} V exceeds 5 mV`);
  }

  const ac = await runCase(new Simulation(), `GF180 opamp ${corner} AC`, opampNetlist(corner, ".ac dec 10 1 10G"));
  const frequency = complexSeries(ac, "frequency");
  const acOut = complexSeries(ac, "v(out)");
  const magnitudes = acOut.map(({ real, img }) => Math.hypot(real, img));
  assertFinite(`${corner} AC frequency`, frequency.map((value) => value.real));
  assertFinite(`${corner} AC output`, magnitudes);
  const tenKhz = frequency.reduce((best, value, index) =>
    Math.abs(value.real - 1e4) < Math.abs(frequency[best]!.real - 1e4) ? index : best, 0);
  for (const [label, gain] of [["low-frequency", magnitudes[0]!], ["10 kHz", magnitudes[tenKhz]!]] as const) {
    if (gain < 0.98 || gain > 1.02) throw new Error(`${corner} AC ${label} gain ${gain} is outside 0.98–1.02`);
  }

  const transient = await runCase(
    new Simulation(),
    `GF180 opamp ${corner} transient`,
    opampNetlist(corner, ".tran 50n 500u"),
  );
  const input = realSeries(transient, "v(inp)");
  const output = realSeries(transient, "v(out)");
  const settledIndex = Math.floor(output.length * 0.1);
  const settledOutput = output.slice(settledIndex);
  const trackingError = Math.max(...settledOutput.map((value, index) =>
    Math.abs(value - input[index + settledIndex]!),
  ));
  const peakToPeak = Math.max(...settledOutput) - Math.min(...settledOutput);
  assertFinite(`${corner} transient`, [...input, ...output]);
  if (trackingError >= 5e-3) throw new Error(`${corner} transient tracking error ${trackingError} V exceeds 5 mV`);
  if (peakToPeak < 18e-3 || peakToPeak > 22e-3) {
    throw new Error(`${corner} transient output swing ${peakToPeak} V is outside 18–22 mV`);
  }
}

async function verifyGf180OpampIsolation(): Promise<void> {
  const shifted = `* Shifted VSS and independent-instance GF180 opamp verification
.include modelcard.GF180.typical
${gf180Opamp3p3}
VVSS vss 0 1
VDD vdd vss 3.3
VIN1 inp1 vss 1.2
VIN2 inp2 vss 2.1
XAMP1 inp1 out1 out1 vdd vss gf180_opamp_3p3
XAMP2 inp2 out2 out2 vdd vss gf180_opamp_3p3
RLOAD1 out1 vss 1k
RLOAD2 out2 vss 1k
.save v(out1) v(out2)
.op
.end`;
  const result = await runCase(
    new Simulation(),
    "GF180 opamp shifted VSS and instance isolation",
    shifted,
  );
  const out1 = realSeries(result, "v(out1)").at(-1)!;
  const out2 = realSeries(result, "v(out2)").at(-1)!;
  if (Math.abs(out1 - 2.2) >= 5e-3 || Math.abs(out2 - 3.1) >= 5e-3) {
    throw new Error(`shifted VSS: outputs ${out1}, ${out2} did not track their independent inputs`);
  }
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

  for (const corner of fixedGf180Corners) await verifyGf180Opamp(corner);
  await verifyGf180OpampIsolation();
  await runCase(
    new Simulation(),
    "GF180 opamp statistical convergence",
    opampNetlist("statistical", ".op"),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
