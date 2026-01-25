import { create } from "zustand";
import { createTabSlice, TabSlice } from "./tabStore";
import { createSchematicSlice, SchematicSlice } from "./schematicStore";
import { createSimulationSlice, SimulationSlice } from "./simulationStore";
import { createPlotSlice, PlotSlice } from "./plotStore";
import { createUiSlice, UiSlice } from "./uiStore";
import { createMessageSlice, MessageSlice } from "./messageStore";

// Combined app store type
export type AppStore = TabSlice &
  SchematicSlice &
  SimulationSlice &
  PlotSlice &
  UiSlice &
  MessageSlice;

// Create the combined store using all slices
export const useAppStore = create<AppStore>()((...a) => ({
  ...createTabSlice(...a),
  ...createSchematicSlice(...a),
  ...createSimulationSlice(...a),
  ...createPlotSlice(...a),
  ...createUiSlice(...a),
  ...createMessageSlice(...a),
}));
