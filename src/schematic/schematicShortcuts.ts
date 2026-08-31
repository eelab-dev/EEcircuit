import type { EditorMode } from "eecircuit-schematic";
import type { SchematicEditorCommand } from "./schematicCommands";

export type SchematicShortcutAction =
  | { type: "open-components" }
  | { type: "open-shortcuts" }
  | { type: "set-mode"; mode: Extract<EditorMode, "wire" | "move" | "text" | "delete"> }
  | { type: "reset-modes" }
  | { type: "editor-command"; command: SchematicEditorCommand };

export type SchematicShortcutKey = {
  key: string;
  shiftKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
};

export type SchematicShortcutContext = {
  isTabVisible: boolean;
  isFocusInCanvas: boolean;
  isEditableTarget: boolean;
  isWithinPropertiesDialog: boolean;
  isToBePlottedMode: boolean;
  isMoving: boolean;
};

export const resolveSchematicShortcut = (
  event: SchematicShortcutKey,
  context: SchematicShortcutContext,
): SchematicShortcutAction | null => {
  if (
    !context.isTabVisible ||
    !context.isFocusInCanvas ||
    context.isEditableTarget ||
    context.isWithinPropertiesDialog
  ) {
    return null;
  }

  const key = event.key.toLowerCase();

  if (key === "escape" || event.key === "§") {
    return context.isToBePlottedMode ? null : { type: "reset-modes" };
  }

  if (event.metaKey || event.altKey) return null;

  // Modified shortcuts take precedence over their single-key counterparts.
  if (event.shiftKey && key === "h") return { type: "open-shortcuts" };
  if (event.ctrlKey && !event.shiftKey && key === "h") {
    return { type: "open-shortcuts" };
  }
  if (event.shiftKey && !event.ctrlKey && key === "z") {
    return { type: "editor-command", command: "undo" };
  }
  if (event.shiftKey && !event.ctrlKey && key === "r") {
    return { type: "editor-command", command: "redo" };
  }
  if (event.shiftKey && !event.ctrlKey && key === "d") {
    return { type: "set-mode", mode: "delete" };
  }

  if (event.shiftKey || event.ctrlKey) return null;

  switch (key) {
    case "a":
      return { type: "open-components" };
    case "w":
      return { type: "set-mode", mode: "wire" };
    case "m":
      return { type: "set-mode", mode: "move" };
    case "t":
      return { type: "set-mode", mode: "text" };
    case "f":
      return { type: "editor-command", command: "fit-view" };
    case "o":
      return { type: "editor-command", command: "return-to-origin" };
    case "r":
      return context.isMoving
        ? { type: "editor-command", command: "rotate" }
        : null;
    case "h":
      return context.isMoving
        ? { type: "editor-command", command: "flip-horizontal" }
        : null;
    case "v":
      return context.isMoving
        ? { type: "editor-command", command: "flip-vertical" }
        : null;
    default:
      return null;
  }
};
