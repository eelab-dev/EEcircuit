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
}

export interface SchematicActions {
  setShouldFitToScreen: (should: boolean) => void;
  setHasResizedSinceSchematicView: (has: boolean) => void;
  setHasViewedSchematic: (has: boolean) => void;
  setCurrentSchematic: (schematic?: SchematicType) => void;
  // Mode controls
  setWireMode: (enable: boolean) => void;
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

  // Actions
  setShouldFitToScreen: (should) => set({ shouldFitToScreen: should }),
  setHasResizedSinceSchematicView: (has) =>
    set({ hasResizedSinceSchematicView: has }),
  setHasViewedSchematic: (has) => set({ hasViewedSchematic: has }),
  setCurrentSchematic: (schematic) => set({ currentSchematic: schematic }),
  setWireMode: (enable) =>
    set((state) => {
      if (state.wireMode === enable) return state;
      // Update UI state first
      const next = { ...state, wireMode: enable } as SchematicSlice;
      // Trigger engine mode change
      ee.setWireMode(enable);
      return next;
    }),
  resetSchematicModes: () =>
    set((state) => {
      if (state.wireMode) {
        ee.setWireMode(false);
      }
      ee.resetAllModes();
      return { ...state, wireMode: false } as SchematicSlice;
    }),
});
