//Danial Chitnis 2020
//https://stackoverflow.com/questions/14177087/replace-a-string-in-a-file-with-nodejs

const filename = "./Docker/build/spice.js";

const text1 = `if (typeof window != "undefined" && typeof window.prompt == "function")`;
const text1rep = `
if (true)
`;

const text2 = `result = window.prompt("Input: ")`;
const text2rep = `
//result = window.prompt("Input: ");
result = getInput();
`;

const text3 = `var _emscripten_sleep = ms => Asyncify.handleSleep(wakeUp => safeSetTimeout(wakeUp, ms));`;

const text3rep = `var _emscripten_sleep = ms => handleThings();`;

const text4 = `Module["calledRun"] = true;`;
const text4rep = `Module["calledRun"] = false;`;

const text5 = `  } else {
    doRun();
  }
}`;

const text5rep = `
 } else {
  doRun();
 }
}
var getInput;

 Module["setGetInput"] = setGetInput;
 function setGetInput(f) {
  getInput = f;
 }

var handleThings;

Module["setHandleThings"] = setHandleThings;
function setHandleThings(f) {
 handleThings = f;
}

Module["runThings"] = runThings;
function runThings() {
 const args = arguments_;
 callMain(args);
}
//end of EEsim mod
`;

const textAll = [text1, text2, text3, text4, text5];
const textAllrep = [text1rep, text2rep, text3rep, text4rep, text5rep];

import fs from "fs";

fs.readFile(filename, "utf8", function (err, data) {
  if (err) {
    console.error(err);
    process.exit(1);  // Exit with code 1 if an error occurs while reading the file
  }

  let result = data;

  for (let i = 0; i < textAll.length; i++) {
    const resultNew = result.replace(textAll[i], "//EEsim\n" + textAllrep[i]);
    if (result === resultNew) {
      console.error(`Couldn't find the phrase:\n${textAll[i]}\n\nPlease investigate`);
      process.exit(1);  // Exit with code 1 if a phrase cannot be found and replaced
    }
    result = resultNew;
  }

  const fSplit = filename.split(".");
  const filenameNew = `.${fSplit[1]}-eesim.${fSplit[2]}`;
  fs.writeFile(filenameNew, result, "utf8", function (err) {
    if (err) {
      console.error(err);
      process.exit(1);  // Exit with code 1 if an error occurs while writing the file
    }
  });

  console.log(`Successfully applied EEsim patches!`);
});