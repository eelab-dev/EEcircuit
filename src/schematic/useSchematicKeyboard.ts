import React from "react";

// Centralized keyboard handling for the Schematic tab
// - Keeps code organized and avoids duplication in the component file
// - Does NOT handle to-be-plotted mode ESC; that remains local to schematic.tsx

export type UseSchematicKeyboardParams = {
  containerRef: React.RefObject<HTMLDivElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  // Use RefObject to avoid deprecated MutableRefObject warnings; we only read .current here
  isTabVisibleRef: React.RefObject<boolean>;
  isToBePlottedModeRef: React.RefObject<boolean>;
  onOpenShortcutsDialog: () => void;
  onResetAllModes: () => void; // Should also reset action bar toggles
  onSetWireMode: (enable: boolean) => void; // Syncs with action bar and schematic engine
  onSetDeleteMode: (enable: boolean) => void; // Syncs with action bar and schematic engine
  onSetMoveMode: (enable: boolean) => void; // Syncs with action bar and schematic engine
  onSetTextMode: (enable: boolean) => void; // Syncs with action bar and schematic engine
};

export function useSchematicKeyboard({
  containerRef,
  canvasRef,
  isTabVisibleRef,
  isToBePlottedModeRef,
  onOpenShortcutsDialog,
  onResetAllModes,
  onSetWireMode,
  onSetDeleteMode,
  onSetMoveMode,
  onSetTextMode,
}: UseSchematicKeyboardParams) {
  // Helper to check focus within schematic canvas container
  const isFocusInCanvas = React.useCallback(() => {
    const canvasContainer = containerRef.current;
    if (!canvasContainer || !document.activeElement) return false;
    const active = document.activeElement as HTMLElement;

    // If focus is within the properties dialog, treat as NOT in canvas for shortcuts
    let el: HTMLElement | null = active;
    while (el) {
      if (el.hasAttribute && el.hasAttribute("data-properties-dialog")) {
        return false;
      }
      el = el.parentElement;
    }

    return (
      canvasContainer.contains(active) || active === canvasRef.current
    );
  }, [containerRef, canvasRef]);

  // Helper to detect if an event target is inside the properties dialog
  const isWithinPropertiesDialog = (target: EventTarget | null) => {
    const node = target as HTMLElement | null;
    let el: HTMLElement | null = node;
    while (el) {
      if (el.hasAttribute && el.hasAttribute("data-properties-dialog")) {
        return true;
      }
      el = el.parentElement;
    }
    return false;
  };

  // Helper to detect text inputs/contenteditable to avoid consuming typing keys
  const isTextInputLike = (target: EventTarget | null) => {
    const el = target as HTMLElement | null;
    if (!el) return false;
    const tag = (el.tagName || "").toLowerCase();
    const editable = (el as HTMLElement).isContentEditable;
    return (
      tag === "input" ||
      tag === "textarea" ||
      tag === "select" ||
      editable
    );
  };

  // Shortcuts: Shift+H/Ctrl+H, Shift+Z (undo), Shift+R (redo)
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only when tab visible and focus within canvas container
      if (!isTabVisibleRef.current || !isFocusInCanvas()) return;

      // Ignore keys originating in the properties dialog or text inputs
      if (isWithinPropertiesDialog(event.target)) return;
      if (isTextInputLike(event.target)) return;

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

      // Handle 'w' / 'W' to enter wire mode
      if (!event.shiftKey && !event.ctrlKey && !event.metaKey) {
        if (event.key === "w" || event.key === "W") {
          onSetWireMode(true);
          return;
        }
        if (event.key === "m" || event.key === "M") {
          onSetMoveMode(true);
          return;
        }
        if (event.key === "t" || event.key === "T") {
          onSetTextMode(true);
          return;
        }
      }

      // Handle Shift + D to enter delete mode
      if (event.shiftKey && (event.key === "d" || event.key === "D")) {
        event.preventDefault();
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
    onSetMoveMode,
    onSetTextMode,
  ]);

  // Handle Escape/§ to reset all modes (and action bar toggles)
  // NOTE: We intentionally do NOT preventDefault so as not to interfere with fullscreen behavior
  React.useEffect(() => {
    const handleEscReset = (event: KeyboardEvent) => {
      if (event.key !== "Escape" && event.key !== "§") return;

      // Scope to visible tab and canvas focus; skip if to-be-plotted mode is active
      if (!isTabVisibleRef.current || !isFocusInCanvas()) return;
      // If inside properties dialog, let the dialog handle closing
      if (isWithinPropertiesDialog(event.target)) return;
      if (isToBePlottedModeRef.current) return;

      console.log("[DEBUG KB] Resetting all modes via ESC/§");
      onResetAllModes();
    };

    document.addEventListener("keydown", handleEscReset);
    return () => {
      document.removeEventListener("keydown", handleEscReset);
    };
  }, [isFocusInCanvas, isTabVisibleRef, isToBePlottedModeRef, onResetAllModes]);
}
