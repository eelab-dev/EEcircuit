/**
 * The fit-to-screen should happen only once at the app initialization
 * before any user interaction. This should happen after canvas ready message is received.
 *
 * During resize, the canvas should be recreated. this is webgl offscreen
 * canvas. otherwise the aspect ration will be wrong
 *
 * During the tab change the canvas should not recreated
 *
 * Be careful as there is cross contamination between these effect,
 * for example tab change could wrongly trigger resize.
 */

import React, { useEffect, useRef, useCallback, useState } from "react";
import * as eeSch from "eecircuit-schematic";
import { Schematic as SchematicType } from "eecircuit-schematic";
import { Box, Float } from "@chakra-ui/react";
import debounce from "lodash.debounce";

import Actions from "./actions";
import { useSchematicKeyboard } from "./useSchematicKeyboard";
import Properties from "./properties";
import BottomBar from "./bottombar";
import StatusIcon from "./statusIcon";
import ExportImageDialog from "./ExportImageDialog";
import ShortcutsDialog from "./ShortcutsDialog";
import { ToBePlotted } from "src/types/commonTypes";
import { useAppStore } from "../store/appStore";
import { getRecommendedInputProfile } from "../utils/deviceDetection";
import { dialogTheme } from "../styles/uiThemes";
import { toaster } from "../components/ui/toaster";

type SchematicProps = {
  // Only props that are NOT available in the store
  onCanvasResized?: () => void;
  onSchematicDataChange?: (schematicData: SchematicType) => void;
};

