/**
 * print output from spice
 */

export { printCSV, printDisplay };

function printCSV(data: number[][]): string {
  let str = "";

  for (let row = 0; row < data[0].length; row++) {
    for (let col = 0; col < data.length; col++) {
      //console.log(out2[col][row]);
      str = str + data[col][row].toExponential(3) + ",";
    }
    str = str + "\n";
  }
  return str;
}

function printDisplay(data: number[][]): string {
  let str = "";

  for (let row = 0; row < data[0].length; row++) {
    let strRow = "";
    for (let col = 0; col < data.length; col++) {
      //console.log(out2[col][row]);
      strRow = strRow + `${data[col][row].toExponential(2)} | `;
    }
    str = str + `${row}:\t` + strRow + "\n";
  }
  return str;
}
