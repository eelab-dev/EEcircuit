import { createMessageSlice } from "../../store/messageStore";
import { createPlotSlice } from "../../store/plotStore";
import { createSchematicSlice } from "../../store/schematicStore";
import { createSimulationSlice } from "../../store/simulationStore";
import { createTabSlice } from "../../store/tabStore";
import type { StoreSetter } from "../../store/storeTypes";
import { createUiSlice } from "../../store/uiStore";
import type { AppStore } from "../../store/appStoreTypes";
import { setMessageSink } from "../../store/messageBus";

const state = $state({} as AppStore);

const set: StoreSetter<AppStore> = (update) => {
  const next = typeof update === "function" ? update(state) : update;
  if (next === state) return;
  Object.assign(state, next);
};

const get = (): AppStore => state;

Object.assign(
  state,
  createTabSlice(set, get),
  createSchematicSlice(set, get),
  createSimulationSlice(set, get),
  createPlotSlice(set, get),
  createUiSlice(set, get),
  createMessageSlice(set, get),
);

setMessageSink((message) => state.addMessage(message));

export const appState = state;
export const getAppState = get;
