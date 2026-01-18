import { StateCreator } from "zustand";
import { ResultType } from "eecircuit-engine";
import { ToBePlotted } from "../types/commonTypes";
import { areToBePlottedItemsEqual } from "../utils/toBePlotted";
import type { AggregatedResult } from "../simulation/resultAggregator";
import { transformResultForComplexData } from "../utils/complexUtils";

// Define the store interface that includes both plot and tab slices
interface StoreWithTabAndSimulation {
  // Tab management
  isPlottingTabEnabled: boolean;
  mainTabValue: "schematic" | "simulate" | "plot";
  setIsPlottingTabEnabled: (enabled: boolean) => void;
  setMainTabValue: (tab: "schematic" | "simulate" | "plot") => void;

  // Simulation results
  results: ResultType[];
  setResults: (results: ResultType[]) => void;
}

// Plot state and actions
export interface PlotState {
  // To-be-plotted selection
  isToBePlottedMode: boolean;
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

  // Log axis state
  isLogX: boolean;
  isLogY: boolean;
  isLogY1: boolean;
  isLogY2: boolean;
  // Canvas-specific log Y state
  canvas1IsLogY: boolean;
  canvas2IsLogY: boolean;

  // Track previous variable names for schema change detection
  previousVariableNames: string[] | null;
  lineThickness: number;
  showInternalSignals: boolean;
}

export interface PlotActions {
  // To-be-plotted selection actions
  setIsToBePlottedMode: (mode: boolean) => void;
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

  // Log axis actions
  setIsLogX: (isLog: boolean) => void;
  setIsLogY: (isLog: boolean) => void;
  setIsLogY1: (isLog: boolean) => void;
  setIsLogY2: (isLog: boolean) => void;
  toggleLogX: () => void;
  toggleLogY: () => void;
  toggleLogY1: () => void;
  toggleLogY2: () => void;
  // Canvas-specific log Y actions
  setCanvas1IsLogY: (isLog: boolean) => void;
  setCanvas2IsLogY: (isLog: boolean) => void;
  toggleCanvas1LogY: () => void;
  toggleCanvas2LogY: () => void;

  // Clear/reset actions
  clearResults: () => void;
  resetVariableSelections: () => void;
  resetPlotState: () => void;
  setLineThickness: (thickness: number) => void;
  setShowInternalSignals: (show: boolean) => void;

  // Combined actions for common operations
  handleNewResults: (results: ResultType[]) => void;
  enterToBePlottedMode: () => void;
  exitToBePlottedMode: () => void;
  
  // Bulk update action
  updatePlotConfig: (config: Partial<PlotState>) => void;
}

export type PlotSlice = PlotState & PlotActions;

export const createPlotSlice: StateCreator<
  PlotSlice & StoreWithTabAndSimulation,
  [],
  [],
  PlotSlice
