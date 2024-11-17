/**
 * map display data to webgl-plot lines
 */

import { ColorType, getColor } from "./colors.ts";
import type { ResultType } from "./sim/readOutput.ts";
import { isComplex, ResultArrayType } from "./sim/simulationArray.ts";

export type DisplayDataType = {
  name: string;
  index: number; //result index
  color: ColorType;
  visible: boolean;
};

export const mapD2W = (
  displayIndex: number,
  sweepIndex: number,
  displayDataArray: DisplayDataType[],
  resultArray: ResultArrayType
): number => {
  const offset = isComplex(resultArray) ? 2 : 1;
  const sweepLength = resultArray.sweep.length;
  return displayIndex - offset + sweepIndex * displayDataArray.length;
};

export const makeDD = (res: ResultType): DisplayDataType[] => {
  let dd = [] as DisplayDataType[];
  if (res.param.dataType == "complex") {
    res.param.variables.forEach((e, i) => {
      if (i > 0) {
        const color1 = getColor();
        dd.push({ name: e.name + " (mag)", index: 2 * i, visible: true, color: color1 });
        dd.push({ name: e.name + " (phase)", index: 2 * i + 1, visible: true, color: color1 });
      }
    });
  } else {
    res.param.variables.forEach((e, i) => {
      if (i > 0) {
        dd.push({ name: e.name, index: i, visible: true, color: getColor() });
      }
    });
  }

  console.log("makeDD->", dd);
  return dd;
};
