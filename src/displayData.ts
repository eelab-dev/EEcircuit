/**
 * map display data to webgl-plot lines
 */

import { ColorType, getColorByIndex } from "./colors.ts";
import type { ResultType } from "eecircuit-engine";
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
  return displayIndex - offset + sweepIndex * displayDataArray.length;
};

export const makeDD = (
  res: ResultType,
  colorMode: "light" | "dark"
): DisplayDataType[] => {
  const dd = [] as DisplayDataType[];
  if (res.dataType == "complex") {
    const signalCount = res.variableNames.filter((_, i) => i > 0).length;
    let sigIdx = 0;
    res.variableNames.forEach((name, index) => {
      if (index > 0) {
        const color1 = getColorByIndex(sigIdx, signalCount, colorMode);
        sigIdx++;
        dd.push({
          name: name + " (mag)",
          index: 2 * index,
          visible: true,
          color: color1,
        });
        dd.push({
          name: name + " (phase)",
          index: 2 * index + 1,
          visible: true,
          color: color1,
        });
      }
    });
  } else {
    const total = res.variableNames.filter((_, i) => i > 0).length;
    let sigIdx = 0;
    res.variableNames.forEach((name, index) => {
      if (index > 0) {
        dd.push({
          name: name,
          index: index,
          visible: true,
          color: getColorByIndex(sigIdx++, total, colorMode),
        });
      }
    });
  }

  return dd;
};
