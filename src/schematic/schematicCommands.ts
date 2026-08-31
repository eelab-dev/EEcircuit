import type { SchematicEditor } from "eecircuit-schematic";

export type SchematicEditorCommand =
  | "fit-view"
  | "return-to-origin"
  | "reset-modes"
  | "undo"
  | "redo"
  | "rotate"
  | "flip-horizontal"
  | "flip-vertical"
  | "undo-wire-point"
  | "cancel-wire"
  | "cancel-move";

export const executeSchematicEditorCommand = async (
  editor: SchematicEditor,
  command: SchematicEditorCommand,
): Promise<void> => {
  switch (command) {
    case "fit-view":
      await editor.fitView();
      return;
    case "return-to-origin":
      await editor.returnToOrigin();
      return;
    case "reset-modes":
      await editor.resetModes();
      return;
    case "undo":
      await editor.undo();
      return;
    case "redo":
      await editor.redo();
      return;
    case "rotate":
      await editor.rotateSelected();
      return;
    case "flip-horizontal":
      await editor.flipHorizontal();
      return;
    case "flip-vertical":
      await editor.flipVertical();
      return;
    case "undo-wire-point":
      await editor.undoLastWirePoint();
      return;
    case "cancel-wire":
      await editor.cancelWire();
      return;
    case "cancel-move":
      await editor.cancelMove();
  }
};
