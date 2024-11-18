/**
 * Read output from spice
 */

export type ResultType = {
  param: ParamType;
  header: string;
  data: RealDataType | ComplexDataType;
};

export type ParamType = {
  varNum: number;
  pointNum: number;
  variables: VariableType[];
  dataType: "real" | "complex";
};

export type VariableType = {
  name: string;
  type: "voltage" | "current" | "time";
};

export type RealDataType = number[][];
export type ComplexDataType = { real: number; img: number }[][];

export default function readOutput(rawData: Uint8Array): ResultType {
  //

  const resultStr = ab2str(rawData);

  const offset = resultStr.indexOf("Binary:");
  log(`file-> ${offset}`);
  const header = resultStr.substring(0, offset) + "\n";

  //let out: number[];
  const out = [] as number[];
  const param = findParams(header);
  log(header);
  log(param);

  const view = new DataView(rawData.buffer, offset + 8);

  for (let i = 0; i < view.byteLength; i = i + 8) {
    const d = view.getFloat64(i, true);
    out.push(d);
    //log(`float -> ${d}`);
  }

  log("🤔", out);

  if (param.dataType === "complex") {
    const out2 = new Array(param.varNum)
      .fill(0)
      .map(() => new Array(param.pointNum).fill(0)) as ComplexDataType;
    //https://gregstoll.com/~gregstoll/floattohex/
    //
    for (let i = 0; i < out.length; i = i + 2) {
      const complex = { real: out[i], img: out[i + 1] };
      const index = i / 2;
      out2[index % param.varNum][Math.floor(index / param.varNum)] = { ...complex };
    }
    log(out2);

    return {
      param: param,
      header: header,
      data: out2 as ComplexDataType,
    } as ResultType;
  } else {
    // Real
    const out2 = new Array(param.varNum)
      .fill(0)
      .map(() => new Array(param.pointNum).fill(0)) as RealDataType;
    //https://gregstoll.com/~gregstoll/floattohex/
    //
    out.forEach((e, i) => {
      out2[i % param.varNum][Math.floor(i / param.varNum)] = e;
    });
    //log(out2);

    return {
      param: param,
      header: header,
      data: out2 as RealDataType,
    } as ResultType;
  }

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

  log("header in findParam->", lines);

  const varNum = parseInt(lines[lines.findIndex(s => s.startsWith("No. Variables"))].split(":")[1], 10);
  const pointNum = parseInt(lines[lines.findIndex(s => s.startsWith("No. Points"))].split(":")[1], 10);
  const dataType = lines[lines.findIndex(s => s.startsWith("Flags"))].split(":")[1].indexOf("complex") > -1 ? "complex" : "real";

  //log("🤔", lines);
  //log(lines.indexOf("Variables:"));

  const varList = [] as VariableType[];
  for (let i = 0; i < varNum; i++) {
    let str = lines[i + lines.indexOf("Variables:") + 1];
    let str2 = str.split("\t");
    log("str2->", str2);
    varList.push({ name: str2[2], type: str2[3] as "voltage" | "current" | "time" });
  }
  //log("varlist->", varList);

  const param = {
    varNum: varNum,
    pointNum: pointNum,
    // why????????????????
    // https://www.digitalocean.com/community/tutorials/copying-objects-in-javascript
    variables: [...varList],
    dataType: dataType,
  } as ParamType;

  log("param->", param);

  return param;
}

function log(message?: any, ...optionalParams: any[]) {
  //console.log(message, optionalParams);
}
