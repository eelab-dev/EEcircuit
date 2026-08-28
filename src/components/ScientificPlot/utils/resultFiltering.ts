import type { ResultType, RealDataType, ComplexDataType } from "eecircuit-engine";
import { isInternalSignal } from "./signalUtils";
import { AggregatedResult } from "../types";

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
    // Handle discriminated union to ensure types match
    const bracketPlotData = (result as Partial<AggregatedResult>).bracketPlotData;
    
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

    let baseResult: ResultType;

    if (result.dataType === "real") {
      baseResult = {
        ...result,
        variableNames: filteredVariableNames,
        data: indicesToKeep.map((i) => result.data[i]) as RealDataType[],
        numVariables: filteredVariableNames.length,
      };
    } else {
      baseResult = {
        ...result,
        variableNames: filteredVariableNames,
        data: indicesToKeep.map((i) => result.data[i]) as ComplexDataType[],
        numVariables: filteredVariableNames.length,
      };
    }

    // Explicitly preserve bracketPlotData (and filter it if needed)
    if (bracketPlotData) {
        // Return as ResultType, casting via unknown if needed because AggregatedResult structure 
        // adds properties that might not be in the strict ResultType union definition
        // but are valid at runtime.
        const augmentedResult = {
            ...baseResult,
            bracketPlotData: bracketPlotData.map((sweep) => ({
                ...sweep,
                data: indicesToKeep.map(i => sweep.data[i]!)
            }))
        };
        return augmentedResult as unknown as ResultType;
    }
    
    return baseResult;
  });
};
