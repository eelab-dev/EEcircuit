import { StateCreator } from "zustand";
import { Schematic as SchematicType } from "eecircuit-schematic";
import * as ee from "eecircuit-schematic";
type EditorMode = Parameters<typeof ee.setMode>[0];

// Schematic state and actions
export interface SchematicState {
  shouldFitToScreen: boolean;
  hasResizedSinceSchematicView: boolean;
  hasViewedSchematic: boolean;
  currentSchematic?: SchematicType;
  // Active editor mode (single source of truth)
  editorMode: EditorMode;
}

export interface SchematicActions {
  setShouldFitToScreen: (should: boolean) => void;
  setHasResizedSinceSchematicView: (has: boolean) => void;
  setHasViewedSchematic: (has: boolean) => void;
  setCurrentSchematic: (schematic?: SchematicType) => void;
  // Mode controls (generic + convenience wrappers)
  setEditorMode: (mode: EditorMode) => void;
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
  editorMode: "none",

  // Actions
  setShouldFitToScreen: (should) => set({ shouldFitToScreen: should }),
  setHasResizedSinceSchematicView: (has) =>
    set({ hasResizedSinceSchematicView: has }),
  setHasViewedSchematic: (has) => set({ hasViewedSchematic: has }),
  setCurrentSchematic: (schematic) => set({ currentSchematic: schematic }),
  setEditorMode: (mode) =>
    set((state) => {
      if (state.editorMode === mode) return state;
      // Always use the engine's unified mode setter
      ee.setMode(mode);
      return { ...state, editorMode: mode } as SchematicSlice;
    }),
  resetSchematicModes: () =>
    set((state) => {
      ee.resetAllModes();
      return { ...state, editorMode: "none" } as SchematicSlice;
    }),
});
