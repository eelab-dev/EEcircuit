//Danial Chitnis 2020
//https://stackoverflow.com/questions/14177087/replace-a-string-in-a-file-with-nodejs
const chalk = require("chalk");

const filename = "./Docker/build/spice.js";

const text1 = `result = window.prompt("Input: ");`;
const text1rep = `
//result = window.prompt("Input: ");
result = getInput();
`;

const text2 = `
function _emscripten_sleep(ms) {
 Asyncify.handleSleep(function(wakeUp) {
  Browser.safeSetTimeout(wakeUp, ms);
 });
}`;

const text2rep = `
function _emscripten_sleep(ms) {
 handleThings();
}`;

const text3 = `if (calledRun) return`;
const text3rep = `//if (calledRun) return`;

const text4 = `Module["run"] = run;`;
const text4rep = `
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

Module["run"] = run;
`;

const textAll = [text1, text2, text3, text4];
const textAllrep = [text1rep, text2rep, text3rep, text4rep];

let fs = require("fs");

fs.readFile(filename, "utf8", function (err, data) {
  if (err) {
    return console.log(err);
    process.exit(1);
  }
  let result = data;

  for (let i = 0; i < textAll.length; i++) {
    const resultNew = result.replace(textAll[i], "//EEsim\n" + textAllrep[i]);
    if (result == resultNew) {
      return console.error(
        `${chalk.red(`Couldn't find the phrase:`)}\n` +
          `${chalk.cyan(textAll[i])} \n\n` +
          `${chalk.red(`Please investigate`)}\n`
      );
    }
    result = resultNew;
  }

  fSplit = filename.split(".");
  filenameNew = "." + fSplit[1] + "-eesim" + "." + fSplit[2];
  fs.writeFile(filenameNew, result, "utf8", function (err) {
    if (err) return console.log(err);
  });

  console.log(chalk.green(`Successfully applied EEsim patches!`));
});
