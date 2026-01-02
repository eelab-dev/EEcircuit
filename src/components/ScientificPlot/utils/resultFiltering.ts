import { ResultType, RealDataType, ComplexDataType } from "eecircuit-engine";
import { isInternalSignal } from "./signalUtils";

/**
 * Filters out internal signals (those starting with 'x' or 'X' via isInternalSignal)
 * from the simulation results if showInternalSignals is false.
 *
 * @param results - The original simulation results.
 * @param showInternalSignals - Whether internal signals should be included in the output.
 * @returns The filtered results or the original results if no filtering is needed.
 */
export const filterInternalSignals = (
  results: ResultType[],
  showInternalSignals: boolean
): ResultType[] => {
  if (showInternalSignals || results.length === 0) {
    return results;
  }

  return results.map((result) => {
    if (!result.variableNames || !result.data) return result;

    // Identify indices to keep
    // Always keep index 0 (X-axis)
    const indicesToKeep = [0];

    // Check other signals
    for (let i = 1; i < result.variableNames.length; i++) {
      const name = result.variableNames[i];
      if (name && !isInternalSignal(name)) {
        indicesToKeep.push(i);
      }
    }

    // If we kept everything, return original result to preserve reference equality if possible
    if (indicesToKeep.length === result.variableNames.length) {
      return result;
    }

    // Create filtered arrays
    const filteredVariableNames = indicesToKeep.map(
      (i) => result.variableNames[i]
    ) as string[];

    // Handle discriminated union to ensure types match
    if (result.dataType === "real") {
      const filteredData = indicesToKeep.map(
        (i) => result.data[i]
      ) as RealDataType[];

      return {
        ...result,
        variableNames: filteredVariableNames,
        data: filteredData,
        numVariables: filteredVariableNames.length,
      };
    } else {
      const filteredData = indicesToKeep.map(
        (i) => result.data[i]
      ) as ComplexDataType[];

      return {
        ...result,
        variableNames: filteredVariableNames,
        data: filteredData,
        numVariables: filteredVariableNames.length,
      };
    }
  });
};