> = (set, get) => ({
  // Initial state
  isToBePlottedMode: false,
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
  isLogX: false,
  isLogY: false,
  isLogY1: false,
  isLogY2: false,
  canvas1IsLogY: false,
  canvas2IsLogY: false,
  previousVariableNames: null,
  lineThickness: 3,
  showInternalSignals: false,

  // To-be-plotted selection actions
  setIsToBePlottedMode: (mode) => set({ isToBePlottedMode: mode }),
  setToBePlotted: (items) => set({ toBePlotted: items }),

  addToBePlotted: (item) =>
    set((state: PlotSlice & StoreWithTabAndSimulation) => {
      const exists = state.toBePlotted.some((existing: ToBePlotted) =>
        areToBePlottedItemsEqual(existing, item)
      );

      if (!exists) {
        return { toBePlotted: [...state.toBePlotted, item] };
      }
      return state;
    }),

  removeToBePlotted: (item) =>
    set((state: PlotSlice & StoreWithTabAndSimulation) => ({
      toBePlotted: state.toBePlotted.filter(
        (existing: ToBePlotted) => !areToBePlottedItemsEqual(existing, item)
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

  // Log axis actions
  setIsLogX: (isLog) => set({ isLogX: isLog }),
  setIsLogY: (isLog) => set({ isLogY: isLog }),
  setIsLogY1: (isLog) => set({ isLogY1: isLog }),
  setIsLogY2: (isLog) => set({ isLogY2: isLog }),
  toggleLogX: () => set((state: PlotSlice & StoreWithTabAndSimulation) => ({ isLogX: !state.isLogX })),
  toggleLogY: () => set((state: PlotSlice & StoreWithTabAndSimulation) => ({ isLogY: !state.isLogY })),
  toggleLogY1: () => set((state: PlotSlice & StoreWithTabAndSimulation) => ({ isLogY1: !state.isLogY1 })),
  toggleLogY2: () => set((state: PlotSlice & StoreWithTabAndSimulation) => ({ isLogY2: !state.isLogY2 })),
  // Canvas-specific log Y actions
  setCanvas1IsLogY: (isLog) => set({ canvas1IsLogY: isLog }),
  setCanvas2IsLogY: (isLog) => set({ canvas2IsLogY: isLog }),
  toggleCanvas1LogY: () => set((state: PlotSlice & StoreWithTabAndSimulation) => ({ canvas1IsLogY: !state.canvas1IsLogY })),
  toggleCanvas2LogY: () => set((state: PlotSlice & StoreWithTabAndSimulation) => ({ canvas2IsLogY: !state.canvas2IsLogY })),

  // Clear/reset actions
  clearResults: () => set({
    results: [],
    bracketOperationResults: undefined,
    isBracketOperationPlot: false,
    currentParameterValues: undefined,
    emphasizedPlotIndex: 0,
  }),

  resetVariableSelections: () => set({
    selectedVariables: [],
    hoveredVariable: null,
    canvas1SelectedVariables: [],
    canvas2SelectedVariables: [],
    canvas1HoveredVariable: null,
    canvas2HoveredVariable: null,
  }),

  resetPlotState: () => set({
    numCanvases: 1,
    isACModeActive: false,
    isLogX: false,
    isLogY: false,
    isLogY1: false,
    isLogY2: false,
    canvas1IsLogY: false,
    canvas2IsLogY: false,
  }),

  setLineThickness: (thickness) => set({ lineThickness: thickness }),
  setShowInternalSignals: (show) => set({ showInternalSignals: show }),

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
        firstResult = transformResultForComplexData(firstResult);
      } else if (isBracketResult && (
        firstResult.dataType === 'complex' || 
        (firstResult.variableNames && firstResult.variableNames[0] === 'frequency') ||
        firstResult.header?.includes("Plotname: AC Analysis")
      )) {
        // Bracket operation with complex data - already transformed in aggregation
        isACSimulation = true;
      }

      const newVariableNames = firstResult.variableNames.slice(1); // Skip first variable (frequency/time)
      const currentVariableNamesJson = JSON.stringify(newVariableNames);
      const prevVariableNamesJson = JSON.stringify(currentState.previousVariableNames || []);
      
      const areResultVariableNamesUnchanged = currentVariableNamesJson === prevVariableNamesJson && currentState.previousVariableNames !== null;

      // Determine which variables to select based on previous user selections
      let variablesToSelect: string[];
      let canvas1Variables: string[] = [];
      let canvas2Variables: string[] = [];
      let numCanvases = currentState.numCanvases; // Preserve existing canvas mode
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

      } else {
        // Non-AC simulation - preserve existing canvas configuration
        if (numCanvases === 2) {
          // User has dual canvas mode - distribute variables based on existing selections
          const existingCanvas1 = currentState.canvas1SelectedVariables.filter(
            (variable: string) => newVariableNames.includes(variable)
          );
          const existingCanvas2 = currentState.canvas2SelectedVariables.filter(
            (variable: string) => newVariableNames.includes(variable)
          );

          canvas1Variables = existingCanvas1.length > 0 ? existingCanvas1 : newVariableNames;
          canvas2Variables = existingCanvas2;
          variablesToSelect = [...canvas1Variables, ...canvas2Variables];
        } else {
          // Single canvas mode
          if (currentState.selectedVariables.length === 0) {
            // No previous selection - select all variables by default
            variablesToSelect = newVariableNames;
          } else {
            // Preserve previously selected variables that still exist in new results
            variablesToSelect = currentState.selectedVariables.filter(
              (variable: string) => newVariableNames.includes(variable)
            );

            if (variablesToSelect.length === 0) {
              // All previously selected variables are gone, select all new ones
              variablesToSelect = newVariableNames;
            }
          }
          canvas1Variables = variablesToSelect;
        }
      }


      // Simple logic: check if we have valid existing selections to preserve
      const hasExistingValidSelections = currentState.selectedVariables.length > 0 || 
                                        currentState.canvas1SelectedVariables.length > 0 || 
                                        currentState.canvas2SelectedVariables.length > 0;
      
      // If ResultVariableNames are unchanged, we force "preservation" even if lists are empty (meaning user deselected all)
      const shouldPreserveSelections = areResultVariableNamesUnchanged || hasExistingValidSelections;
      

      set({
        results: [firstResult], // Always use firstResult which has been processed correctly
        isPlottingTabEnabled: true,
        mainTabValue: "plot",
        
        // Canvas mode - AC simulations always need dual canvas
        numCanvases: numCanvases as 1 | 2,
        isACModeActive,
        
        // Variable selections - only update if no valid existing selections AND ResultVariableNames changed
        ...(shouldPreserveSelections ? {} : {
          selectedVariables: variablesToSelect,
          canvas1SelectedVariables: canvas1Variables,
          canvas2SelectedVariables: canvas2Variables,
        }),
        
        previousVariableNames: newVariableNames,
        
        // Log scaling configuration for AC simulations
        ...(isACSimulation && {
          isLogX: true,    // Frequency axis should be logarithmic
          isLogY1: true,   // Magnitude plot should be logarithmic
          isLogY2: false,  // Phase plot should be linear
        }),
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

  enterToBePlottedMode: () => {
    set({
      isToBePlottedMode: true,
      mainTabValue: "schematic",
    });
  },

  exitToBePlottedMode: () => {
    set({
      isToBePlottedMode: false,
      mainTabValue: "simulate",
    });
  },

  updatePlotConfig: (config) => set((state) => ({ ...state, ...config })),
});
