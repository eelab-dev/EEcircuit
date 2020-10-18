/**
 * EEsim - circuit simulator
 * Danial Chitnis
 */

import Module from "./spice";
import * as circuits from "./circuits";
import readOutput from "./readOutput";

import { CodeJar } from "codejar";

let pass = false;
//const commandList = [" ", "source test.cir", "run", "set filetype=ascii", "write out.raw"];
const commandList = [" ", "source test.cir", "run", "write out.raw"];
let cmd = 0;

const resultArea = document.getElementById("textArea");

const highlight = (editor: HTMLElement) => {
  const code = editor.textContent;
  // Do something with code and set html.
  editor.innerHTML = code;
};

const jar = CodeJar(document.querySelector(".editor"), highlight, {
  indentOn: /[(\[{]$/,
});

const getInput = () => {
  let strCmd = " ";
  if (cmd < commandList.length) {
    strCmd = commandList[cmd];
    cmd++;
  } else {
    cmd = 0;
  }
  console.log(`cmd -> ${strCmd}`);
  return strCmd;
};

const start = async () => {
  const module = await Module({
    //arguments: ["test.cir"],
    noInitialRun: true,
    print: () => {
      /*do nothing*/
    },
    preRun: [
      () => {
        console.log("from prerun");
      },
    ],
  });

  module.FS.writeFile("/proc/meminfo", "");
  module.FS.writeFile("/modelcard.nmos", circuits.strModelNmos);
  module.FS.writeFile("/modelcard.pmos", circuits.strModelPmos);
  //console.log(module.Asyncify);

  module.setHandleThings(() => {
    console.log("handle other things!!!!!");
    module.Asyncify.handleAsync(async () => {
      console.log(pass);
      if (cmd == 0) {
        try {
          const data = module.FS.readFile("out.raw");
          const str = readOutput(data);
          resultArea.innerHTML = str;
        } catch (e) {
          console.log("no file!");
        }

        console.log("cmd-> ready to start...");
        //pass = false;
      }
      while (!pass && cmd == 0) {
        //console.log(chkPass());
        await new Promise((r) => setTimeout(r, 1000));
        console.log(`I am in pass loop JS -${pass} `);
      }
      module.FS.writeFile("/test.cir", jar.toString());

      console.log("loop finished");

      pass = false;
    });
  });
  module.setGetInput(getInput);

  module.runThings();
};

const bt = document.getElementById("btClick");
bt.addEventListener("click", () => {
  pass = true;
});

jar.updateCode(circuits.cir1);

start();
