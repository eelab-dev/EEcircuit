import { create } from "zustand";
import { createTabSlice, TabSlice } from "./tabStore";
import { createSchematicSlice, SchematicSlice } from "./schematicStore";
import { createSimulationSlice, SimulationSlice } from "./simulationStore";
import { createPlotSlice, PlotSlice } from "./plotStore";
import { createUiSlice, UiSlice } from "./uiStore";

// Combined app store type
export type AppStore = TabSlice &
  SchematicSlice &
  SimulationSlice &
  PlotSlice &
  UiSlice;

// Create the combined store using all slices
export const useAppStore = create<AppStore>()((...a) => ({
  ...createTabSlice(...a),
  ...createSchematicSlice(...a),
  ...createSimulationSlice(...a),
  ...createPlotSlice(...a),
  ...createUiSlice(...a),
}));
