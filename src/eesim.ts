/**
 * EEsim - circuit simulator
 * Danial Chitnis
 */
import * as circuits from "./circuits";
import Simulation from "./simulation";
import { CodeJar } from "codejar";
import { printCSV, printDisplay } from "./printOutput";
import WebglPlot, { ColorRGBA, WebglLine } from "webgl-plot";
import { calcContrast, calcLuminance } from "./calcContrast";

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

const btSim = document.getElementById("btSim") as HTMLButtonElement;
btSim.addEventListener("click", () => {
  sim.setNetList(jar.toString());

  sim.setOutputEvent(() => {
    //resultArea.innerHTML = sim.getOutputCSV();
    const results = sim.getResults();
    resultArea.innerHTML = results.header + printDisplay(results.data);
  });

  sim.runSim();
});

const getColor = (): ColorRGBA => {
  let contrast = 0;
  let r, g, b;
  while (contrast < 7) {
    r = Math.random();
    g = Math.random();
    b = Math.random();

    contrast = calcContrast(calcLuminance(b, g, r), calcLuminance(0.2, 0.2, 0.2));
  }
  return new ColorRGBA(r, g, b, 1);
};

const btPlot = document.getElementById("btPlot") as HTMLButtonElement;
btPlot.addEventListener("click", () => {
  sim.setNetList(jar.toString());

  sim.setOutputEvent(() => {
    const results = sim.getResults();
    resultArea.innerHTML = results.header;

    const canvas = document.getElementById("plot") as HTMLCanvasElement;
    const devicePixelRatio = window.devicePixelRatio || 1;
    canvas.width = canvas.clientWidth * devicePixelRatio;
    canvas.height = canvas.clientHeight * devicePixelRatio;
    const wglp = new WebglPlot(canvas);

    /* x axis is [0,1]*/
    wglp.gOffsetX = -1;
    wglp.gScaleX = 2;

    const data = results.data;

    let maxY = 0;
    let minY = 0;

    for (let col = 1; col < data.length; col++) {
      const color = getColor();
      const line = new WebglLine(color, data[0].length);
      const maxX = data[0][data[0].length - 1];

      for (let i = 0; i < data[0].length; i++) {
        line.setX(i, data[0][i] / maxX);
        const y = data[col][i];
        line.setY(i, y);
        maxY = maxY > y ? maxY : y;
        minY = minY < y ? minY : y;
      }
      wglp.addLine(line);
    }

    wglp.gScaleY = 0.9 / Math.max(Math.abs(minY), Math.abs(maxY));
    console.log(maxY);
    wglp.update();
  });

  sim.runSim();
});

jar.updateCode(circuits.cirTrans);
//jar.updateCode(circuits.strBsimTest1);

sim.start();
