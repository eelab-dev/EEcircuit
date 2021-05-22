import { Button } from "@chakra-ui/react";
import React from "react";
import type { ComplexDataType, RealDataType } from "./sim/readOutput";
import type { ResultArrayType } from "./sim/simulationArray";

type Prop = {
  resultArray?: ResultArrayType;
};

export default function DownCSV({ resultArray }: Prop): JSX.Element {
  function printCSVReal(resultArray: ResultArrayType): string {
    let str = "";
    let strTop = "";

    const vars = resultArray.results[0].param.variables;
    vars.forEach((e) => {
      for (let i = 0; i < resultArray.results.length; i++) {
        const sweepIndex = resultArray.sweep.length > 0 ? `[${resultArray.sweep[i]}]` : "";
        strTop = strTop + e.name + sweepIndex + ",";
      }
    });
    strTop = strTop + "\n";

    for (let row = 0; row < resultArray.results[0].data[0].length; row++) {
      for (let col = 0; col < resultArray.results[0].data.length; col++) {
        for (let i = 0; i < resultArray.results.length; i++) {
          const data = resultArray.results[i].data as RealDataType;
          str = str + data[col][row].toExponential(3) + ",";
        }
      }
      str = str + "\n";
    }
    return strTop + str;
  }

  function printCSVComplex(resultArray: ResultArrayType): string {
    /*let str = "";
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
    return strTop + str;*/
    return "";
  }

  function printCSV(resultArray?: ResultArrayType): string {
    if (resultArray) {
      if (resultArray.results[0].param.dataType == "complex") {
        return printCSVComplex(resultArray);
      } else {
        return printCSVReal(resultArray);
      }
    } else {
      return "";
    }
  }

  return (
    <>
      <a
        href={`data:text/plain;charset=utf-8,${encodeURIComponent(printCSV(resultArray))}`}
        download={"eesim.csv"}>
        <Button colorScheme="blue">Download</Button>
      </a>
    </>
  );
}
