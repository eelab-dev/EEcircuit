import type { SliceCreator } from "./storeTypes";

// Tab management state and actions
export interface TabState {
  mainTabValue: "schematic" | "simulate" | "plot";
  isSimulationTabEnabled: boolean;
  isPlottingTabEnabled: boolean;
}

export interface TabActions {
  setMainTabValue: (tab: TabState["mainTabValue"]) => void;
  setIsSimulationTabEnabled: (enabled: boolean) => void;
  setIsPlottingTabEnabled: (enabled: boolean) => void;
}

export type TabSlice = TabState & TabActions;

export const createTabSlice: SliceCreator<TabSlice, TabSlice> = (
  set
) => ({
  // Initial state
  mainTabValue: "schematic",
  isSimulationTabEnabled: false,
  isPlottingTabEnabled: false,

  // Actions
  setMainTabValue: (tab) => set({ mainTabValue: tab }),
  setIsSimulationTabEnabled: (enabled) => set({ isSimulationTabEnabled: enabled }),
  setIsPlottingTabEnabled: (enabled) => set({ isPlottingTabEnabled: enabled }),
});
