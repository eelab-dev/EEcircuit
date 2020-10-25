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

const divDisplay = document.getElementById("display") as HTMLDivElement;

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
    while (divDisplay.lastChild) {
      divDisplay.removeChild(divDisplay.lastChild);
    }
    const resultArea = document.createElement("textarea");
    resultArea.className = "editor";
    divDisplay.appendChild(resultArea);
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
    while (divDisplay.lastChild) {
      divDisplay.removeChild(divDisplay.lastChild);
    }
    const results = sim.getResults();

    const canvas = document.createElement("canvas");
    canvas.className = "graph";
    divDisplay.appendChild(canvas);

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

/**
 * https://ourcodeworld.com/articles/read/189/how-to-create-a-file-and-generate-a-download-with-javascript-in-the-browser-without-a-server
 * @param filename
 * @param text
 */
function download(filename: string, text: string) {
  const element = document.createElement("a");
  element.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(text));
  element.setAttribute("download", filename);

  element.style.display = "none";
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
}

const btCSV = document.getElementById("btCSV") as HTMLButtonElement;
btCSV.addEventListener("click", () => {
  sim.setNetList(jar.toString());

  sim.setOutputEvent(() => {
    while (divDisplay.lastChild) {
      divDisplay.removeChild(divDisplay.lastChild);
    }
    const data = sim.getResults().data;
    const header = sim.getResults().header;

    download("data.csv", header + printCSV(data));
  });

  sim.runSim();
});

jar.updateCode(circuits.bsimTrans);
//jar.updateCode(circuits.strBsimTest1);

sim.start();
