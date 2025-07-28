import { StateCreator } from "zustand";
import { Schematic as SchematicType } from "eecircuit-schematic";

// Schematic state and actions
export interface SchematicState {
  shouldFitToScreen: boolean;
  hasResizedSinceSchematicView: boolean;
  hasViewedSchematic: boolean;
  currentSchematic?: SchematicType;
}

export interface SchematicActions {
  setShouldFitToScreen: (should: boolean) => void;
  setHasResizedSinceSchematicView: (has: boolean) => void;
  setHasViewedSchematic: (has: boolean) => void;
  setCurrentSchematic: (schematic?: SchematicType) => void;
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

  // Actions
  setShouldFitToScreen: (should) => set({ shouldFitToScreen: should }),
  setHasResizedSinceSchematicView: (has) =>
    set({ hasResizedSinceSchematicView: has }),
  setHasViewedSchematic: (has) => set({ hasViewedSchematic: has }),
  setCurrentSchematic: (schematic) => set({ currentSchematic: schematic }),
});
