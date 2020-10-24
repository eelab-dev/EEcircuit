/**
 * Read output from spice
 */

export type ResultType = {
  varNum: number;
  pointNum: number;
  variables: VariableType[];
  header: string;
  data: number[][];
};

type VariableType = {
  name: string;
  type: "voltage" | "current";
};

export default function readOutput(rawData: Uint8Array): ResultType {
  //

  const resultStr = ab2str(rawData);

  const offset = resultStr.indexOf("Binary:");
  console.log(`file-> ${offset}`);
  const header = resultStr.substring(0, offset) + "\n";

  //let out: number[];
  const out = [] as number[];
  const param = findParams(header);
  console.log(header);
  console.log(param);

  const out2 = new Array(param.varNum)
    .fill(0)
    .map(() => new Array(param.pointNum).fill(0)) as number[][];
  //https://gregstoll.com/~gregstoll/floattohex/
  try {
    const view = new DataView(rawData.buffer, offset + 8);
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
      out2[i % param.varNum][Math.floor(i / param.varNum)] = e;
    });
    console.log(out2);

    return {
      varNum: param.varNum,
      pointNum: param.pointNum,
      variables: [],
      header: header,
      data: out2,
    } as ResultType;
  } catch (e) {
    console.error(e);
  }

  /*out.forEach((e, i) => {
    str = str + `${i}: ${e.toExponential()}\n`;
  });*/
}

function ab2str(buf: BufferSource) {
  return new TextDecoder("utf-8").decode(buf);
}

function findParams(header: string): { varNum: number; pointNum: number } {
  //
  const lines = header.split("\n");

  const varNum = parseInt(lines[4].split(": ")[1], 10);
  const pointNum = parseInt(lines[5].split(": ")[1], 10);

  return { varNum: varNum, pointNum: pointNum };
}
