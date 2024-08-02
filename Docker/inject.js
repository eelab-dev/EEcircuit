//Danial Chitnis 2020
//https://stackoverflow.com/questions/14177087/replace-a-string-in-a-file-with-nodejs

const filename = "./build/spice.js";

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

const text4 = `if (calledRun) return`;
const text4rep = `//if (calledRun) return`;

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

let fs = require("fs");

fs.readFile(filename, "utf8", function (err, data) {
  if (err) {
    return console.log(err);
  }
  let result = data;

  for (let i = 0; i < textAll.length; i++) {
    const resultNew = result.replace(textAll[i], "//EEsim\n" + textAllrep[i]);
    if (result == resultNew) {
      return console.error(
        `${console.log(`Couldn't find the phrase:`)}\n` +
        `${console.log(textAll[i])} \n\n` +
        `${console.log(`Please investigate`)}\n`
      );
    }
    result = resultNew;
  }

  fSplit = filename.split(".");
  filenameNew = "." + fSplit[1] + "-eesim" + "." + fSplit[2];
  fs.writeFile(filenameNew, result, "utf8", function (err) {
    if (err) return console.log(err);
  });

  console.log(`Successfully applied EEsim patches!`);
});
