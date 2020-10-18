/**
 * Read output from spice
 */

export default function readOutput(data: Uint8Array): string {
  //

  let str = "";

  const resultStr = ab2str(data);

  const offset = resultStr.indexOf("Binary:");
  console.log(`file-> ${offset}`);

  const text = resultStr.substring(0, offset);
  str = text + "\n";

  //let out: number[];
  const out = [] as number[];
  const out2 = new Array(4).fill(0).map(() => new Array(11).fill(0)) as number[][];
  //https://gregstoll.com/~gregstoll/floattohex/
  try {
    const view = new DataView(data.buffer, offset + 8);
    console.log("😬");

    for (let i = 0; i < view.byteLength; i = i + 8) {
      const d = view.getFloat64(i, true);
      out.push(d);
      //console.log(`float -> ${d}`);
    }

    /*const data2 = data.subarray(offset + 8, data.byteLength);
      for (let i = 0; i < data2.byteLength; i++) {
        const a = data2[i];
        str = str + `${i}: ${a} -> ${String.fromCharCode(a)}\n`;
      }*/

    out.forEach((e, i) => {
      out2[i % 4][Math.floor(i / 4)] = e;
    });
    console.log(out2);

    for (let row = 0; row < out2[0].length; row++) {
      for (let col = 0; col < out2.length; col++) {
        //console.log(out2[col][row]);
        str = str + out2[col][row].toExponential(3) + " | ";
      }
      str = str + "\n";
    }
  } catch (e) {
    console.error(e);
  }

  /*out.forEach((e, i) => {
    str = str + `${i}: ${e.toExponential()}\n`;
  });*/

  return str;
}

function ab2str(buf: BufferSource) {
  return new TextDecoder("utf-8").decode(buf);
}
