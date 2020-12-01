import { Button } from "@chakra-ui/react";
import React from "react";
import type { ResultType, VariableType } from "./sim/readOutput";

type Prop = {
  results?: ResultType;
};

export default function DownCSV({ results }: Prop): JSX.Element {
  function printCSV(results?: ResultType): string {
    let str = "";
    let strTop = "";

    const data = results ? results.data : [[]];
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
