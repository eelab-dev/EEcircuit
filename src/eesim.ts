/**
 * EEsim - circuit simulator
 * Danial Chitnis
 */
import * as circuits from "./circuits";
import Simulation, { ResultType } from "./simulation";
import { CodeJar } from "codejar";
import { printCSV, printDisplay } from "./printOutput";

const resultArea = document.getElementById("textArea");

const highlight = (editor: HTMLElement) => {
  const code = editor.textContent;
  // Do something with code and set html.
  editor.innerHTML = code;
};

const jar = CodeJar(document.querySelector(".editor"), highlight, {
  indentOn: /[(\[{]$/,
});

const sim = new Simulation();

const bt = document.getElementById("btClick");
bt.addEventListener("click", () => {
  sim.setNetList(jar.toString());
  sim.runSim();
});

jar.updateCode(circuits.cir1);

sim.setOutputEvent(() => {
  //resultArea.innerHTML = sim.getOutputCSV();
  const results = sim.getResults();
  resultArea.innerHTML = results.header + printDisplay(results.data);
});

sim.start();
