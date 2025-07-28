import { StateCreator } from "zustand";

// Tab management state and actions
export interface TabState {
  mainTabValue: "schematic" | "simulate" | "plot";
  isSimulateTabEnabled: boolean;
  isPlotTabEnabled: boolean;
}

export interface TabActions {
  setMainTabValue: (tab: TabState["mainTabValue"]) => void;
  setIsSimulateTabEnabled: (enabled: boolean) => void;
  setIsPlotTabEnabled: (enabled: boolean) => void;
}

export type TabSlice = TabState & TabActions;

export const createTabSlice: StateCreator<TabSlice, [], [], TabSlice> = (
  set
) => ({
  // Initial state
  mainTabValue: "schematic",
  isSimulateTabEnabled: false,
  isPlotTabEnabled: false,

  // Actions
  setMainTabValue: (tab) => set({ mainTabValue: tab }),
  setIsSimulateTabEnabled: (enabled) => set({ isSimulateTabEnabled: enabled }),
  setIsPlotTabEnabled: (enabled) => set({ isPlotTabEnabled: enabled }),
});