const Schematic: React.FC<SchematicProps> = ({
  onCanvasResized,
  onSchematicDataChange,
}) => {
  // Get state and actions directly from Zustand store - no prop fallbacks needed
  const hasViewedSchematic = useAppStore((state) => state.hasViewedSchematic);
  const setHasViewedSchematic = useAppStore(
    (state) => state.setHasViewedSchematic
  );
  const setCurrentSchematic = useAppStore((state) => state.setCurrentSchematic);

  const isPlotSelectionMode = useAppStore((state) => state.isPlotSelectionMode);
  const toBePlotted = useAppStore((state) => state.toBePlotted);
  const addToBePlotted = useAppStore((state) => state.addToBePlotted);
  const exitPlotSelectionMode = useAppStore(
    (state) => state.exitPlotSelectionMode
  );

  // Use store actions directly
  const handlePlotItemSelected = addToBePlotted;
  const handleExitPlotSelectionMode = exitPlotSelectionMode;

  // Enhanced onSchematicDataChange to also update store
  const handleSchematicDataChange = React.useCallback(
    (schematicData: SchematicType) => {
      setCurrentSchematic(schematicData);
      onSchematicDataChange?.(schematicData);
    },
    [setCurrentSchematic, onSchematicDataChange]
  );
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const initializedCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const initializingCanvasRef = useRef<HTMLCanvasElement | null>(null); // Track canvas currently being initialized
  const lastContainerSizeRef = useRef<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });
  const isTabVisibleRef = useRef<boolean>(true); // Track tab visibility without causing effect re-runs
  const hasInitializedOnceRef = useRef<boolean>(false); // Track if app has been initialized for the first time
  const hasFitToScreenExecutedRef = useRef<boolean>(false); // Track if fit-to-screen has ever been executed (prevents multiple executions)
  const isProcessingFitToScreenRef = useRef<boolean>(false); // Track if fit-to-screen is currently being processed
  const isTabChangeInProgressRef = useRef<boolean>(false); // Track if tab change is in progress to prevent resize interference

  // Note: No localStorage needed - component doesn't actually unmount/remount on tab changes
  // Tab visibility is handled via CSS display, same as simulate and plot tabs

  const [coord, setCoord] = useState({ x: 0, y: 0 });
  const [pointerInfo, setPointerInfo] = useState<eeSch.PointerInfo>(null);
  const [selectedItem, setSelectedItem] = useState<eeSch.SelectedItem>({
    type: "none",
  } as eeSch.SelectedItem);

  const [availableComponents, setAvailableComponents] = useState<
    eeSch.AvailableComponent[]
  >([]);
  const [propertiesOpen, setPropertiesOpen] = useState(false);

  const [info, setInfo] = useState<
    { message: string; mLevel: "user" | "dev" }[]
  >([]);
  const [canvasHeight] = useState(0);
  const [showExportImageDialog, setShowExportImageDialog] = useState(false);
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [loadingSvg, setLoadingSvg] = useState(false);
  const [showShortcutsDialog, setShowShortcutsDialog] = useState(false);

  // Color mode values - must be called at top level to avoid hooks order issues

  // Use refs to access current values in msgCallback without causing re-renders
  const isPlotSelectionModeRef = useRef(isPlotSelectionMode);
  const handlePlotItemSelectedRef = useRef(handlePlotItemSelected);
  const handleSchematicDataChangeRef = useRef(handleSchematicDataChange);

  // Update refs when values change
  useEffect(() => {
    isPlotSelectionModeRef.current = isPlotSelectionMode;
  }, [isPlotSelectionMode]);

  useEffect(() => {
    handlePlotItemSelectedRef.current = handlePlotItemSelected;
  }, [handlePlotItemSelected]);

  useEffect(() => {
    handleSchematicDataChangeRef.current = handleSchematicDataChange;
  }, [handleSchematicDataChange]);

  const msgCallback = useCallback(
    (msg: eeSch.MsgSchToApp) => {
      switch (msg.type) {
        case "pointerCoords":
          setCoord({ x: msg.pointerCoords.x, y: msg.pointerCoords.y });
          break;
        case "pointerInfo":
          setPointerInfo(msg.pointerInfo);
          break;
        case "selectedItem":
          if (msg.selectedItem !== undefined) {
            setSelectedItem(msg.selectedItem);

            // Handle plot selection mode - use refs to get current values
            if (
              isPlotSelectionModeRef.current &&
              handlePlotItemSelectedRef.current
            ) {
              const item = msg.selectedItem;

              // Only allow wire and instance selections
              if (item.type === "wire" || item.type === "junction") {
                // Wire/junction selection - voltage measurement
                const netName = item.netName || "unknown";
                const plotItem: ToBePlotted = {
                  type: "voltage",
                  name: netName,
                };
                handlePlotItemSelectedRef.current(plotItem);
              } else if (item.type === "instance") {
                // Instance selection - current measurement
                const instanceName = item.name || item.typeName || "unknown";
                const plotItem: ToBePlotted = {
                  type: "current",
                  name: instanceName,
                };
                handlePlotItemSelectedRef.current(plotItem);
              }
            }
          }
          break;
        case "netList":
          // Netlist messages are handled via eeSch.getNetList() promise resolution.
          // Intentionally ignore here to avoid double navigation.
          break;
        case "availableComponents":
          setAvailableComponents(msg.availableComponents);
          break;
        case "info":
          setInfo((prevInfo) => [
            ...prevInfo,
            { message: `${msg.mType}: ${msg.msg}`, mLevel: msg.mLevel },
          ]);
          break;
        case "svg":
          setSvgContent(msg.svg);
          setLoadingSvg(false);
          break;
        case "savedSchematic":
          // Call the callback to uplift schematic data to parent
          if (handleSchematicDataChangeRef.current) {
            handleSchematicDataChangeRef.current(msg.schematic);
          }
          break;
      }
    },
    [
      // Note: Save functionality moved to EEcircuit component - no simulation config dependencies needed
      // Removed direct prop dependencies to prevent callback recreation
      // Store-prioritized values are now accessed via refs for stability
      // Also removed onSchematicDataChange to use ref for stability
    ]
  );

  // Helper function to safely initialize canvas only once
  const safeInitCanvas = useCallback(
    async (canvas: HTMLCanvasElement) => {
      if (initializedCanvasRef.current === canvas) {
        console.log("Canvas already initialized, skipping...");
        return false; // Already initialized
      }

      if (initializingCanvasRef.current === canvas) {
        console.log("Canvas initialization already in progress, skipping...");
        return false; // Already initializing
      }

      // Check canvas dimensions before initialization
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        console.log("Canvas dimensions are zero, skipping initialization:", {
          width: rect.width,
          height: rect.height,
        });
        return false;
      }

      console.log("Initializing canvas with eecircuit library...", {
        width: rect.width,
        height: rect.height,
      });

      // Mark canvas as being initialized
      initializingCanvasRef.current = canvas;

      try {
        // Initialize canvas with eecircuit - resolves when canvas is ready
        await eeSch.initCanvas(canvas, msgCallback);
        initializedCanvasRef.current = canvas;
        initializingCanvasRef.current = null; // Clear initializing flag
        console.log("Canvas initialization completed and ready");

        // Send input profile command now that canvas is ready
        const inputProfile = getRecommendedInputProfile();
        console.log("Sending input profile to canvas:", inputProfile);
        eeSch.sendCommand({
          command: "setInputProfile",
          profile: inputProfile,
        });
      } catch (error) {
        console.error("Canvas initialization failed:", error);
        initializingCanvasRef.current = null; // Clear initializing flag on error
        return false;
      }

      // Handle fit-to-screen for initial app initialization ONLY
      // Use hasViewedSchematic instead of shouldFitToScreen to avoid timing issues
      if (
        !hasViewedSchematic &&
        !hasFitToScreenExecutedRef.current &&
        !isTabChangeInProgressRef.current &&
        isTabVisibleRef.current
      ) {
        console.log(
          "Performing fit-to-screen after canvas ready for INITIAL APP INITIALIZATION ONLY"
        );
        eeSch.sendCommand({ command: "view", viewType: "fit" });
        hasFitToScreenExecutedRef.current = true; // Mark fit-to-screen as executed
        isProcessingFitToScreenRef.current = true; // Mark as processing to prevent resize interference
        hasInitializedOnceRef.current = true; // Mark as initialized only after fit-to-screen
        setHasViewedSchematic(true); // Mark as viewed so fit-to-screen won't happen again
        console.log(
          "Fit-to-screen command sent successfully for INITIAL APP INITIALIZATION"
        );

        // Clear the processing flag on next frame to allow normal operation
        requestAnimationFrame(() => {
          console.log(
            "Clearing fit-to-screen processing flag after command execution"
          );
          isProcessingFitToScreenRef.current = false;
        });
      }
      // Only mark as initialized if no special actions are pending and this is visible tab
      else if (!hasInitializedOnceRef.current && isTabVisibleRef.current) {
        console.log(
          "Canvas ready for first time with no special actions, marking as initialized"
        );
        hasInitializedOnceRef.current = true;
      }

      // Reset initialization flag when canvas is recreated
      // But ONLY if this is a resize operation, not a tab change
      if (
        !isTabChangeInProgressRef.current &&
        hasFitToScreenExecutedRef.current
      ) {
        console.log(
          "Canvas recreated due to resize - resetting hasInitializedOnceRef but keeping fit-to-screen flag"
        );
        hasInitializedOnceRef.current = false;
        // NEVER reset hasFitToScreenExecutedRef during resize - it should only happen once at app startup
        console.log(
          "Canvas recreation during resize - fit-to-screen will NOT be triggered again"
        );
      } else if (isTabChangeInProgressRef.current) {
        console.log(
          "Canvas initialization during tab change - keeping existing flags"
        );
      }

      return true; // Successfully initialized
    },
    [msgCallback, hasViewedSchematic, setHasViewedSchematic]
  );

  // Effect to handle tab visibility changes - simplified approach like simulate/plot tabs
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Simple visibility observer to detect when tab becomes visible
    const visibilityObserver = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]!;
        const isVisible = entry!.isIntersecting && entry!.intersectionRatio > 0;
        const wasVisible = isTabVisibleRef.current;

        console.log("Tab visibility changed:", isVisible, "was:", wasVisible);

        // Mark tab change in progress to prevent resize interference
        if (isVisible !== wasVisible) {
          console.log("Tab change detected, marking in progress");
          isTabChangeInProgressRef.current = true;

          // Clear the tab change flag after a short delay to allow stabilization
          setTimeout(() => {
            console.log("Tab change completed, clearing flag");
            isTabChangeInProgressRef.current = false;
          }, 300); // 300ms delay to allow tab transition to complete
        }

        isTabVisibleRef.current = isVisible;

        // When tab becomes visible, ensure canvas is ready (same logic as other tabs)
        // Only initialize if canvas exists but hasn't been initialized for this canvas instance
        if (
          isVisible &&
          canvasRef.current &&
          initializedCanvasRef.current !== canvasRef.current
        ) {
          console.log("Tab became visible, ensuring canvas is ready");
          safeInitCanvas(canvasRef.current);
        }

        // Check if container size changed while tab was hidden - if so, force canvas recreation
        if (isVisible && !wasVisible && canvasRef.current) {
          const rect = containerRef.current?.getBoundingClientRect();
          if (rect) {
            const currentWidth = Math.round(rect.width);
            const currentHeight = Math.round(rect.height);
            const lastSize = lastContainerSizeRef.current;

            // Check if size changed significantly while tab was hidden
            const widthDiff = Math.abs(currentWidth - lastSize.width);
            const heightDiff = Math.abs(currentHeight - lastSize.height);
            const RESIZE_THRESHOLD = 5;

            if (
              widthDiff >= RESIZE_THRESHOLD ||
              heightDiff >= RESIZE_THRESHOLD
            ) {
              console.log(
                `Tab became visible with different container size (${currentWidth}x${currentHeight} vs ${lastSize.width}x${lastSize.height}), forcing canvas recreation`
              );

              // Update the last known size
              lastContainerSizeRef.current = {
                width: currentWidth,
                height: currentHeight,
              };

              // Remove existing canvas
              if (
                canvasRef.current &&
                containerRef.current &&
                canvasRef.current.parentNode === containerRef.current
              ) {
                console.log(
                  "Removing existing canvas for size change recreation"
                );
                containerRef.current.removeChild(canvasRef.current);
                // Reset refs
                initializedCanvasRef.current = null;
                initializingCanvasRef.current = null;
                canvasRef.current = null;
              }

              // Create new canvas with current container dimensions
              console.log("Creating new canvas for size change");
              const newCanvas = document.createElement("canvas");
              newCanvas.id = "schematic-canvas";
              newCanvas.style.width = "100%";
              newCanvas.style.height = "100%";
              newCanvas.style.display = "block";
              newCanvas.style.border = "solid 1px gray";

              // Add to container and update ref
              if (containerRef.current) {
                containerRef.current.appendChild(newCanvas);
                canvasRef.current = newCanvas;

                // Initialize the new canvas
                safeInitCanvas(newCanvas);
              }
            }
          }
        }
      },
      { threshold: 0.1 }
    );

    visibilityObserver.observe(container);

    return () => {
      visibilityObserver.disconnect();
    };
  }, [safeInitCanvas]); // Canvas initialization handled internally by safeInitCanvas

  // Handle keyboard events for plot selection mode
  useEffect(() => {
    if (!isPlotSelectionMode) return;

    // Ensure we're in select mode when plot selection is active
    eeSch.sendCommand({ command: "mode", modeType: "select" });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" || event.key === "§") {
        event.preventDefault();
        handleExitPlotSelectionMode?.();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isPlotSelectionMode, handleExitPlotSelectionMode]);

  // Centralized keyboard handling (except plot-selection ESC)
  useSchematicKeyboard({
    containerRef,
    canvasRef,
    isTabVisibleRef,
    isPlotSelectionModeRef,
    onOpenShortcutsDialog: () => setShowShortcutsDialog(true),
    onResetAllModes: () => {
      const resetModes = useAppStore.getState().resetSchematicModes;
      resetModes();
    },
    onSetWireMode: (enable) => {
      const setEditorMode = useAppStore.getState().setEditorMode;
      setEditorMode(enable ? "wire" : "none");
    },
    onSetDeleteMode: (enable) => {
      const setEditorMode = useAppStore.getState().setEditorMode;
      setEditorMode(enable ? "delete" : "none");
    },
    onSetMoveMode: (enable) => {
      const setEditorMode = useAppStore.getState().setEditorMode;
      setEditorMode(enable ? "move" : "none");
    },
  });

  // Initialize the canvas and set up the message callback
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Check if canvas already exists to avoid recreation
    let canvas = document.getElementById(
      "schematic-canvas"
    ) as HTMLCanvasElement;

    console.log(
      "Canvas creation effect - checking for existing canvas:",
      !!canvas
    );

    if (!canvas) {
      // Create the canvas element only if it doesn't exist
      console.log("Creating new canvas element");
      canvas = document.createElement("canvas");
      canvas.id = "schematic-canvas";
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      canvas.style.display = "block";
      canvas.style.border = "solid 1px gray"; // Initial border for visibility

      // Don't initialize yet - let the resize handler do it
      canvasRef.current = canvas;
      container.appendChild(canvas);
      console.log("New canvas appended to container");
    } else {
      // Canvas exists, just update the ref
      console.log("Using existing canvas, updating ref");
      canvasRef.current = canvas;
    }

    // Cleanup function - don't remove canvas as it should persist across tab switches
    return () => {
      // Canvas should persist across tab switches, no cleanup needed
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleResize = () => {
      if (!containerRef.current) return;

      // Don't interfere with fit-to-screen operation - wait for it to complete
      if (isProcessingFitToScreenRef.current) {
        console.log(
          "Skipping resize - fit-to-screen is currently being processed"
        );
        return;
      }

      // Don't trigger resize during tab changes to prevent cross-contamination
      if (isTabChangeInProgressRef.current) {
        console.log("Skipping resize - tab change is in progress");
        return;
      }

      // Only process resize if tab is actually visible
      if (!isTabVisibleRef.current) {
        console.log("Skipping resize - tab not visible");
        return;
      }

      // Check if the container is actually visible (not hidden by tabs)
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        console.log("Skipping resize - container not visible (0 dimensions)");
        return;
      }

      // Check if size actually changed to avoid unnecessary recreation
      const currentWidth = Math.round(rect.width);
      const currentHeight = Math.round(rect.height);
      const lastSize = lastContainerSizeRef.current;

      // Skip if this is the first measurement (initialization case)
      if (lastSize.width === 0 && lastSize.height === 0) {
        console.log(
          "First size measurement, storing initial size:",
          currentWidth,
          "x",
          currentHeight
        );
        lastContainerSizeRef.current = {
          width: currentWidth,
          height: currentHeight,
        };
        return;
      }

      // Only recreate if there's a significant size change (more than 5px)
      const widthDiff = Math.abs(currentWidth - lastSize.width);
      const heightDiff = Math.abs(currentHeight - lastSize.height);
      const RESIZE_THRESHOLD = 5; // Only recreate for changes larger than 5px

      if (widthDiff < RESIZE_THRESHOLD && heightDiff < RESIZE_THRESHOLD) {
        console.log(
          `Skipping resize - size change too small (${widthDiff}x${heightDiff})`
        );
        return;
      }

      // Update the last known size
      lastContainerSizeRef.current = {
        width: currentWidth,
        height: currentHeight,
      };

      console.log(
        `Container resized significantly (${currentWidth}x${currentHeight}), recreating canvas for proper WebGL aspect ratio adaptation`
      );

      // For actual resize, we need to recreate the canvas DOM element to get proper aspect ratio
      const container = containerRef.current;

      // Remove existing canvas
      if (canvasRef.current && canvasRef.current.parentNode === container) {
        console.log("Removing existing canvas for resize recreation");
        container.removeChild(canvasRef.current);
        // Reset refs
        initializedCanvasRef.current = null;
        initializingCanvasRef.current = null;
        canvasRef.current = null;
      }

      // Create new canvas with current container dimensions
      console.log("Creating new canvas for resize");
      const newCanvas = document.createElement("canvas");
      newCanvas.id = "schematic-canvas";
      newCanvas.style.width = "100%";
      newCanvas.style.height = "100%";
      newCanvas.style.display = "block";
      newCanvas.style.border = "solid 1px gray";

      // Add to container and update ref
      container.appendChild(newCanvas);
      canvasRef.current = newCanvas;

      // Initialize the new canvas
      safeInitCanvas(newCanvas);
      if (onCanvasResized) {
        onCanvasResized();
      }
    };

    // Debounce the resize handler to reduce frequency
    const debouncedResizeHandler = debounce(handleResize, 300); // Reduced debounce time for better responsiveness

    // Wrapper for resize handler that performs final checks
    const visibilityAwareResizeHandler = () => {
      // Final check for tab visibility - this prevents resize triggers during tab switches
      if (!isTabVisibleRef.current) {
        console.log("Skipping resize - final tab visibility check failed");
        return;
      }

      // Final check for tab change in progress
      if (isTabChangeInProgressRef.current) {
        console.log(
          "Skipping resize - final tab change check shows change in progress"
        );
        return;
      }

      debouncedResizeHandler();
    };

    // Only initialize if canvas exists but hasn't been initialized for this canvas instance
    if (
      canvasRef.current &&
      initializedCanvasRef.current !== canvasRef.current
    ) {
      console.log("Canvas exists but not initialized, initializing");
      safeInitCanvas(canvasRef.current);
    }

    // Event listeners
    window.addEventListener("resize", visibilityAwareResizeHandler);
    const resizeObserver = new ResizeObserver(visibilityAwareResizeHandler);
    resizeObserver.observe(container);

    return () => {
      console.log("Cleaning up schematic listeners");
      window.removeEventListener("resize", visibilityAwareResizeHandler);
      resizeObserver.disconnect();
      debouncedResizeHandler.cancel();
    };
  }, [safeInitCanvas, onCanvasResized]);

  const sendToNetListButtonHandler = useCallback(async () => {
    if (!canvasRef.current) return;

    try {
      const result = await eeSch.getNetList();
      const { netList, success } = result || { netList: "", success: false };

      // Read one-shot override flag (set when user holds Shift)
      const {
        overrideSimulateOnNetlistErrorsOnce,
        exportNetlist,
        setOverrideSimulateOnNetlistErrorsOnce,
      } = useAppStore.getState() as unknown as {
        overrideSimulateOnNetlistErrorsOnce?: boolean;
        exportNetlist: (netlist: string) => void;
        setOverrideSimulateOnNetlistErrorsOnce?: (override: boolean) => void;
      };

      if (success || overrideSimulateOnNetlistErrorsOnce) {
        // Proceed: store netlist (with preamble) and navigate to Simulate
        exportNetlist(netList);
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
      console.error("[DEBUG NETLIST] getNetList() failed", err);
      toaster.create({
        title: "Netlist Error",
        description: "Unable to generate netlist. Check schematic and try again.",
        type: "error",
      });
    }
  }, []);

  const propertiesCallBack = React.useCallback(() => {
    setPropertiesOpen(false);
  }, []);

  useEffect(() => {
    if (!selectedItem || selectedItem.type === "none") {
      setPropertiesOpen(false);
    } else if (!isPlotSelectionMode) {
      // Only open properties dialog when not in plot selection mode
      setPropertiesOpen(true);
    }
  }, [selectedItem, isPlotSelectionMode]);

  const handleExportImage = () => {
    setLoadingSvg(true);
    setSvgContent(null);
    setShowExportImageDialog(true);
    eeSch.sendCommand({ command: "export", exportType: "svg" });
  };

  const handleShowShortcuts = () => {
    setShowShortcutsDialog(true);
  };

  // Derive schematic error flag from info messages and update global UI state
  useEffect(() => {
    const hasErrors = info.some((i) => i.message.startsWith("error:"));
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
  }, [info]);

  return (
    <Box position="relative" height={"100%"}>
      <Box
        position="relative"
        height="100%"
        ref={containerRef}
        id="canvas-container"
        tabIndex={0} // Make container focusable for keyboard shortcuts
        outline="none" // Remove default focus outline
      >
        {/* Canvas added dynamically */}

        <Float offset="10" placement="middle-start">
          {<Actions
            availableComponents={availableComponents}
            onExportImage={handleExportImage}
            onShowShortcuts={handleShowShortcuts}
          />}
        </Float>
        {propertiesOpen && (
          <Properties
            selectedItem={selectedItem}
            canvasHeight={canvasHeight}
            onApply={(name, value) => {
              eeSch.sendCommand({
                command: "setSelectedItemNameValue",
                name: name,
                value: value,
              });
            }}
            onCloseButtonClick={propertiesCallBack}
          />
        )}

        {/* Plot Selection Mode Indicator */}
        {isPlotSelectionMode && (
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
            <div>🎯 Plot Selection Mode Active</div>
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
                      {item.type}({item.name})
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

        {/* Status Icon - Top Right Floating */}
        <StatusIcon
          info={info}
          onClear={() => {
            setInfo([]);
            try {
              const { resetSchematicErrors } = useAppStore.getState() as {
                resetSchematicErrors?: () => void;
              };
              if (typeof resetSchematicErrors === "function") {
                resetSchematicErrors();
              }
            } catch {
              // ignore
            }
          }}
        />
      </Box>
      <ExportImageDialog
        isOpen={showExportImageDialog}
        onClose={() => setShowExportImageDialog(false)}
        svgContent={svgContent}
        loading={loadingSvg}
      />
      <ShortcutsDialog
        isOpen={showShortcutsDialog}
        onClose={() => setShowShortcutsDialog(false)}
      />
    </Box>
  );
};

export default Schematic;
