/**
 * Context builder - assembles system prompt from current circuit state.
 */

import type { ResultArrayType } from "../sim/simulationArray.ts";
import type { DisplayDataType } from "../displayData.ts";
import { isComplex } from "../sim/simulationArray.ts";

function summarizeResults(
  resultArray: ResultArrayType,
  displayData: DisplayDataType[]
): string {
  if (!resultArray || resultArray.results.length === 0) return "No simulation results available.";

  const result = resultArray.results[0];
  const vars = result.variableNames;
  const visibleNames = new Set(
    displayData.filter((d) => d.visible).map((d) => d.name)
  );
  const hiddenCount = displayData.filter((d) => !d.visible).length;

  const lines: string[] = [];

  if (isComplex(resultArray)) {
    lines.push("Analysis type: AC (complex values)");
  } else {
    lines.push("Analysis type: Transient / DC (real values)");
  }

  lines.push(`Total variables: ${vars.length}`);
  if (hiddenCount > 0) {
    lines.push(
      `Note: ${hiddenCount} variable(s) are hidden in the plot and excluded from this analysis. ` +
      `To include them, select them in the Plot tab first.`
    );
  }
  lines.push("");
  lines.push("Visible variables (included in analysis):");

  vars.forEach((name, i) => {
    if (!visibleNames.has(name)) return;
    const col = result.data[i];
    if (!col || col.values.length === 0) return;

    if (isComplex(resultArray)) {
      // For complex data, show magnitude range
      const mags = (col.values as any[]).map((v: any) =>
        Math.sqrt(v.real ** 2 + v.img ** 2)
      );
      const minMag = Math.min(...mags);
      const maxMag = Math.max(...mags);
      lines.push(`  ${name}: magnitude min=${minMag.toExponential(3)}, max=${maxMag.toExponential(3)}`);
    } else {
      const vals = col.values as number[];
      const min = Math.min(...vals);
      const max = Math.max(...vals);
      const final = vals[vals.length - 1];
      lines.push(
        `  ${name}: min=${min.toExponential(3)}, max=${max.toExponential(3)}, final=${final.toExponential(3)}`
      );
    }
  });

  return lines.join("\n");
}

function parseAnalysis(netlist: string): string {
  const lines = netlist.split("\n");
  const analyses: string[] = [];
  for (const line of lines) {
    const l = line.trim().toLowerCase();
    if (l.startsWith(".tran")) analyses.push(`Transient: ${line.trim()}`);
    else if (l.startsWith(".ac")) analyses.push(`AC: ${line.trim()}`);
    else if (l.startsWith(".op")) analyses.push("DC Operating Point");
    else if (l.startsWith(".dc")) analyses.push(`DC Sweep: ${line.trim()}`);
  }
  return analyses.length > 0 ? analyses.join("\n") : "No analysis found";
}

export function buildSystemPrompt(params: {
  netlist: string;
  pythonCode?: string;
  resultArray?: ResultArrayType;
  displayData?: DisplayDataType[];
  editorMode: "spice" | "python";
}): string {
  const { netlist, pythonCode, resultArray, displayData, editorMode } = params;

  const parts: string[] = [
    "You are an expert analog circuit design assistant integrated into EEcircuit, " +
    "a browser-based SPICE simulator. You have full access to the user's current circuit " +
    "definition, netlist, and simulation results. Answer questions concisely and precisely. " +
    "Use engineering notation (µ, n, p, k, M) and SI units where appropriate.\n" +
    "Important: ngspice saves ALL node voltages and branch currents by default when no " +
    ".save directive is present. So i(l), i(r), i(c) etc. are always available in the " +
    "simulation results without any extra configuration.",
    "",
  ];

  if (editorMode === "python" && pythonCode) {
    parts.push("## Circuit Definition (Python / analogpy)");
    parts.push("```python");
    parts.push(pythonCode.trim());
    parts.push("```");
    parts.push("");
  }

  parts.push("## ngspice Netlist");
  parts.push("```spice");
  parts.push(netlist.trim());
  parts.push("```");
  parts.push("");

  parts.push("## Simulation Setup");
  parts.push(parseAnalysis(netlist));
  parts.push("");

  if (resultArray && displayData) {
    parts.push("## Simulation Results");
    parts.push(summarizeResults(resultArray, displayData));
  } else {
    parts.push("## Simulation Results");
    parts.push("No simulation has been run yet.");
  }

  return parts.join("\n");
}

// Pre-written example Q&A based on the default RLC circuit with CMOS90 model.
// Values verified by running ngspice with the real modelcard.CMOS90.
export const EXAMPLE_QA = [
  {
    question: "Why is the drain voltage (v(net_rc)) not reaching vdd (1.8V)?",
    answer:
      "The simulation shows v(net_rc) ranges from 0.855V to 2.76V — it actually **overshoots** " +
      "vdd=1.8V up to 2.76V due to LC energy storage. When m1 (NMOS, W=100µ, L=90n) turns on, " +
      "current flows through R=100Ω and L=1H. When m1 turns off, the inductor's stored energy " +
      "drives net_rc above vdd. The voltage oscillates around vdd with each switching edge " +
      "of the pulse (period=30s, width=15s), gradually settling between the switching transitions.",
  },
  {
    question: "What is the resonant frequency of this RLC circuit?",
    answer:
      "f₀ = 1/(2π√(LC)) = 1/(2π√(1H × 0.01F)) = 1/(2π × 0.1) ≈ **1.59 Hz**.\n" +
      "The RLC natural frequency is much faster than the pulse switching frequency (1/30s ≈ 0.033 Hz). " +
      "Each time m1 switches on or off, the RLC network responds with a transient at ~1.59 Hz " +
      "that settles before the next switching edge. The quality factor Q = (1/R)√(L/C) = 0.1, " +
      "which means the transient is heavily damped and settles within a few hundred milliseconds.",
  },
  {
    question: "How would doubling the capacitor value affect the response?",
    answer:
      "Running the simulation with C=0.02F (doubled): " +
      "the resonant frequency drops to f₀ ≈ 1.12 Hz (from 1.59 Hz). " +
      "Peak inductor current increases slightly from 195 mA to 206 mA. " +
      "The voltage overshoot on net_rc decreases from 2.76V to 2.56V (more energy stored in the larger C " +
      "means less voltage swing). The minimum voltage rises from 0.855V to 1.08V. " +
      "The existing .tran stop=50s is still sufficient — the transients settle within ~200ms of each edge. " +
      "Try it: change `c=0.01` to `c=0.02` in the Python code and re-run.",
  },
  {
    question: "What is the peak current through the inductor?",
    answer:
      "From the simulation with the CMOS90 model: peak i(l) = **195 mA** at t ≈ 30s, " +
      "minimum i(l) = **-79 mA** at t ≈ 15s, final i(l) = -3.7 mA at t=50s. " +
      "The current swings positive when m1 turns on (current flows vdd → R → L → m1 → gnd) " +
      "and negative when m1 turns off (inductor tries to maintain current, driving net_rc above vdd). " +
      "Select `i(l)` in the plot legend to see the full waveform — " +
      "ngspice saves all branch currents by default.",
  },
];
