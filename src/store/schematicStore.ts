import { StateCreator } from "zustand";
import { Schematic as SchematicType } from "eecircuit-schematic";
import * as ee from "eecircuit-schematic";

// Schematic state and actions
export interface SchematicState {
  shouldFitToScreen: boolean;
  hasResizedSinceSchematicView: boolean;
  hasViewedSchematic: boolean;
  currentSchematic?: SchematicType;
  // UI modes
  wireMode: boolean;
  deleteMode: boolean;
}

export interface SchematicActions {
  setShouldFitToScreen: (should: boolean) => void;
  setHasResizedSinceSchematicView: (has: boolean) => void;
  setHasViewedSchematic: (has: boolean) => void;
  setCurrentSchematic: (schematic?: SchematicType) => void;
  // Mode controls
  setWireMode: (enable: boolean) => void;
  setDeleteMode: (enable: boolean) => void;
  resetSchematicModes: () => void;
}

export type SchematicSlice = SchematicState & SchematicActions;

export const createSchematicSlice: StateCreator<
  SchematicSlice,
  [],
  [],
  SchematicSlice
> = (set) => ({
  // Initial state
  shouldFitToScreen: false,
  hasResizedSinceSchematicView: false,
  hasViewedSchematic: false,
  currentSchematic: undefined,
  wireMode: false,
  deleteMode: false,

  // Actions
  setShouldFitToScreen: (should) => set({ shouldFitToScreen: should }),
  setHasResizedSinceSchematicView: (has) =>
    set({ hasResizedSinceSchematicView: has }),
  setHasViewedSchematic: (has) => set({ hasViewedSchematic: has }),
  setCurrentSchematic: (schematic) => set({ currentSchematic: schematic }),
  setWireMode: (enable) =>
    set((state) => {
      if (state.wireMode === enable && (!enable || state.deleteMode === false))
        return state;
      const next: SchematicSlice = {
        ...state,
        wireMode: enable,
        // Wire and delete are mutually exclusive
        deleteMode: enable ? false : state.deleteMode,
      } as SchematicSlice;
      // Trigger engine mode change(s)
      if (enable) {
        ee.setDeleteMode(false);
      }
      ee.setWireMode(enable);
      return next;
    }),
  setDeleteMode: (enable) =>
    set((state) => {
      if (state.deleteMode === enable && (!enable || state.wireMode === false))
        return state;
      const next: SchematicSlice = {
        ...state,
        deleteMode: enable,
        // Delete and wire are mutually exclusive
        wireMode: enable ? false : state.wireMode,
      } as SchematicSlice;
      // Trigger engine mode change(s)
      if (enable) {
        ee.setWireMode(false);
      }
      ee.setDeleteMode(enable);
      return next;
    }),
  resetSchematicModes: () =>
    set((state) => {
      if (state.wireMode) {
        ee.setWireMode(false);
      }
      if (state.deleteMode) {
        ee.setDeleteMode(false);
      }
      ee.resetAllModes();
      return { ...state, wireMode: false, deleteMode: false } as SchematicSlice;
    }),
});
