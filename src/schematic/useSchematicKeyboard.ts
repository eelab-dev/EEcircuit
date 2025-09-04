import React from "react";
import * as eeSch from "eecircuit-schematic";

// Centralized keyboard handling for the Schematic tab
// - Keeps code organized and avoids duplication in the component file
// - Does NOT handle plot-selection ESC; that remains local to schematic.tsx

export type UseSchematicKeyboardParams = {
  containerRef: React.RefObject<HTMLDivElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  // Use RefObject to avoid deprecated MutableRefObject warnings; we only read .current here
  isTabVisibleRef: React.RefObject<boolean>;
  isPlotSelectionModeRef: React.RefObject<boolean>;
  onOpenShortcutsDialog: () => void;
  onResetAllModes: () => void; // Should also reset action bar toggles
  onSetWireMode: (enable: boolean) => void; // Syncs with action bar and schematic engine
  onSetDeleteMode: (enable: boolean) => void; // Syncs with action bar and schematic engine
};

export function useSchematicKeyboard({
  containerRef,
  canvasRef,
  isTabVisibleRef,
  isPlotSelectionModeRef,
  onOpenShortcutsDialog,
  onResetAllModes,
  onSetWireMode,
  onSetDeleteMode,
}: UseSchematicKeyboardParams) {
  // Helper to check focus within schematic canvas container
  const isFocusInCanvas = React.useCallback(() => {
    const canvasContainer = containerRef.current;
    if (!canvasContainer || !document.activeElement) return false;
    return (
      canvasContainer.contains(document.activeElement) ||
      document.activeElement === canvasRef.current
    );
  }, [containerRef, canvasRef]);

  // Shortcuts: Shift+H/Ctrl+H, Shift+Z (undo), Shift+R (redo)
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only when tab visible and focus within canvas container
      if (!isTabVisibleRef.current || !isFocusInCanvas()) return;

      // Handle Shift+H or Ctrl+H for shortcuts dialog (override eecircuit-schematic's Ctrl+H)
      if (
        (event.shiftKey && event.key === "H") ||
        (event.ctrlKey && (event.key === "h" || event.key === "H"))
      ) {
        event.preventDefault();
        event.stopPropagation();
        onOpenShortcutsDialog();
        return;
      }

      // Handle Shift+Z for undo
      if (event.shiftKey && event.key === "Z") {
        event.preventDefault();
        eeSch.undoSch();
        return;
      }

      // Handle Shift+R for redo
      if (event.shiftKey && event.key === "R") {
        event.preventDefault();
        eeSch.redoSch();
        return;
      }

      // Handle 'w' / 'W' to enter wire mode
      if (!event.shiftKey && !event.ctrlKey && !event.metaKey) {
        if (event.key === "w" || event.key === "W") {
          // Don't prevent default to keep browser behavior safe; this is non-destructive
          eeSch.resetAllModes(); // Syncs with action bar
          console.log("[DEBUG KB] Entering wire mode via key 'w'");
          onSetWireMode(true);
          return;
        }
      }

      // Handle Shift + D to enter delete mode
      if (event.shiftKey && (event.key === "d" || event.key === "D")) {
        event.preventDefault();
        eeSch.resetAllModes(); // Syncs with action bar
        console.log("[DEBUG KB] Entering delete mode via keys 'Shift+D'");
        onSetDeleteMode(true);
        return;
      }
    };

    // Capture to ensure we can override library defaults if needed
    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [
    isFocusInCanvas,
    isTabVisibleRef,
    onOpenShortcutsDialog,
    onSetWireMode,
    onSetDeleteMode,
  ]);

  // Handle Escape/§ to reset all modes (and action bar toggles)
  // NOTE: We intentionally do NOT preventDefault so as not to interfere with fullscreen behavior
  React.useEffect(() => {
    const handleEscReset = (event: KeyboardEvent) => {
      if (event.key !== "Escape" && event.key !== "§") return;

      // Scope to visible tab and canvas focus; skip if plot-selection mode is active
      if (!isTabVisibleRef.current || !isFocusInCanvas()) return;
      if (isPlotSelectionModeRef.current) return;

      console.log("[DEBUG KB] Resetting all modes via ESC/§");
      onResetAllModes();
    };

    document.addEventListener("keydown", handleEscReset);
    return () => {
      document.removeEventListener("keydown", handleEscReset);
    };
  }, [isFocusInCanvas, isTabVisibleRef, isPlotSelectionModeRef, onResetAllModes]);
}
