import { create } from "zustand";
import { ResultType } from "eecircuit-engine";
import { Schematic as SchematicType } from "eecircuit-schematic";
import { SimulationType, ToBePlotted } from "../types/commonTypes";

// Define the state interface
interface AppState {
  // Tab management
  mainTabValue: "schematic" | "simulate" | "plot";
  isSimulateTabEnabled: boolean;
  isPlotTabEnabled: boolean;

  // Netlist and simulation results
  netList: string;
  results: ResultType[];

  // Simulation configuration
  selectedSimType: SimulationType["type"];
  simulationConfig?: SimulationType;
  allSimulationConfigs: SimulationType[];

  // Schematic state
  shouldFitToScreen: boolean;
  hasResizedSinceSchematicView: boolean;
  hasViewedSchematic: boolean;
  currentSchematic?: SchematicType;

  // UI state
  inputProfile: "mouse" | "trackpad";
  dragBox: boolean;

  // Plot selection
  isPlotSelectionMode: boolean;
  toBePlotted: ToBePlotted[];

  // Plot state
  selectedVariables: string[];
  hoveredVariable: string | null;
}

// Define the actions interface
interface AppActions {
  // Tab actions
  setMainTabValue: (tab: AppState["mainTabValue"]) => void;
  setIsSimulateTabEnabled: (enabled: boolean) => void;
  setIsPlotTabEnabled: (enabled: boolean) => void;

  // Netlist and simulation actions
  setNetList: (netList: string) => void;
  setResults: (results: ResultType[]) => void;

  // Simulation configuration actions
  setSelectedSimType: (type: SimulationType["type"]) => void;
  setSimulationConfig: (config?: SimulationType) => void;
  setAllSimulationConfigs: (configs: SimulationType[]) => void;
  addSimulationConfig: (config: SimulationType) => void;
  updateSimulationConfig: (index: number, config: SimulationType) => void;
  deleteSimulationConfig: (index: number) => void;

  // Schematic actions
  setShouldFitToScreen: (should: boolean) => void;
  setHasResizedSinceSchematicView: (has: boolean) => void;
  setHasViewedSchematic: (has: boolean) => void;
  setCurrentSchematic: (schematic?: SchematicType) => void;

  // UI actions
  setInputProfile: (profile: "mouse" | "trackpad") => void;
  setDragBox: (show: boolean) => void;

  // Plot selection actions
  setIsPlotSelectionMode: (mode: boolean) => void;
  setToBePlotted: (items: ToBePlotted[]) => void;
  addToBePlotted: (item: ToBePlotted) => void;
  removeToBePlotted: (item: ToBePlotted) => void;

  // Plot actions
  setSelectedVariables: (variables: string[]) => void;
  setHoveredVariable: (variable: string | null) => void;

  // Combined actions for common operations
  exportNetlist: (netlist: string) => void;
  handleNewResults: (results: ResultType[]) => void;
  toggleInputProfile: () => void;
  enterPlotSelectionMode: () => void;
  exitPlotSelectionMode: () => void;
}

