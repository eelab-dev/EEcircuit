import { StateCreator } from "zustand";
import type { Schematic as SchematicType } from "eecircuit-schematic";
import type { EditorMode } from "eecircuit-schematic";

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
  setEditorMode: (mode) => set({ editorMode: mode }),
  resetSchematicModes: () => set({ editorMode: "none" }),
});
