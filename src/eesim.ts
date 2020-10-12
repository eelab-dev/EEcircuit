/**
 * EEsim - circuit simulator
 * Danial Chitnis
 */

import Module from "./spice.js";
import * as circuits from "./circuits.js";

let pass = false;
const commandList = ["\n", "source test.cir", "run", "set filetype=ascii", "write out.raw"];
let cmd = 0;

const getInput = () => {
  const strCmd = commandList[cmd];
  console.log(`cmd -> ${strCmd}`);
  if (cmd < commandList.length) {
    cmd++;
  } else {
    cmd = 0;
  }
  return strCmd;
};

const readOutputFile = (data: BufferSource) => {
  function ab2str(buf: BufferSource) {
    return new TextDecoder("utf-8").decode(buf);
  }
  try {
    //let data = FS.readFile("out.raw");
    //console.log(ab2str(data));
    //https://microsoft.github.io/monaco-editor/api/interfaces/monaco.editor.istandalonecodeeditor.html
    //editor2.setValue(ab2str(data));
  } catch (e) {
    console.log("No output file!");
  }
};

const start = async () => {
  const module = await Module({
    //arguments: ["test.cir"],
    noInitialRun: true,
    preRun: [
      () => {
        console.log("from prerun");
        //console.log(Module.FS);
      },
    ],
  });
  module.FS.writeFile("/proc/meminfo", "");
  module.FS.writeFile("/test.cir", circuits.str2);
  module.FS.writeFile("/modelcard.nmos", circuits.strModelNmos);
  module.FS.writeFile("/modelcard.pmos", circuits.strModelPmos);
  //console.log(module.Asyncify);

  module.setHandleThings(() => {
    console.log("handle other things!!!!!");
    module.Asyncify.handleAsync(async () => {
      console.log(pass);
      if (cmd == 0) {
        let data;
        try {
          data = module.FS.readFile("out.raw");
          readOutputFile(data);
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
      //module.FS.writeFile("/test.cir", editor1.getValue());

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

start();