// Create the store with initial state and actions
export const useAppStore = create<AppState & AppActions>((set, get) => ({
  // Initial state
  mainTabValue: "schematic",
  isSimulateTabEnabled: false,
  isPlotTabEnabled: false,

  netList: "",
  results: [],

  selectedSimType: "None",
  simulationConfig: undefined,
  allSimulationConfigs: [],

  shouldFitToScreen: false,
  hasResizedSinceSchematicView: false,
  hasViewedSchematic: false,
  currentSchematic: undefined,

  inputProfile: "trackpad",
  dragBox: false,

  isPlotSelectionMode: false,
  toBePlotted: [],

  selectedVariables: [],
  hoveredVariable: null,

  // Tab actions
  setMainTabValue: (tab) => set({ mainTabValue: tab }),
  setIsSimulateTabEnabled: (enabled) => set({ isSimulateTabEnabled: enabled }),
  setIsPlotTabEnabled: (enabled) => set({ isPlotTabEnabled: enabled }),

  // Netlist and simulation actions
  setNetList: (netList) => set({ netList }),
  setResults: (results) => set({ results }),

  // Simulation configuration actions
  setSelectedSimType: (type) => set({ selectedSimType: type }),
  setSimulationConfig: (config) => set({ simulationConfig: config }),
  setAllSimulationConfigs: (configs) => set({ allSimulationConfigs: configs }),

  addSimulationConfig: (config) =>
    set((state) => ({
      allSimulationConfigs: [...state.allSimulationConfigs, config],
    })),

  updateSimulationConfig: (index, config) =>
    set((state) => ({
      allSimulationConfigs: state.allSimulationConfigs.map((c, i) =>
        i === index ? config : c
      ),
    })),

  deleteSimulationConfig: (index) =>
    set((state) => ({
      allSimulationConfigs: state.allSimulationConfigs.filter(
        (_, i) => i !== index
      ),
    })),

  // Schematic actions
  setShouldFitToScreen: (should) => set({ shouldFitToScreen: should }),
  setHasResizedSinceSchematicView: (has) =>
    set({ hasResizedSinceSchematicView: has }),
  setHasViewedSchematic: (has) => set({ hasViewedSchematic: has }),
  setCurrentSchematic: (schematic) => set({ currentSchematic: schematic }),

  // UI actions
  setInputProfile: (profile) => set({ inputProfile: profile }),
  setDragBox: (show) => set({ dragBox: show }),

  // Plot selection actions
  setIsPlotSelectionMode: (mode) => set({ isPlotSelectionMode: mode }),
  setToBePlotted: (items) => set({ toBePlotted: items }),

  addToBePlotted: (item) =>
    set((state) => {
      // Check if item already exists
      const exists = state.toBePlotted.some(
        (existing) => existing.type === item.type && existing.name === item.name
      );

      if (!exists) {
        return { toBePlotted: [...state.toBePlotted, item] };
      }
      return state;
    }),

  removeToBePlotted: (item) =>
    set((state) => ({
      toBePlotted: state.toBePlotted.filter(
        (existing) =>
          !(existing.type === item.type && existing.name === item.name)
      ),
    })),

  // Plot actions
  setSelectedVariables: (variables) => set({ selectedVariables: variables }),
  setHoveredVariable: (variable) => set({ hoveredVariable: variable }),

  // Combined actions for common operations
  exportNetlist: (netlist) => {
    const netListPreamble = `
* Netlist generated by EEcircuit
.include modelcard.CMOS90
`;
    const netlistWithPreamble = netListPreamble + netlist;

    set({
      netList: netlistWithPreamble,
      isSimulateTabEnabled: true,
      mainTabValue: "simulate",
    });
  },

  handleNewResults: (newResults) => {
    // Double-check that we have valid results before enabling plot tab
    const hasValidResults =
      newResults &&
      newResults.length > 0 &&
      newResults[0].data &&
      newResults[0].data.length > 0 &&
      newResults[0].variableNames &&
      newResults[0].variableNames.length > 0;

    // Additional check for actual data points
    let hasDataPoints = false;
    if (hasValidResults) {
      hasDataPoints = newResults[0].data.some(
        (dataSet) => dataSet.values && dataSet.values.length > 0
      );
    }

    if (hasValidResults && hasDataPoints) {
      set({
        results: newResults,
        isPlotTabEnabled: true,
        mainTabValue: "plot",
        // Initialize with all variables selected by default (skip first variable which is usually time)
        selectedVariables: newResults[0].variableNames.slice(1),
      });
    } else {
      console.warn(
        "handleNewResults called with invalid results, not enabling plot tab"
      );
    }
  },

  toggleInputProfile: () => {
    const currentProfile = get().inputProfile;
    const newProfile = currentProfile === "mouse" ? "trackpad" : "mouse";
    set({ inputProfile: newProfile });

    // Send command to update input profile in schematic canvas
    import("eecircuit-schematic").then(({ sendCommand }) => {
      sendCommand({
        command: "setInputProfile",
        profile: newProfile,
      });
    });
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
}));

// Selector hooks for common state combinations
export const useTabState = () => {
  const mainTabValue = useAppStore((state) => state.mainTabValue);
  const isSimulateTabEnabled = useAppStore(
    (state) => state.isSimulateTabEnabled
  );
  const isPlotTabEnabled = useAppStore((state) => state.isPlotTabEnabled);
  const setMainTabValue = useAppStore((state) => state.setMainTabValue);

  return {
    mainTabValue,
    isSimulateTabEnabled,
    isPlotTabEnabled,
    setMainTabValue,
  };
};

export const useSimulationState = () => {
  const selectedSimType = useAppStore((state) => state.selectedSimType);
  const simulationConfig = useAppStore((state) => state.simulationConfig);
  const allSimulationConfigs = useAppStore(
    (state) => state.allSimulationConfigs
  );
  const setSelectedSimType = useAppStore((state) => state.setSelectedSimType);
  const setSimulationConfig = useAppStore((state) => state.setSimulationConfig);
  const setAllSimulationConfigs = useAppStore(
    (state) => state.setAllSimulationConfigs
  );
  const addSimulationConfig = useAppStore((state) => state.addSimulationConfig);
  const updateSimulationConfig = useAppStore(
    (state) => state.updateSimulationConfig
  );
  const deleteSimulationConfig = useAppStore(
    (state) => state.deleteSimulationConfig
  );

  return {
    selectedSimType,
    simulationConfig,
    allSimulationConfigs,
    setSelectedSimType,
    setSimulationConfig,
    setAllSimulationConfigs,
    addSimulationConfig,
    updateSimulationConfig,
    deleteSimulationConfig,
  };
};

export const useSchematicState = () => {
  const shouldFitToScreen = useAppStore((state) => state.shouldFitToScreen);
  const hasResizedSinceSchematicView = useAppStore(
    (state) => state.hasResizedSinceSchematicView
  );
  const hasViewedSchematic = useAppStore((state) => state.hasViewedSchematic);
  const currentSchematic = useAppStore((state) => state.currentSchematic);
  const setShouldFitToScreen = useAppStore(
    (state) => state.setShouldFitToScreen
  );
  const setHasResizedSinceSchematicView = useAppStore(
    (state) => state.setHasResizedSinceSchematicView
  );
  const setHasViewedSchematic = useAppStore(
    (state) => state.setHasViewedSchematic
  );
  const setCurrentSchematic = useAppStore((state) => state.setCurrentSchematic);

  return {
    shouldFitToScreen,
    hasResizedSinceSchematicView,
    hasViewedSchematic,
    currentSchematic,
    setShouldFitToScreen,
    setHasResizedSinceSchematicView,
    setHasViewedSchematic,
    setCurrentSchematic,
  };
};

export const usePlotSelectionState = () => {
  const isPlotSelectionMode = useAppStore((state) => state.isPlotSelectionMode);
  const toBePlotted = useAppStore((state) => state.toBePlotted);
  const addToBePlotted = useAppStore((state) => state.addToBePlotted);
  const removeToBePlotted = useAppStore((state) => state.removeToBePlotted);
  const setToBePlotted = useAppStore((state) => state.setToBePlotted);
  const enterPlotSelectionMode = useAppStore(
    (state) => state.enterPlotSelectionMode
  );
  const exitPlotSelectionMode = useAppStore(
    (state) => state.exitPlotSelectionMode
  );

  return {
    isPlotSelectionMode,
    toBePlotted,
    addToBePlotted,
    removeToBePlotted,
    setToBePlotted,
    enterPlotSelectionMode,
    exitPlotSelectionMode,
  };
};

export const usePlotState = () => {
  const results = useAppStore((state) => state.results);
  const selectedVariables = useAppStore((state) => state.selectedVariables);
  const hoveredVariable = useAppStore((state) => state.hoveredVariable);
  const setSelectedVariables = useAppStore(
    (state) => state.setSelectedVariables
  );
  const setHoveredVariable = useAppStore((state) => state.setHoveredVariable);

  return {
    results,
    selectedVariables,
    hoveredVariable,
    setSelectedVariables,
    setHoveredVariable,
  };
};
