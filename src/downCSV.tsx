import { Button } from "@chakra-ui/react";
import React from "react";
import type { ComplexDataType, RealDataType } from "./sim/readOutput";
import { isComplex, ResultArrayType } from "./sim/simulationArray";

type Prop = {
  resultArray?: ResultArrayType;
};

const DownCSV = ({ resultArray }: Prop): JSX.Element => {
  const printCSVReal = (resultArray: ResultArrayType): string => {
    let str = "";
    let strTop = "";

    const vars = resultArray.results[0].param.variables;
    vars.forEach((e) => {
      for (let i = 0; i < resultArray.results.length; i++) {
        const sweepIndex = resultArray.sweep.length > 0 ? `[${resultArray.sweep[i]}]` : "";
        strTop = strTop + e.name + " " + sweepIndex + ",";
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
  };

  const printCSVComplex = (resultArray: ResultArrayType): string => {
    let str = "";
    let strTop = "";

    //const data = resultArray.data  as ComplexDataType;
    const vars = resultArray.results[0].param.variables;
    vars.forEach((e) => {
      for (let i = 0; i < resultArray.results.length; i++) {
        const sweepIndex = resultArray.sweep.length > 0 ? `[${resultArray.sweep[i]}]` : "";
        strTop =
          strTop +
          e.name +
          " " +
          sweepIndex +
          " (real)" +
          "," +
          e.name +
          " " +
          sweepIndex +
          " (img)" +
          ",";
      }
    });
    strTop = strTop + "\n";

    for (let row = 0; row < resultArray.results[0].data[0].length; row++) {
      for (let col = 0; col < resultArray.results[0].data.length; col++) {
        //console.log(out2[col][row]);
        for (let i = 0; i < resultArray.results.length; i++) {
          const data = resultArray.results[i].data as ComplexDataType;
          str =
            str +
            data[col][row].real.toExponential(3) +
            "," +
            data[col][row].img.toExponential(3) +
            ",";
        }
      }
      str = str + "\n";
    }
    return strTop + str;
  };

  const printCSV = (resultArray?: ResultArrayType): string => {
    if (resultArray) {
      if (isComplex(resultArray)) {
        return printCSVComplex(resultArray);
      } else {
        return printCSVReal(resultArray);
      }
    } else {
      return "";
    }
  };

  return (
    <>
      <a
        href={`data:text/plain;charset=utf-8,${encodeURIComponent(printCSV(resultArray))}`}
        download={"eesim.csv"}>
        <Button colorScheme="blue">Download</Button>
      </a>
    </>
  );
};

export default DownCSV;
