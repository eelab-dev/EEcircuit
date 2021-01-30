import { Button } from "@chakra-ui/react";
import React from "react";
import type { ComplexDataType, RealDataType, ResultType, VariableType } from "./sim/readOutput";

type Prop = {
  results?: ResultType;
};

export default function DownCSV({ results }: Prop): JSX.Element {
  function printCSVReal(results: ResultType): string {
    let str = "";
    let strTop = "";

    const data = (results ? results.data : [[]]) as RealDataType;
    const vars = results ? results.param.variables : ([] as VariableType[]);
    vars.forEach((e) => {
      strTop = strTop + e.name + ",";
    });
    strTop = strTop + "\n";

    //data = data.length == 0 ? [[0], [1]] : data;

    for (let row = 0; row < data[0].length; row++) {
      for (let col = 0; col < data.length; col++) {
        //console.log(out2[col][row]);
        str = str + data[col][row].toExponential(3) + ",";
      }
      str = str + "\n";
    }
    return strTop + str;
  }

  function printCSVComplex(results: ResultType): string {
    let str = "";
    let strTop = "";

    const data = (results ? results.data : [[]]) as ComplexDataType;
    const vars = results ? results.param.variables : ([] as VariableType[]);
    vars.forEach((e) => {
      strTop = strTop + e.name + " (real)" + "," + e.name + " (img)" + ",";
    });
    strTop = strTop + "\n";

    for (let row = 0; row < data[0].length; row++) {
      for (let col = 0; col < data.length; col++) {
        //console.log(out2[col][row]);
        str =
          str +
          data[col][row].real.toExponential(3) +
          "," +
          data[col][row].img.toExponential(3) +
          ",";
      }
      str = str + "\n";
    }
    return strTop + str;
  }

  function printCSV(results?: ResultType): string {
    if (results) {
      if (results.param.dataType == "complex") {
        return printCSVComplex(results);
      } else {
        return printCSVReal(results);
      }
    } else {
      return "";
    }
  }

  return (
    <>
      <a
        href={`data:text/plain;charset=utf-8,${encodeURIComponent(printCSV(results))}`}
        download={"eesim.csv"}>
        <Button colorScheme="blue">Download</Button>
      </a>
    </>
  );
}
