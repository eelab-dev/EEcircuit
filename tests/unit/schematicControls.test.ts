import { describe, expect, it, vi } from "vitest";
import type { SchematicEditor } from "eecircuit-schematic";
import { executeSchematicEditorCommand } from "../../src/schematic/schematicCommands";
import {
  resolveSchematicShortcut,
  type SchematicShortcutContext,
} from "../../src/schematic/schematicShortcuts";

const activeContext: SchematicShortcutContext = {
  isTabVisible: true,
  isFocusInCanvas: true,
  isEditableTarget: false,
  isWithinPropertiesDialog: false,
  isToBePlottedMode: false,
  isMoving: false,
};

describe("schematic shortcut resolution", () => {
  it("maps the documented unmodified keys", () => {
    expect(resolveSchematicShortcut({ key: "a" }, activeContext)).toEqual({ type: "open-components" });
    expect(resolveSchematicShortcut({ key: "W" }, activeContext)).toEqual({ type: "set-mode", mode: "wire" });
    expect(resolveSchematicShortcut({ key: "m" }, activeContext)).toEqual({ type: "set-mode", mode: "move" });
    expect(resolveSchematicShortcut({ key: "T" }, activeContext)).toEqual({ type: "set-mode", mode: "text" });
    expect(resolveSchematicShortcut({ key: "f" }, activeContext)).toEqual({ type: "editor-command", command: "fit-view" });
    expect(resolveSchematicShortcut({ key: "O" }, activeContext)).toEqual({ type: "editor-command", command: "return-to-origin" });
  });

  it("prioritizes modified H and R shortcuts", () => {
    const moving = { ...activeContext, isMoving: true };
    expect(resolveSchematicShortcut({ key: "H" }, moving)).toEqual({ type: "editor-command", command: "flip-horizontal" });
    expect(resolveSchematicShortcut({ key: "H", shiftKey: true }, moving)).toEqual({ type: "open-shortcuts" });
    expect(resolveSchematicShortcut({ key: "h", ctrlKey: true }, moving)).toEqual({ type: "open-shortcuts" });
    expect(resolveSchematicShortcut({ key: "R" }, moving)).toEqual({ type: "editor-command", command: "rotate" });
    expect(resolveSchematicShortcut({ key: "R", shiftKey: true }, moving)).toEqual({ type: "editor-command", command: "redo" });
  });

  it("maps delete, undo, transforms, and cancellation", () => {
    const moving = { ...activeContext, isMoving: true };
    expect(resolveSchematicShortcut({ key: "D", shiftKey: true }, moving)).toEqual({ type: "set-mode", mode: "delete" });
    expect(resolveSchematicShortcut({ key: "Z", shiftKey: true }, moving)).toEqual({ type: "editor-command", command: "undo" });
    expect(resolveSchematicShortcut({ key: "V" }, moving)).toEqual({ type: "editor-command", command: "flip-vertical" });
    expect(resolveSchematicShortcut({ key: "Escape" }, moving)).toEqual({ type: "reset-modes" });
    expect(resolveSchematicShortcut({ key: "§" }, moving)).toEqual({ type: "reset-modes" });
  });

  it("guards transforms, focus, tabs, modifiers, and To Be Plotted Escape", () => {
    expect(resolveSchematicShortcut({ key: "r" }, activeContext)).toBeNull();
    expect(resolveSchematicShortcut({ key: "a", altKey: true }, activeContext)).toBeNull();
    expect(resolveSchematicShortcut({ key: "w", metaKey: true }, activeContext)).toBeNull();
    expect(resolveSchematicShortcut({ key: "m", ctrlKey: true }, activeContext)).toBeNull();
    expect(resolveSchematicShortcut({ key: "w" }, { ...activeContext, isTabVisible: false })).toBeNull();
    expect(resolveSchematicShortcut({ key: "w" }, { ...activeContext, isFocusInCanvas: false })).toBeNull();
    expect(resolveSchematicShortcut({ key: "w" }, { ...activeContext, isEditableTarget: true })).toBeNull();
    expect(resolveSchematicShortcut({ key: "w" }, { ...activeContext, isWithinPropertiesDialog: true })).toBeNull();
    expect(resolveSchematicShortcut({ key: "Escape" }, { ...activeContext, isToBePlottedMode: true })).toBeNull();
  });
});

describe("schematic editor command dispatch", () => {
  const createEditor = () => {
    const methods = {
      fitView: vi.fn().mockResolvedValue(undefined),
      returnToOrigin: vi.fn().mockResolvedValue(undefined),
      resetModes: vi.fn().mockResolvedValue(undefined),
      saveView: vi.fn().mockResolvedValue({ scale: { x: 1, y: 2 }, offset: { x: 3, y: 4 } }),
      restoreView: vi.fn().mockResolvedValue(undefined),
      undo: vi.fn().mockResolvedValue(true),
      redo: vi.fn().mockResolvedValue(true),
      rotateSelected: vi.fn().mockResolvedValue(undefined),
      flipHorizontal: vi.fn().mockResolvedValue(undefined),
      flipVertical: vi.fn().mockResolvedValue(undefined),
      undoLastWirePoint: vi.fn().mockResolvedValue(undefined),
      cancelWire: vi.fn().mockResolvedValue(undefined),
      cancelMove: vi.fn().mockResolvedValue(undefined),
    };
    return {
      editor: methods as unknown as SchematicEditor,
      methods,
    };
  };

  it("dispatches every command to exactly one editor method", async () => {
    const { editor, methods } = createEditor();
    const commands = [
      ["fit-view", "fitView"],
      ["return-to-origin", "returnToOrigin"],
      ["reset-modes", "resetModes"],
      ["undo", "undo"],
      ["redo", "redo"],
      ["rotate", "rotateSelected"],
      ["flip-horizontal", "flipHorizontal"],
      ["flip-vertical", "flipVertical"],
      ["undo-wire-point", "undoLastWirePoint"],
      ["cancel-wire", "cancelWire"],
      ["cancel-move", "cancelMove"],
    ] as const;

    for (const [command, method] of commands) {
      await executeSchematicEditorCommand(editor, command);
      expect(methods[method]).toHaveBeenCalledTimes(1);
    }
    expect(Object.values(methods).reduce((total, mock) => total + mock.mock.calls.length, 0)).toBe(commands.length);
  });

});
