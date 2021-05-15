/**
 * map display data to webgl-plot lines
 */

import type { DisplayDataType } from "./EEsim";
import { isComplex, ResultArrayType } from "./sim/simulationArray";

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
