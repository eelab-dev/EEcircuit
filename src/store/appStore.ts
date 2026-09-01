import { create } from "zustand";
import { createTabSlice, TabSlice } from "./tabStore";
import { createSchematicSlice, SchematicSlice } from "./schematicStore";
import { createSimulationSlice, SimulationSlice } from "./simulationStore";
import { createPlotSlice, PlotSlice } from "./plotStore";
import { createUiSlice, UiSlice } from "./uiStore";
import { createMessageSlice, MessageSlice } from "./messageStore";
import { setMessageSink } from "./messageBus";

// Combined app store type
export type AppStore = TabSlice &
  SchematicSlice &
  SimulationSlice &
  PlotSlice &
  UiSlice &
  MessageSlice;

// Create the combined store using all slices
export const useAppStore = create<AppStore>()((...a) => ({
  ...createTabSlice(a[0], a[1]),
  ...createSchematicSlice(a[0], a[1]),
  ...createSimulationSlice(a[0], a[1]),
  ...createPlotSlice(a[0], a[1]),
  ...createUiSlice(a[0], a[1]),
  ...createMessageSlice(a[0], a[1]),
}));

setMessageSink((message) => useAppStore.getState().addMessage(message));
