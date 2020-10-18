/**
 * EEsim - circuit simulator
 * Danial Chitnis
 */
import * as circuits from "./circuits";
import Simulation from "./simulation";
import { CodeJar } from "codejar";

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

sim.setOutputEvent((out) => {
  resultArea.innerHTML = out;
});

sim.start();
