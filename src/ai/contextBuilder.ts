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

// Pre-written example Q&A based on the default RLC circuit
export const EXAMPLE_QA = [
  {
    question: "Why is the drain voltage (v(net_rc)) not reaching vdd (1.8V)?",
    answer:
      "The NMOS m1 (W=100µ, L=90n, model N90) pulls net_rc toward ground when the gate pulse is high. " +
      "When m1 turns on, current flows through R=100Ω and L=1H, causing a voltage drop. " +
      "The drain can only approach vdd when m1 is fully off and the RLC network has settled. " +
      "Additionally with R=100Ω this circuit is overdamped (Q≈0.1), so there's no overshoot.",
  },
  {
    question: "What is the resonant frequency of this RLC circuit?",
    answer:
      "f₀ = 1/(2π√(LC)) = 1/(2π√(1H × 0.01F)) = 1/(2π × 0.1) ≈ **1.59 Hz**.\n" +
      "Quality factor Q = (1/R)√(L/C) = (1/100)√(100) = 0.1 — well below 0.5, " +
      "so the circuit is overdamped. No oscillation occurs; the response is a slow exponential with " +
      "time constant τ ≈ 2L/R = 20ms (dominant pole).",
  },
  {
    question: "How would doubling the capacitor value affect the response?",
    answer:
      "Doubling C → 0.02F lowers the resonant frequency by √2 to ≈1.12 Hz. " +
      "Q drops to ≈0.07 (more overdamped). " +
      "The dominant time constant roughly doubles, so waveforms settle ~2× slower. " +
      "You'd need to increase the .tran stop time to at least 100 to capture full settling.",
  },
  {
    question: "What is the peak current through the inductor?",
    answer:
      "From the simulation results, look for `i(l)` in the plot legend — ngspice saves all branch currents by default, so it is already available without any `.save` directive.\n" +
      "Analytically: when m1 turns on and net_rc ≈ 0V, ~1.8V appears across R+L. " +
      "At DC steady state the inductor is a short, so I_peak ≈ vdd/R = 1.8V/100Ω = **18 mA**. " +
      "The large L=1H means the current rises very slowly (τ = L/R = 10ms), " +
      "so within the 50s simulation window it does reach steady state.",
  },
];
