import { StateCreator } from "zustand";
import { ResultType } from "eecircuit-engine";
import { ToBePlotted } from "../types/commonTypes";
import type { AggregatedResult } from "../simulation/resultAggregator";
import { transformResultForComplexData } from "../utils/complexUtils";

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

  // Multi-canvas support
  numCanvases: number;
  isACModeActive: boolean; // Auto-dual mode for AC simulations
  
  // Plot variable management (per canvas)
  selectedVariables: string[];
  hoveredVariable: string | null;
  canvas1SelectedVariables: string[];
  canvas2SelectedVariables: string[];
  canvas1HoveredVariable: string | null;
  canvas2HoveredVariable: string | null;

  // Bracket operation plot state
  bracketOperationResults?: AggregatedResult;
  isBracketOperationPlot: boolean;
  currentParameterValues?: string[];
  emphasizedPlotIndex: number;
}

export interface PlotActions {
  // Plot selection actions
  setIsPlotSelectionMode: (mode: boolean) => void;
  setToBePlotted: (items: ToBePlotted[]) => void;
  addToBePlotted: (item: ToBePlotted) => void;
  removeToBePlotted: (item: ToBePlotted) => void;

  // Multi-canvas actions
  setNumCanvases: (num: 1 | 2) => void;
  setIsACModeActive: (active: boolean) => void;

  // Plot variable actions (legacy - for single canvas mode)
  setSelectedVariables: (variables: string[]) => void;
  setHoveredVariable: (variable: string | null) => void;
  
  // Per-canvas variable actions
  setCanvas1SelectedVariables: (variables: string[]) => void;
  setCanvas2SelectedVariables: (variables: string[]) => void;
  setCanvas1HoveredVariable: (variable: string | null) => void;
  setCanvas2HoveredVariable: (variable: string | null) => void;

  // Bracket operation plot actions
  setBracketOperationResults: (results?: AggregatedResult) => void;
  setIsBracketOperationPlot: (isBracket: boolean) => void;
  setCurrentParameterValues: (values?: string[]) => void;
  setEmphasizedPlotIndex: (index: number) => void;

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
  numCanvases: 1,
  isACModeActive: false,
  selectedVariables: [],
  hoveredVariable: null,
  canvas1SelectedVariables: [],
  canvas2SelectedVariables: [],
  canvas1HoveredVariable: null,
  canvas2HoveredVariable: null,
  bracketOperationResults: undefined,
  isBracketOperationPlot: false,
  currentParameterValues: undefined,
  emphasizedPlotIndex: 0,

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

  // Multi-canvas actions
  setNumCanvases: (num) => set({ numCanvases: num }),
  setIsACModeActive: (active) => set({ isACModeActive: active }),

  // Plot variable actions (legacy - for single canvas mode)
  setSelectedVariables: (variables) => set({ selectedVariables: variables }),
  setHoveredVariable: (variable) => set({ hoveredVariable: variable }),
  
  // Per-canvas variable actions
  setCanvas1SelectedVariables: (variables) => set({ canvas1SelectedVariables: variables }),
  setCanvas2SelectedVariables: (variables) => set({ canvas2SelectedVariables: variables }),
  setCanvas1HoveredVariable: (variable) => set({ canvas1HoveredVariable: variable }),
  setCanvas2HoveredVariable: (variable) => set({ canvas2HoveredVariable: variable }),

  // Bracket operation plot actions
  setBracketOperationResults: (results) => set({ bracketOperationResults: results }),
  setIsBracketOperationPlot: (isBracket) => set({ isBracketOperationPlot: isBracket }),
  setCurrentParameterValues: (values) => set({ currentParameterValues: values }),
  setEmphasizedPlotIndex: (index) => set({ emphasizedPlotIndex: index }),

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
      let firstResult = newResults[0]!;
      
      // Check if this is a bracket operation result
      const isBracketResult = 'bracketOperation' in firstResult && 'parameterValues' in firstResult;
      const aggregatedResult = isBracketResult ? firstResult as AggregatedResult : undefined;
      
      // Transform single simulation results to handle complex data
      let isACSimulation = false;
      if (!isBracketResult && firstResult.dataType === 'complex') {
        isACSimulation = true;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        firstResult = transformResultForComplexData(firstResult) as any;
      }
      
      const newVariableNames = firstResult.variableNames.slice(1); // Skip first variable (frequency/time)

      // Determine which variables to select based on previous user selections
      let variablesToSelect: string[];
      let canvas1Variables: string[] = [];
      let canvas2Variables: string[] = [];
      let numCanvases = 1;
      let isACModeActive = false;

      if (isACSimulation) {
        // AC simulation - automatically set up dual canvas mode
        numCanvases = 2;
        isACModeActive = true;
        
        // Separate magnitude and phase variables
        const magVariables = newVariableNames.filter(name => name.includes('[mag]'));
        const phaseVariables = newVariableNames.filter(name => name.includes('[phase]'));
        
        canvas1Variables = magVariables; // Magnitude canvas
        canvas2Variables = phaseVariables; // Phase canvas
        variablesToSelect = [...magVariables, ...phaseVariables]; // For legacy compatibility
        
        console.log("AC simulation detected, setting up dual canvas mode:", {
          magnitudeVariables: magVariables.length,
          phaseVariables: phaseVariables.length,
          allVariables: newVariableNames
        });
      } else {
        // Non-AC simulation - use single canvas mode with existing logic
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
        
        // For single canvas, use the same selection for canvas1 (canvas2 remains empty)
        canvas1Variables = variablesToSelect;
      }

      // Log bracket operation info (only once when complete)
      if (isBracketResult && aggregatedResult && aggregatedResult.successfulResults === aggregatedResult.parameterCount) {
        console.log("Bracket operation completed:", {
          parameterValues: aggregatedResult.parameterValues?.length,
          successfulResults: aggregatedResult.successfulResults,
          failedResults: aggregatedResult.failedResults,
          totalDataPoints: firstResult.data[0]?.values?.length || 0
        });
      }

      set({
        results: isBracketResult ? newResults : [firstResult],
        isPlotTabEnabled: true,
        mainTabValue: "plot",
        selectedVariables: variablesToSelect,
        // Multi-canvas state
        numCanvases: numCanvases as 1 | 2,
        isACModeActive,
        canvas1SelectedVariables: canvas1Variables,
        canvas2SelectedVariables: canvas2Variables,
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
