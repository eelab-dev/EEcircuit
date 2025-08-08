import { StateCreator } from "zustand";
import { ResultType } from "eecircuit-engine";
import { ToBePlotted } from "../types/commonTypes";
import type { AggregatedResult } from "../simulation/resultAggregator";
import type { BracketOperation } from "../utils/bracketParser";

// Define the store interface that includes both plot and tab slices
interface StoreWithTabAndSimulation {
  // Tab management
  isPlotTabEnabled: boolean;
  mainTabValue: "schematic" | "simulate" | "plot";
  setIsPlotTabEnabled: (enabled: boolean) => void;
  setMainTabValue: (tab: "schematic" | "simulate" | "plot") => void;

  // Simulation results
  results: ResultType[];
  setResults: (results: ResultType[]) => void;
}

// Plot state and actions
export interface PlotState {
  // Plot selection
  isPlotSelectionMode: boolean;
  toBePlotted: ToBePlotted[];

  // Plot variable management
  selectedVariables: string[];
  hoveredVariable: string | null;

  // Bracket operation plot state
  bracketOperationResults?: AggregatedResult;
  isBracketOperationPlot: boolean;
  currentParameterValues?: string[];
}

export interface PlotActions {
  // Plot selection actions
  setIsPlotSelectionMode: (mode: boolean) => void;
  setToBePlotted: (items: ToBePlotted[]) => void;
  addToBePlotted: (item: ToBePlotted) => void;
  removeToBePlotted: (item: ToBePlotted) => void;

  // Plot variable actions
  setSelectedVariables: (variables: string[]) => void;
  setHoveredVariable: (variable: string | null) => void;

  // Bracket operation plot actions
  setBracketOperationResults: (results?: AggregatedResult) => void;
  setIsBracketOperationPlot: (isBracket: boolean) => void;
  setCurrentParameterValues: (values?: string[]) => void;

  // Combined actions for common operations
  handleNewResults: (results: ResultType[]) => void;
  enterPlotSelectionMode: () => void;
  exitPlotSelectionMode: () => void;
}

export type PlotSlice = PlotState & PlotActions;

export const createPlotSlice: StateCreator<
  PlotSlice & StoreWithTabAndSimulation,
  [],
  [],
  PlotSlice
> = (set, get) => ({
  // Initial state
  isPlotSelectionMode: false,
  toBePlotted: [],
  selectedVariables: [],
  hoveredVariable: null,
  bracketOperationResults: undefined,
  isBracketOperationPlot: false,
  currentParameterValues: undefined,

  // Plot selection actions
  setIsPlotSelectionMode: (mode) => set({ isPlotSelectionMode: mode }),
  setToBePlotted: (items) => set({ toBePlotted: items }),

  addToBePlotted: (item) =>
    set((state: PlotSlice & StoreWithTabAndSimulation) => {
      // Check if item already exists to prevent duplicates
      const exists = state.toBePlotted.some(
        (existing: ToBePlotted) =>
          existing.type === item.type && existing.name === item.name
      );

      if (!exists) {
        return { toBePlotted: [...state.toBePlotted, item] };
      }
      return state;
    }),

  removeToBePlotted: (item) =>
    set((state: PlotSlice & StoreWithTabAndSimulation) => ({
      toBePlotted: state.toBePlotted.filter(
        (existing: ToBePlotted) =>
          !(existing.type === item.type && existing.name === item.name)
      ),
    })),

  // Plot variable actions
  setSelectedVariables: (variables) => set({ selectedVariables: variables }),
  setHoveredVariable: (variable) => set({ hoveredVariable: variable }),

  // Bracket operation plot actions
  setBracketOperationResults: (results) => set({ bracketOperationResults: results }),
  setIsBracketOperationPlot: (isBracket) => set({ isBracketOperationPlot: isBracket }),
  setCurrentParameterValues: (values) => set({ currentParameterValues: values }),

  // Combined actions for common operations
  handleNewResults: (newResults) => {
    // Double-check that we have valid results before enabling plot tab
    const hasValidResults =
      newResults &&
      newResults.length > 0 &&
      newResults[0]!.data &&
      newResults[0]!.data.length > 0 &&
      newResults[0]!.variableNames &&
      newResults[0]!.variableNames.length > 0;

    // Additional check for actual data points
    let hasDataPoints = false;
    if (hasValidResults) {
      hasDataPoints = newResults[0]!.data.some(
        (dataSet) => dataSet!.values && dataSet!.values.length > 0
      );
    }

    if (hasValidResults && hasDataPoints) {
      const currentState = get();
      const firstResult = newResults[0]!;
      const newVariableNames = firstResult!.variableNames.slice(1); // Skip first variable (usually time/x-axis)

      // Check if this is a bracket operation result
      const isBracketResult = 'bracketOperation' in firstResult && 'parameterValues' in firstResult;
      const aggregatedResult = isBracketResult ? firstResult as AggregatedResult : undefined;

      // Determine which variables to select based on previous user selections
      let variablesToSelect: string[];

      if (currentState.selectedVariables.length === 0) {
        // No previous selection - select all variables by default
        variablesToSelect = newVariableNames;
        console.log("No previous selection found, selecting all variables");
      } else {
        // Preserve previously selected variables that still exist in new results
        variablesToSelect = currentState.selectedVariables.filter(
          (variable: string) => newVariableNames.includes(variable)
        );

        // Log which variables were preserved vs removed
        const removedVariables = currentState.selectedVariables.filter(
          (variable: string) => !newVariableNames.includes(variable)
        );

        if (removedVariables.length > 0) {
          console.log(
            "Variables removed from selection (no longer in results):",
            removedVariables
          );
        }

        if (variablesToSelect.length > 0) {
          console.log(
            "Variables preserved from previous selection:",
            variablesToSelect
          );
        } else {
          // All previously selected variables are gone, select all new ones
          variablesToSelect = newVariableNames;
          console.log(
            "All previous variables removed, selecting all new variables"
          );
        }
      }

      // Log bracket operation info
      if (isBracketResult && aggregatedResult) {
        console.log("Bracket operation results received:");
        console.log("- Parameter values:", aggregatedResult.parameterValues);
        console.log("- Successful results:", aggregatedResult.successfulResults);
        console.log("- Failed results:", aggregatedResult.failedResults);
        console.log("- Total data points:", firstResult.data[0]?.values?.length || 0);
      }

      set({
        results: newResults,
        isPlotTabEnabled: true,
        mainTabValue: "plot",
        selectedVariables: variablesToSelect,
        // Set bracket operation specific state
        bracketOperationResults: aggregatedResult,
        isBracketOperationPlot: isBracketResult,
        currentParameterValues: aggregatedResult?.parameterValues,
      });
    } else {
      console.warn(
        "handleNewResults called with invalid results, not enabling plot tab"
      );
    }
  },

  enterPlotSelectionMode: () => {
    set({
      isPlotSelectionMode: true,
      mainTabValue: "schematic",
    });
  },

  exitPlotSelectionMode: () => {
    set({
      isPlotSelectionMode: false,
      mainTabValue: "simulate",
    });
  },
});
