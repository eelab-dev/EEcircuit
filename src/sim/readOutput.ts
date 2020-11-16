/**
 * Read output from spice
 */

export type ResultType = {
  param: ParamType;
  header: string;
  data: number[][];
};

export type ParamType = {
  varNum: number;
  pointNum: number;
  variables: VariableType[];
};

export type VariableType = {
  name: string;
  type: "voltage" | "current" | "time";
  visible: boolean;
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
    param: param,
    header: header,
    data: out2,
  } as ResultType;

  /*out.forEach((e, i) => {
    str = str + `${i}: ${e.toExponential()}\n`;
  });*/
}

function ab2str(buf: BufferSource) {
  return new TextDecoder("utf-8").decode(buf);
}

function findParams(header: string): ParamType {
  //
  const lines = header.split("\n");

  const varNum = parseInt(lines[4].split(": ")[1], 10);
  const pointNum = parseInt(lines[5].split(": ")[1], 10);

  //console.log("🤔", lines);
  //console.log(lines.indexOf("Variables:"));

  const varList = [] as VariableType[];
  for (let i = 0; i < varNum; i++) {
    let str = lines[i + lines.indexOf("Variables:") + 1];
    let str2 = str.split("\t");
    console.log("str2->", str2);
    varList.push({ name: str2[2], type: str2[3] as "voltage" | "current" | "time", visible: true });
  }
  //console.log("varlist->", varList);

  const param = {
    varNum: varNum,
    pointNum: pointNum,
    // why????????????????
    // https://www.digitalocean.com/community/tutorials/copying-objects-in-javascript
    variables: [...varList],
  } as ParamType;

  return param;
}
