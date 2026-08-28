/**
 * Schematic editor integration for the instance-scoped v2 API.
 */
import React, { useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import {
  createSchematicEditor,
  Schematic as SchematicType,
  SchematicValidationError,
  type AvailableComponent,
  type EditorEvent,
  type PointerInfo,
  type SelectedItem,
  type SchematicEditor,
} from "eecircuit-schematic";
import { Box, Float } from "@chakra-ui/react";

import Actions from "./actions";
import CanvasControls from "./CanvasControls";
import { useSchematicKeyboard } from "./useSchematicKeyboard";
import BottomBar from "./bottombar";
import { useAppStore } from "../store/appStore";
import {
  formatToBePlottedLabel,
  parseTerminalPointerInfo,
  normalizeTerminalSelection,
} from "../utils/toBePlotted";
import { dialogTheme, schCanvasMessageTheme } from "../styles/uiThemes";
import { toaster } from "../components/ui/toaster";
import { SchematicEditorContext } from "./editorContext";
import { demoSchematic } from "./demoSchematic";

type SchematicProps = {
  onCanvasResized?: () => void;
  onSchematicDataChange?: (schematicData: SchematicType) => void;
};

export type SchematicHandle = {
  loadSchematic: (schematic: unknown) => Promise<void>;
  getSchematic: () => Promise<SchematicType>;
  clear: () => Promise<void>;
};

const blankSchematic: SchematicType = { componentInstances: [], wires: [] };

const Properties = React.lazy(() => import("./properties"));
const ExportImageDialog = React.lazy(() => import("./ExportImageDialog"));
const ShortcutsDialog = React.lazy(() => import("./ShortcutsDialog"));

/**
 * v1 files occasionally contain floating-point transform noise, legacy
 * two-terminal rotation numbering, or junction metadata that does not satisfy
 * v2's stricter topology checks. Keep the on-disk format unchanged while
 * making those historical files loadable by the v2 editor.
 */
const normalizeLegacySchematic = (value: unknown): unknown => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const root = structuredClone(value) as { componentInstances?: unknown; wires?: unknown };
  const junctionOccurrences = new Set<string>();
  const junctionPositions: Array<{ x: number; y: number }> = [];
  if (Array.isArray(root.wires)) {
    for (const wire of root.wires) {
      if (!wire || typeof wire !== "object") continue;
      const item = wire as { startLocation?: unknown; endLocation?: unknown; absolutePath?: unknown };
      if (Array.isArray(item.absolutePath)) {
        item.absolutePath = item.absolutePath.map((point) => {
          if (!point || typeof point !== "object") return point;
          const p = point as { x?: unknown; y?: unknown };
          return {
            ...p,
            x: typeof p.x === "number" && Math.abs(p.x) < 1e-9 ? 0 : p.x,
            y: typeof p.y === "number" && Math.abs(p.y) < 1e-9 ? 0 : p.y,
          };
        });
      }
      for (const side of ["startLocation", "endLocation"] as const) {
        const location = item[side];
        if (!location || typeof location !== "object") continue;
        const loc = location as { type?: unknown; prop?: { instanceName?: unknown; terminalName?: unknown; junctionPosition?: { x?: unknown; y?: unknown } } };
        if (loc.type === "junction" && loc.prop &&
            typeof loc.prop.junctionPosition?.x === "number" && typeof loc.prop.junctionPosition?.y === "number") {
          const position = loc.prop.junctionPosition;
          const key = `${position.x},${position.y}`;
          if (junctionOccurrences.has(key)) item[side] = undefined;
          else {
            junctionOccurrences.add(key);
            junctionPositions.push({ x: position.x as number, y: position.y as number });
          }
        } else if (loc.type === "terminal") {
          // Computed v2 terminal positions are rounded to the schematic grid,
          // so implicit endpoint matching is more reliable than v1's explicit
          // locations (which may carry stale rotation numbering).
          item[side] = undefined;
        }
      }
    }
  }
  if (Array.isArray(root.wires)) {
    for (const position of junctionPositions) {
      const hasPassingWire = root.wires.some((wire) => {
        if (!wire || typeof wire !== "object") return false;
        const path = (wire as { absolutePath?: unknown }).absolutePath;
        if (!Array.isArray(path)) return false;
        for (let index = 1; index < path.length; index++) {
          const start = path[index - 1] as { x?: unknown; y?: unknown };
          const end = path[index] as { x?: unknown; y?: unknown };
          if (start.x === end.x && start.x === position.x && typeof start.y === "number" && typeof end.y === "number" &&
              position.y > Math.min(start.y, end.y) && position.y < Math.max(start.y, end.y)) return true;
          if (start.y === end.y && start.y === position.y && typeof start.x === "number" && typeof end.x === "number" &&
              position.x > Math.min(start.x, end.x) && position.x < Math.max(start.x, end.x)) return true;
        }
        return false;
      });
      if (!hasPassingWire) {
        (root.wires as unknown[]).push({
          absolutePath: [{ x: position.x - 1, y: position.y }, { x: position.x + 1, y: position.y }],
        });
      }
    }
  }
  return root;
};

