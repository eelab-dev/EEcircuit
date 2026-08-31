import React from "react";
import type { EditorMode } from "eecircuit-schematic";
import type { SchematicEditorCommand } from "./schematicCommands";
import { resolveSchematicShortcut } from "./schematicShortcuts";

export type UseSchematicKeyboardParams = {
  containerRef: React.RefObject<HTMLDivElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  isTabVisibleRef: React.RefObject<boolean>;
  isToBePlottedModeRef: React.RefObject<boolean>;
  isMovingRef: React.RefObject<boolean>;
  onOpenComponentPopover: () => void;
  onOpenShortcutsDialog: () => void;
  onResetAllModes: () => void;
  onSetMode: (mode: Extract<EditorMode, "wire" | "move" | "text" | "delete">) => void;
  onEditorCommand: (command: SchematicEditorCommand) => void;
};

const isWithinPropertiesDialog = (target: EventTarget | null): boolean => {
  let element = target as HTMLElement | null;
  while (element) {
    if (element.hasAttribute("data-properties-dialog")) return true;
    element = element.parentElement;
  }
  return false;
};

const isTextInputLike = (target: EventTarget | null): boolean => {
  const element = target as HTMLElement | null;
  if (!element) return false;
  const tag = element.tagName.toLowerCase();
  return (
    tag === "input" ||
    tag === "textarea" ||
    tag === "select" ||
    element.isContentEditable ||
    element.closest(".monaco-editor") !== null
  );
};

export function useSchematicKeyboard({
  containerRef,
  canvasRef,
  isTabVisibleRef,
  isToBePlottedModeRef,
  isMovingRef,
  onOpenComponentPopover,
  onOpenShortcutsDialog,
  onResetAllModes,
  onSetMode,
  onEditorCommand,
}: UseSchematicKeyboardParams) {
  const isFocusInCanvas = React.useCallback(() => {
    const container = containerRef.current;
    const activeElement = document.activeElement;
    if (!container || !activeElement) return false;
    return container.contains(activeElement) || activeElement === canvasRef.current;
  }, [canvasRef, containerRef]);

  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const action = resolveSchematicShortcut(event, {
        isTabVisible: isTabVisibleRef.current,
        isFocusInCanvas: isFocusInCanvas(),
        isEditableTarget: isTextInputLike(event.target),
        isWithinPropertiesDialog: isWithinPropertiesDialog(event.target),
        isToBePlottedMode: isToBePlottedModeRef.current,
        isMoving: isMovingRef.current,
      });
      if (!action) return;

      event.preventDefault();
      event.stopPropagation();

      switch (action.type) {
        case "open-components":
          onOpenComponentPopover();
          break;
        case "open-shortcuts":
          onOpenShortcutsDialog();
          break;
        case "set-mode":
          onSetMode(action.mode);
          break;
        case "reset-modes":
          onResetAllModes();
          break;
        case "editor-command":
          onEditorCommand(action.command);
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => document.removeEventListener("keydown", handleKeyDown, true);
  }, [
    isFocusInCanvas,
    isMovingRef,
    isTabVisibleRef,
    isToBePlottedModeRef,
    onEditorCommand,
    onOpenComponentPopover,
    onOpenShortcutsDialog,
    onResetAllModes,
    onSetMode,
  ]);
}
