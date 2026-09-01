import type { MessageSlice } from "./messageStore";
import type { PlotSlice } from "./plotStore";
import type { SchematicSlice } from "./schematicStore";
import type { SimulationSlice } from "./simulationStore";
import type { TabSlice } from "./tabStore";
import type { UiSlice } from "./uiStore";

export type AppStore = TabSlice &
  SchematicSlice &
  SimulationSlice &
  PlotSlice &
  UiSlice &
  MessageSlice;