const Schematic = React.forwardRef<SchematicHandle, SchematicProps>(
  ({ onSchematicDataChange }, ref) => {
    const isDarkMode = useAppStore((state) => state.isDarkMode);
    const inputProfile = useAppStore((state) => state.inputProfile);
    const editorMode = useAppStore((state) => state.editorMode);
    const hasViewedSchematic = useAppStore((state) => state.hasViewedSchematic);
    const setHasViewedSchematic = useAppStore((state) => state.setHasViewedSchematic);
    const setCurrentSchematic = useAppStore((state) => state.setCurrentSchematic);
    const currentSchematic = useAppStore((state) => state.currentSchematic);
    const isToBePlottedMode = useAppStore((state) => state.isToBePlottedMode);
    const toBePlotted = useAppStore((state) => state.toBePlotted);
    const addToBePlotted = useAppStore((state) => state.addToBePlotted);
    const handleExitToBePlottedMode = useAppStore((state) => state.exitToBePlottedMode);
    const { addMessage, messages } = useAppStore();

    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [canvasElement, setCanvasElement] = useState<HTMLCanvasElement | null>(null);
    const [editor, setEditor] = useState<SchematicEditor | null>(null);
    const editorRef = useRef<SchematicEditor | null>(null);
    const editorReadyPromiseRef = useRef<Promise<void> | null>(null);
    const isTabVisibleRef = useRef(true);
    const hasViewedSchematicRef = useRef(hasViewedSchematic);
    const initialThemeRef = useRef(isDarkMode);
    const initialInputProfileRef = useRef(inputProfile);
    const [coord, setCoord] = useState({ x: 0, y: 0 });
    const [pointerInfo, setPointerInfo] = useState<PointerInfo>(null);
    const [selectedItem, setSelectedItem] = useState<SelectedItem>({ type: "none" });
    const [availableComponents, setAvailableComponents] = useState<AvailableComponent[]>([]);
    const [propertiesDismissed, setPropertiesDismissed] = useState(false);
    const [showExportImageDialog, setShowExportImageDialog] = useState(false);
    const [svgContent, setSvgContent] = useState<string | null>(null);
    const [loadingSvg, setLoadingSvg] = useState(false);
    const [showShortcutsDialog, setShowShortcutsDialog] = useState(false);
    const [canvasMessage, setCanvasMessage] = useState<{ text: string; type: "error" | "warning" } | null>(null);
    const isToBePlottedModeRef = useRef(isToBePlottedMode);
    const pointerInfoRef = useRef<PointerInfo>(null);
    const lastHitPointerInfoRef = useRef<PointerInfo>(null);
    const lastHitPointerAtRef = useRef(0);
    const handlePlotItemSelectedRef = useRef(addToBePlotted);
    const handleSchematicDataChangeRef = useRef(onSchematicDataChange);
    const initialSchematicRef = useRef<SchematicType>(
      new URLSearchParams(window.location.search).get("clean") === "true"
        ? blankSchematic
        : currentSchematic ?? demoSchematic,
    );

    useEffect(() => {
      isToBePlottedModeRef.current = isToBePlottedMode;
      handlePlotItemSelectedRef.current = addToBePlotted;
      handleSchematicDataChangeRef.current = onSchematicDataChange;
    }, [addToBePlotted, isToBePlottedMode, onSchematicDataChange]);

    const handleSchematicDataChange = useCallback((schematicData: SchematicType) => {
      setCurrentSchematic(schematicData);
      handleSchematicDataChangeRef.current?.(schematicData);
    }, [setCurrentSchematic]);

    const reportEditorError = useCallback((operation: string, error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`Schematic ${operation} failed:`, error);
      addMessage({ text: message, type: "error", category: "Schematic", mLevel: "user" });
      setCanvasMessage({ text: message, type: "error" });
    }, [addMessage]);

    const msgCallback = useCallback((msg: EditorEvent) => {
      switch (msg.type) {
        case "change":
          handleSchematicDataChange(msg.schematic);
          break;
        case "pointerCoords":
          setCoord(msg.pointerCoords);
          break;
        case "pointerInfo":
          setPointerInfo(msg.pointerInfo);
          pointerInfoRef.current = msg.pointerInfo;
          if (msg.pointerInfo) {
            lastHitPointerInfoRef.current = msg.pointerInfo;
            lastHitPointerAtRef.current = Date.now();
          }
          break;
        case "selectedItem":
          setSelectedItem(msg.selectedItem);
          setPropertiesDismissed(false);
          if (isToBePlottedModeRef.current || useAppStore.getState().isToBePlottedMode) {
            if (msg.selectedItem.type === "wire" || msg.selectedItem.type === "junction") {
              handlePlotItemSelectedRef.current({ type: "voltage", netName: msg.selectedItem.netName.trim() || "unknown" });
              break;
            }
            const pointer = pointerInfoRef.current ??
              (Date.now() - lastHitPointerAtRef.current < 500 ? lastHitPointerInfoRef.current : null);
            if (pointer?.type === "wire" || pointer?.type === "junction") {
              handlePlotItemSelectedRef.current({ type: "voltage", netName: pointer.name?.trim() || "unknown" });
            } else if (pointer?.type === "terminal") {
              const parsed = parseTerminalPointerInfo(pointer.name);
              if (parsed) {
                const corrected = normalizeTerminalSelection(parsed);
                handlePlotItemSelectedRef.current({ type: "current", componentName: corrected.componentName, terminalName: corrected.terminalName });
              }
            }
          }
          break;
        case "availableComponents":
          setAvailableComponents(msg.availableComponents);
          break;
        case "info":
          addMessage({ text: msg.msg, type: msg.mType, category: "Schematic", mLevel: msg.mLevel });
          if (msg.mType !== "info") setCanvasMessage({ text: msg.msg, type: msg.mType });
          break;
        case "error":
          addMessage({ text: msg.msg, type: msg.mType, category: "Schematic", mLevel: msg.mLevel });
          setCanvasMessage({ text: msg.msg, type: msg.mType === "error" ? "error" : "warning" });
          break;
        case "fatalError":
          addMessage({ text: msg.message, type: "error", category: "Schematic", mLevel: "dev" });
          setCanvasMessage({ text: msg.message, type: "error" });
          break;
        case "liveWireStatus":
          setCanvasMessage(msg.status.isValid || !msg.status.reason ? null : { text: msg.status.reason, type: "warning" });
          break;
        case "schematicEditorActivity":
          useAppStore.getState().setIsWiring(msg.activity === "wiring");
          useAppStore.getState().setIsMoving(msg.activity === "moving");
          break;
        case "status":
          if (msg.status === "worker-error") {
            addMessage({ text: "Schematic worker stopped unexpectedly.", type: "error", category: "Schematic", mLevel: "dev" });
          }
          break;
        default:
          break;
      }
    }, [addMessage, handleSchematicDataChange]);

    const setCanvasRef = useCallback((node: HTMLCanvasElement | null) => {
      canvasRef.current = node;
      setCanvasElement(node);
    }, []);

    useImperativeHandle(ref, () => ({
      loadSchematic: async (schematic) => {
        await editorReadyPromiseRef.current;
        if (!editorRef.current) throw new Error("Schematic editor is not ready");
        try {
          await editorRef.current.loadSchematic(schematic);
        } catch (error) {
          if (!(error instanceof SchematicValidationError)) throw error;
          await editorRef.current.loadSchematic(normalizeLegacySchematic(schematic));
        }
        await editorRef.current.fitView();
        setHasViewedSchematic(true);
      },
      getSchematic: async () => {
        await editorReadyPromiseRef.current;
        if (!editorRef.current) throw new Error("Schematic editor is not ready");
        return editorRef.current.getSchematic();
      },
      clear: async () => {
        await editorReadyPromiseRef.current;
        if (!editorRef.current) throw new Error("Schematic editor is not ready");
        await editorRef.current.clear();
      },
    }), [setHasViewedSchematic]);

    useEffect(() => {
      if (!canvasElement) return;
      let cancelled = false;
      let instance: SchematicEditor | undefined;
      let resolveReady: () => void = () => undefined;
      editorReadyPromiseRef.current = new Promise<void>((resolve) => {
        resolveReady = resolve;
      });
      canvasElement.dataset.canvasReady = "false";
      const initialize = async () => {
        try {
          instance = await createSchematicEditor({
            canvas: canvasElement,
            initialSchematic: initialSchematicRef.current,
            theme: initialThemeRef.current ? "dark" : "light",
            inputProfile: initialInputProfileRef.current,
            onEvent: msgCallback,
          });
          if (cancelled) {
            await instance.destroy();
            return;
          }
          setEditor(instance);
          editorRef.current = instance;
          resolveReady();
          canvasElement.dataset.canvasReady = "true";
          handleSchematicDataChange(await instance.getSchematic());
          if (!hasViewedSchematicRef.current) {
            await instance.fitView();
            if (!cancelled) {
              hasViewedSchematicRef.current = true;
              setHasViewedSchematic(true);
            }
          }
        } catch (error) {
          if (!cancelled) {
            canvasElement.dataset.canvasReady = "false";
            resolveReady();
            reportEditorError("initialization", error);
          }
        }
      };
      void initialize();
      return () => {
        cancelled = true;
        editorRef.current = null;
        setEditor((current) => current === instance ? null : current);
        if (!instance) resolveReady();
        if (instance) void instance.destroy();
      };
    }, [canvasElement, handleSchematicDataChange, msgCallback, reportEditorError, setHasViewedSchematic]);

    useEffect(() => {
      if (!editor) return;
      const operation = isToBePlottedMode ? editor.setMode("select") : editorMode === "none" ? editor.resetModes() : editor.setMode(editorMode);
      void operation.catch((error: unknown) => reportEditorError("mode update", error));
    }, [editor, editorMode, isToBePlottedMode, reportEditorError]);

    useEffect(() => {
      if (!editor) return;
      void editor.setTheme(isDarkMode ? "dark" : "light").catch((error: unknown) => reportEditorError("theme update", error));
    }, [editor, isDarkMode, reportEditorError]);

    useEffect(() => {
      if (!editor) return;
      void editor.setInputProfile(inputProfile).catch((error: unknown) => reportEditorError("input profile update", error));
    }, [editor, inputProfile, reportEditorError]);

    useEffect(() => {
      if (!isToBePlottedMode) return;
      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Escape" || event.key === "§") {
          event.preventDefault();
          handleExitToBePlottedMode();
        }
      };
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }, [handleExitToBePlottedMode, isToBePlottedMode]);

    useSchematicKeyboard({
      containerRef,
      canvasRef,
      isTabVisibleRef,
      isToBePlottedModeRef,
      onOpenShortcutsDialog: () => setShowShortcutsDialog(true),
      onResetAllModes: () => useAppStore.getState().resetSchematicModes(),
      onSetWireMode: (enable) => useAppStore.getState().setEditorMode(enable ? "wire" : "none"),
      onSetDeleteMode: (enable) => useAppStore.getState().setEditorMode(enable ? "delete" : "none"),
      onSetMoveMode: (enable) => useAppStore.getState().setEditorMode(enable ? "move" : "none"),
      onSetTextMode: (enable) => useAppStore.getState().setEditorMode(enable ? "text" : "none"),
    });

    useEffect(() => {
      if (!editor) return;
      void editor.getAvailableComponents().then(setAvailableComponents).catch((error: unknown) => reportEditorError("component discovery", error));
    }, [editor, reportEditorError]);

    useEffect(() => {
      if (!canvasMessage) return;
      const timer = setTimeout(() => setCanvasMessage(null), 3000);
      return () => clearTimeout(timer);
    }, [canvasMessage]);

  const sendToNetListButtonHandler = useCallback(async () => {
    await editorReadyPromiseRef.current;
    const activeEditor = editorRef.current;
    if (!activeEditor) return;

    try {
      const { netList, success } = await activeEditor.getNetList();

      // Read one-shot override flag (set when user holds Shift)
      const {
        overrideSimulateOnNetlistErrorsOnce,
        exportNetlist,
        setOverrideSimulateOnNetlistErrorsOnce,
      } = useAppStore.getState() as unknown as {
        overrideSimulateOnNetlistErrorsOnce?: boolean;
        exportNetlist: (netlist: string) => Promise<void>;
        setOverrideSimulateOnNetlistErrorsOnce?: (override: boolean) => void;
      };

      if (success || overrideSimulateOnNetlistErrorsOnce) {
        // Proceed: store netlist (with preamble) and navigate to Simulate
        await exportNetlist(netList);
        // exportNetlist clears the override internally, but clear defensively if available
        setOverrideSimulateOnNetlistErrorsOnce?.(false);
        return;
      }

      // Not successful and no override: show error toast and do not navigate
      toaster.create({
        title: "Netlist Generation Failed",
        description:
          "Fix errors before simulating. Hold Shift and click Simulate to proceed anyway.",
        type: "error",
        duration: 30000,
        meta: { closable: true },
      });

      // Ensure one-shot override doesn’t linger
      setOverrideSimulateOnNetlistErrorsOnce?.(false);
    } catch (err) {
      console.error("Schematic netlist generation failed:", err);
      toaster.create({
        title: "Netlist Error",
        description: "Unable to generate netlist. Check schematic and try again.",
        type: "error",
      });
    }
  }, []);

  const propertiesCallBack = React.useCallback(() => {
    setPropertiesDismissed(true);
  }, []);

  const propertiesOpen =
    !isToBePlottedMode &&
    !propertiesDismissed &&
    !!selectedItem &&
    selectedItem.type !== "none";

  const handleExportImage = () => {
    setLoadingSvg(true);
    setSvgContent(null);
    setShowExportImageDialog(true);
    if (!editor) return;
    void editor.getSvg().then(setSvgContent).catch((error: unknown) => {
      reportEditorError("SVG export", error);
    }).finally(() => setLoadingSvg(false));
  };

  const handleShowShortcuts = () => {
    setShowShortcutsDialog(true);
  };

  // Derive schematic error flag from global messages and update UI state
  useEffect(() => {
    // Check global message store for any active errors categorized under "Schematic"
    const hasErrors = useAppStore.getState().messages.some(m => m.category === "Schematic" && m.type === "error");
    try {
      const { setHasSchematicErrors } = useAppStore.getState() as {
        setHasSchematicErrors?: (hasErrors: boolean) => void;
      };
      if (typeof setHasSchematicErrors === "function") {
        setHasSchematicErrors(!!hasErrors);
      }
    } catch {
        // ignore
    }
  }, [messages]); // Re-run when messages change

  return (
    <SchematicEditorContext.Provider value={editor}>
    <Box position="relative" height={"100%"}>
      <Box
        position="relative"
        height="100%"
        ref={containerRef}
        id="canvas-container"
        tabIndex={0} // Make container focusable for keyboard shortcuts
        outline="none" // Remove default focus outline
      >
        <canvas
          id="schematic-canvas"
          ref={setCanvasRef}
          data-canvas-ready="false"
          style={{ width: "100%", height: "100%", display: "block", border: "solid 1px gray" }}
        />

        {editor && !isToBePlottedMode && (
          <Float offset="10" placement="middle-start">
            <Actions
              availableComponents={availableComponents}
              onExportImage={handleExportImage}
              onShowShortcuts={handleShowShortcuts}
            />
          </Float>
        )}
        {editor && !isToBePlottedMode && (
          <Float offset="10" placement="middle-end">
            <CanvasControls />
          </Float>
        )}
        {editor && propertiesOpen && (
          <React.Suspense fallback={null}>
            <Properties
              selectedItem={selectedItem}
              canvasHeight={0}
              onApply={(name, value) => {
                void editor.setSelectedItemNameValue(name, value).catch((error: unknown) => {
                  reportEditorError("property update", error);
                });
              }}
              onCloseButtonClick={propertiesCallBack}
            />
          </React.Suspense>
        )}

        {canvasMessage && (
          <Box
            position="absolute"
            top="10%"
            left="50%"
            transform="translateX(-50%)"
            zIndex={1000}
            bg={
              canvasMessage.type === "error"
                ? schCanvasMessageTheme.error.bg
                : schCanvasMessageTheme.warning.bg
            }
            backdropFilter={schCanvasMessageTheme.backdropFilter}
            borderRadius={schCanvasMessageTheme.borderRadius}
            borderWidth={schCanvasMessageTheme.borderWidth}
            borderColor={
              canvasMessage.type === "error"
                ? schCanvasMessageTheme.error.borderColor
                : schCanvasMessageTheme.warning.borderColor
            }
            color={
              canvasMessage.type === "error"
                ? schCanvasMessageTheme.error.color
                : schCanvasMessageTheme.warning.color
            }
            boxShadow={schCanvasMessageTheme.boxShadow}
            px={5}
            py={2.5}
            fontWeight="medium"
            fontSize="md"
            pointerEvents="none"
            display="flex"
            alignItems="center"
            gap={2}
          >
            {canvasMessage.text}
          </Box>
        )}

        {/* To-Be-Plotted Selection Mode Indicator */}
        {isToBePlottedMode && (
          <Box
            position="fixed"
            top="1rem"
            left="50%"
            transform="translateX(-50%)"
            zIndex={1000}
            bg={dialogTheme.bg}
            backdropFilter={dialogTheme.backdropFilter}
            color={dialogTheme.primaryText}
            px={4}
            py={2}
            borderRadius="md"
            border="1px solid"
            borderColor={dialogTheme.borderColor}
            fontSize="sm"
            boxShadow="lg"
            textAlign="center"
          >
            <div>🎯 To-Be-Plotted Selection Active</div>
            <div
              style={{ fontSize: "0.8em", marginTop: "4px", color: "inherit" }}
            >
              Click on components (for current) or wires (for voltage) to add to
              plot. Press ESC when done.
            </div>
            {/* Show selected items */}
            {toBePlotted.length > 0 && (
              <Box
                fontSize="xs"
                mt={2}
                p={3}
                bg={dialogTheme.bg}
                borderRadius="md"
                border="1px solid"
                borderColor={dialogTheme.borderColor}
              >
                <Box
                  fontWeight="bold"
                  mb="0.5"
                  color={dialogTheme.secondaryText}
                >
                  Selected ({toBePlotted.length}):
                </Box>
                <Box
                  wordBreak="break-word"
                  lineHeight="1.2"
                  maxWidth={{
                    base: "15.625rem",
                    sm: "21.875rem",
                    md: "25rem",
                    lg: "31.25rem",
                  }}
                  color={dialogTheme.primaryText}
                >
                  {toBePlotted.map((item, index) => (
                    <span key={index}>
                      {formatToBePlottedLabel(item)}
                      {index < toBePlotted.length - 1 ? ", " : ""}
                    </span>
                  ))}
                </Box>
              </Box>
            )}
          </Box>
        )}

        {/* Bottom Bar - Floating */}
        <BottomBar
          coord={coord}
          pointerInfo={pointerInfo}
          onSendToNetlist={(shift) => {
            if (isToBePlottedMode) {
              handleExitToBePlottedMode?.();
            }
            // Store a one-shot override when user holds Shift
            try {
              const { setOverrideSimulateOnNetlistErrorsOnce } =
                useAppStore.getState() as {
                  setOverrideSimulateOnNetlistErrorsOnce?: (
                    override: boolean
                  ) => void;
                };
              if (
                typeof setOverrideSimulateOnNetlistErrorsOnce === "function"
              ) {
                setOverrideSimulateOnNetlistErrorsOnce(!!shift);
              }
            } catch {
              // ignore
            }
            sendToNetListButtonHandler();
          }}
        />


      </Box>
      {showExportImageDialog && (
        <React.Suspense fallback={null}>
          <ExportImageDialog
            isOpen
            onClose={() => setShowExportImageDialog(false)}
            svgContent={svgContent}
            loading={loadingSvg}
          />
        </React.Suspense>
      )}
      {showShortcutsDialog && (
        <React.Suspense fallback={null}>
          <ShortcutsDialog
            isOpen
            onClose={() => setShowShortcutsDialog(false)}
          />
        </React.Suspense>
      )}
    </Box>
    </SchematicEditorContext.Provider>
  );
});

Schematic.displayName = "Schematic";
export default Schematic;
