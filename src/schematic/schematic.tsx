import React, { useEffect, useRef, useCallback, useState } from "react";
import * as eeSch from "eecircuit-schematic";

import { saveView, restoreView } from "eecircuit-schematic";
import { Box, Flex, Float, IconButton, Button } from "@chakra-ui/react";
import { ArrowBigRight, Expand, SquareX } from "lucide-react";
import debounce from "lodash.debounce";

import Actions from "./actions";
import Properties from "./properties";
import Status from "./status";
import { Tooltip } from "../components/ui/tooltip";
import { useColorModeValue } from "../components/ui/color-mode";
import ExportImageDialog from "./ExportImageDialog";
import {
  EEcircuitFile,
  SimulationType,
  ToBePlotted,
} from "src/types/commonTypes";

type SchematicProps = {
  onNetlistExported: (netlist: string) => void;
  shouldFitToScreen?: boolean;
  onCanvasResized?: () => void;
  getSimulationConfig?: () => SimulationType | undefined;
  isPlotSelectionMode?: boolean;
  onPlotItemSelected?: (item: ToBePlotted) => void;
  onExitPlotSelectionMode?: () => void;
};

const INITIAL_CANVAS_SIZE = 150; // Small fixed size for the first pass

const Schematic: React.FC<SchematicProps> = ({
  onNetlistExported,
  shouldFitToScreen,
  onCanvasResized,
  getSimulationConfig,
  isPlotSelectionMode = false,
  onPlotItemSelected,
  onExitPlotSelectionMode,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // Ref to store the requestAnimationFrame ID for cancellation
  const rafIdRef = useRef<number | null>(null);
  const lastSizeRef = useRef<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });
  const accumulatedResizeRef = useRef<{ width: number; height: number }>({
    width: 0,
    height: 0,
  }); // Track accumulated resize differences
  const initializedCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isTabVisibleRef = useRef<boolean>(true); // Track tab visibility without causing effect re-runs
  const shouldRestoreViewRef = useRef<boolean>(false); // Track if we need to restore view after canvas ready
  const shouldFitToScreenRef = useRef<boolean>(false); // Track if we need to fit to screen after canvas ready
  const hasInitializedOnceRef = useRef<boolean>(false); // Track if app has been initialized for the first time

  const [coord, setCoord] = useState({ x: 0, y: 0 });
  const [pointerInfo, setPointerInfo] = useState<string>("");
  const [selectedItem, setSelectedItem] = useState<eeSch.SelectedItem>({
    type: "none",
  } as eeSch.SelectedItem);

  const [availableComponents, setAvailableComponents] = useState<
    eeSch.AvailableComponent[]
  >([]);
  const [fullscreen, setFullscreen] = useState(false);
  const [propertiesOpen, setPropertiesOpen] = useState(false);

  const [info, setInfo] = useState<string[]>([]);
  const [canvasHeight, setCanvasHeight] = useState(0);
  const [isCanvasReady, setIsCanvasReady] = useState(false);
  const [showExportImageDialog, setShowExportImageDialog] = useState(false);
  const [svgContent, setSvgContent] = useState<string | null>(null);
  const [loadingSvg, setLoadingSvg] = useState(false);
  const [isCanvasOffscreen, setIsCanvasOffscreen] = useState(false); // Track if canvas control is transferred

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

            // Handle plot selection mode
            if (isPlotSelectionMode && onPlotItemSelected) {
              const item = msg.selectedItem;

              // Only allow wire and instance selections
              if (item.type === "wire" || item.type === "junction") {
                // Wire/junction selection - voltage measurement
                const netName = item.netName || "unknown";
                const plotItem: ToBePlotted = {
                  type: "voltage",
                  name: netName,
                };
                onPlotItemSelected(plotItem);
              } else if (item.type === "instance") {
                // Instance selection - current measurement
                const instanceName = item.name || item.typeName || "unknown";
                const plotItem: ToBePlotted = {
                  type: "current",
                  name: instanceName,
                };
                onPlotItemSelected(plotItem);
              }
            }
          }
          break;
        case "netList":
          onNetlistExported(msg.netList);
          break;
        case "availableComponents":
          setAvailableComponents(msg.availableComponents);
          break;
        case "canvasReady":
          console.log("Canvas ready message received from library");
          setIsCanvasReady(true);

          // If we should restore view, do so now
          if (shouldRestoreViewRef.current) {
            console.log("Restoring saved view after canvas ready");
            try {
              restoreView();
              shouldRestoreViewRef.current = false; // Clear the flag after restoring
            } catch (error) {
              console.warn("Failed to restore view:", error);
            }
          }
          // If fit-to-screen was requested and this is the first initialization, do it now
          else if (
            shouldFitToScreenRef.current &&
            !hasInitializedOnceRef.current
          ) {
            console.log("Performing fit-to-screen after initial canvas ready");
            eeSch.sendCommand({ command: "view", viewType: "fit" });
            shouldFitToScreenRef.current = false; // Clear the flag after fitting
            hasInitializedOnceRef.current = true; // Mark as initialized
          }
          // Mark as initialized even if fit-to-screen wasn't requested
          else if (!hasInitializedOnceRef.current) {
            console.log("Canvas ready for first time, marking as initialized");
            hasInitializedOnceRef.current = true;
          }
          break;
        case "info":
          setInfo((prevInfo) => [...prevInfo, `${msg.mType}: ${msg.info}`]);
          break;
        case "svg":
          setSvgContent(msg.svg);
          setLoadingSvg(false);
          break;
        case "savedSchematic": {
          console.log("received schematic data", msg.schematic);

          // Get current simulation configuration
          const currentSimConfig = getSimulationConfig
            ? getSimulationConfig()
            : undefined;
          console.log(
            "Current simulation config for saving:",
            currentSimConfig
          );

          // Handle the saved schematic data here
          const eeCirFile: EEcircuitFile = {
            schema: "EEcircuitV1",
            title: "EEcircuit",
            description: "EEcircuit Schematic",
            date: new Date().toISOString(),
            schematic: msg.schematic as eeSch.Schematic,
            // Include simulation configuration if it exists
            simulation: currentSimConfig,
          };

          console.log("Complete EEcircuit file for saving:", eeCirFile);
          // Add this code inside the 'savedSchematic' case in the msgCallback function

          // Create blob from file data
          const fileContent = JSON.stringify(eeCirFile, null, 2);
          console.log("JSON file content length:", fileContent.length);
          console.log(
            "JSON file content preview:",
            fileContent.substring(0, 500) + "..."
          );
          const blob = new Blob([fileContent], { type: "application/json" });

          // Create download link
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = "EEcircuit-" + new Date().toISOString() + ".json";

          // Trigger download
          document.body.appendChild(link);
          link.click();

          // Cleanup
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          break;
        }
      }
    },
    [
      onNetlistExported,
      getSimulationConfig,
      isPlotSelectionMode,
      onPlotItemSelected,
    ]
  );

  // Helper function to wait for canvas to be ready for commands
  const waitForCanvasReady = useCallback(
    async (canvas: HTMLCanvasElement): Promise<boolean> => {
      return new Promise((resolve) => {
        const startTime = Date.now();
        const TIMEOUT_MS = 5000; // 5 second timeout

        // Check if canvas has valid dimensions and is attached to DOM
        const checkReady = () => {
          const isAttached = canvas.parentElement !== null;
          const hasValidDimensions = canvas.width > 0 && canvas.height > 0;
          const isVisible = canvas.offsetWidth > 0 && canvas.offsetHeight > 0;

          if (isAttached && hasValidDimensions && isVisible) {
            console.log("Canvas is ready for commands");
            resolve(true);
          } else if (Date.now() - startTime > TIMEOUT_MS) {
            console.warn("Canvas ready check timed out, proceeding anyway");
            resolve(false);
          } else {
            console.log(
              `Canvas not ready yet - attached: ${isAttached}, dimensions: ${canvas.width}x${canvas.height}, visible: ${canvas.offsetWidth}x${canvas.offsetHeight}`
            );
            // Use requestAnimationFrame to wait for next render cycle
            requestAnimationFrame(checkReady);
          }
        };

        checkReady();
      });
    },
    []
  );

  // Helper function to safely initialize canvas only once
  const safeInitCanvas = useCallback(
    async (canvas: HTMLCanvasElement) => {
      if (initializedCanvasRef.current === canvas) {
        console.log("Canvas already initialized, skipping...");
        return false; // Already initialized
      }

      console.log("Initializing canvas...");

      // Wait for canvas to be ready first
      await waitForCanvasReady(canvas);

      eeSch.initCanvas(canvas, msgCallback);
      initializedCanvasRef.current = canvas;
      setIsCanvasReady(true);
      return true; // Successfully initialized
    },
    [msgCallback, waitForCanvasReady]
  );

  // Handle fit to screen when requested - only for initial app initialization
  useEffect(() => {
    if (shouldFitToScreen && !hasInitializedOnceRef.current) {
      console.log(
        "Fit to screen requested for initial initialization, setting flag for when canvas is ready"
      );
      shouldFitToScreenRef.current = true;

      // If canvas is already ready, send the command immediately (only for first time)
      if (isCanvasReady) {
        console.log(
          "Canvas already ready, performing fit-to-screen immediately for initial initialization"
        );
        eeSch.sendCommand({ command: "view", viewType: "fit" });
        shouldFitToScreenRef.current = false; // Clear the flag after fitting
        hasInitializedOnceRef.current = true; // Mark as initialized
      }
    } else if (shouldFitToScreen && hasInitializedOnceRef.current) {
      console.log(
        "Fit to screen requested but app already initialized, ignoring"
      );
    }
  }, [shouldFitToScreen, isCanvasReady]);

  // Effect to handle tab visibility changes and ensure canvas is properly initialized
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Create an intersection observer to detect when the component becomes visible
    const visibilityObserver = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        const isVisible = entry.isIntersecting && entry.intersectionRatio > 0;

        console.log("Tab visibility changed:", isVisible);

        // If tab is becoming hidden and we have an initialized canvas, save the view
        if (!isVisible && isTabVisibleRef.current && isCanvasReady) {
          console.log("Tab becoming hidden, saving view...");
          try {
            saveView(); // Simply call saveView() - it handles the storage internally
            shouldRestoreViewRef.current = true; // Set flag to restore when canvas becomes ready again
            console.log(
              "View saved successfully, will restore when canvas ready"
            );
          } catch (error) {
            console.warn("Failed to save view:", error);
          }
        }

        isTabVisibleRef.current = isVisible; // Update ref to avoid effect dependencies

        // When component becomes visible, ensure canvas is properly set up
        if (isVisible) {
          setTimeout(() => {
            // Give time for the DOM to settle after tab change
            if (canvasRef.current && containerRef.current) {
              console.log("Tab became visible, checking canvas state...");

              // Check if canvas is properly attached and sized
              const rect = containerRef.current.getBoundingClientRect();
              const canvasRect = canvasRef.current.getBoundingClientRect();

              console.log("Container rect:", rect.width, "x", rect.height);
              console.log(
                "Canvas rect:",
                canvasRect.width,
                "x",
                canvasRect.height
              );
              console.log("Canvas ready:", isCanvasReady);

              // Check if canvas truly needs reinitialization
              // Use both state and ref to determine if canvas is actually ready
              const isCanvasActuallyInitialized =
                initializedCanvasRef.current === canvasRef.current;
              const hasValidSize =
                canvasRect.width > 0 && canvasRect.height > 0;

              console.log("Canvas initialization check:", {
                isCanvasReady,
                isCanvasActuallyInitialized,
                hasValidSize,
                canvasRefExists: !!canvasRef.current,
                initializedCanvasRef: !!initializedCanvasRef.current,
              });

              // If canvas exists but isn't ready, or has zero size, reinitialize
              if (
                (!isCanvasReady && !isCanvasActuallyInitialized) ||
                !hasValidSize
              ) {
                console.log("Canvas needs reinitialization after tab switch");

                // Directly reinitialize canvas without triggering full recreation
                if (canvasRef.current) {
                  // If canvas has zero size, it might need proper sizing first
                  if (!hasValidSize) {
                    const parentWidth = rect.width;
                    const parentHeight = rect.height;

                    if (parentWidth > 0 && parentHeight > 0) {
                      console.log(
                        "Resizing canvas to match container:",
                        parentWidth,
                        "x",
                        parentHeight
                      );
                      canvasRef.current.width = parentWidth;
                      canvasRef.current.height = parentHeight;
                      canvasRef.current.style.width = `${parentWidth}px`;
                      canvasRef.current.style.height = `${parentHeight}px`;
                    }
                  }

                  // Only reinitialize if canvas is truly not initialized
                  if (!isCanvasActuallyInitialized) {
                    console.log(
                      "Canvas not actually initialized, reinitializing..."
                    );
                    safeInitCanvas(canvasRef.current).catch(console.error);
                  } else {
                    console.log(
                      "Canvas is actually initialized, syncing state..."
                    );
                    // Sync the state to match reality
                    setIsCanvasReady(true);
                  }
                }
              } else {
                console.log(
                  "Canvas is ready and properly sized, no action needed"
                );
              }
            }
          }, 100); // Small delay to ensure DOM is ready
        }
      },
      { threshold: [0, 0.1, 1] } // Multiple thresholds for better detection
    );

    visibilityObserver.observe(container);

    return () => {
      visibilityObserver.disconnect();
    };
  }, [safeInitCanvas]); // Only depend on safeInitCanvas, not isCanvasReady which changes frequently

  // Handle keyboard events for plot selection mode
  useEffect(() => {
    if (!isPlotSelectionMode) return;

    // Ensure we're in select mode when plot selection is active
    eeSch.sendCommand({ command: "mode", modeType: "select" });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onExitPlotSelectionMode?.();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isPlotSelectionMode, onExitPlotSelectionMode]);

  // Initialize the canvas and set up the message callback
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Check if canvas already exists to avoid recreation
    let canvas = document.getElementById(
      "schematic-canvas"
    ) as HTMLCanvasElement;

    if (!canvas) {
      // Create the canvas element only if it doesn't exist
      canvas = document.createElement("canvas");
      canvas.id = "schematic-canvas";
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      canvas.style.display = "block";
      canvas.style.border = "solid 1px gray"; // Initial border for visibility

      // Don't initialize yet - let the resize handler do it
      canvasRef.current = canvas;
      container.appendChild(canvas);
    } else {
      // Canvas exists, just update the ref
      canvasRef.current = canvas;
    }

    // Cleanup function to remove the canvas on unmount
    return () => {
      // Don't remove canvas on cleanup - let it persist for tab switching
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleResize = () => {
      if (!containerRef.current) return;
      const parent = containerRef.current;

      // Check if the container is actually visible (not hidden by tabs)
      const rect = parent.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        console.log("Skipping resize - container not visible");
        return;
      }

      // Check current dimensions
      const currentWidth = parent.clientWidth;
      const currentHeight = parent.clientHeight;

      // Skip if dimensions haven't changed significantly (allow for small variations)
      const lastSize = lastSizeRef.current;
      const widthDiff = Math.abs(currentWidth - lastSize.width);
      const heightDiff = Math.abs(currentHeight - lastSize.height);

      // Accumulate the resize differences to handle multiple small resizes
      accumulatedResizeRef.current.width += widthDiff;
      accumulatedResizeRef.current.height += heightDiff;

      const accumulatedWidthDiff = accumulatedResizeRef.current.width;
      const accumulatedHeightDiff = accumulatedResizeRef.current.height;

      // Much more conservative threshold - avoid frequent canvas recreation
      const RESIZE_THRESHOLD = 50; // Threshold for accumulated differences
      const LIGHTWEIGHT_RESIZE_THRESHOLD = RESIZE_THRESHOLD * 2; // 200px - threshold for lightweight resize

      if (
        canvasRef.current &&
        accumulatedWidthDiff < RESIZE_THRESHOLD &&
        accumulatedHeightDiff < RESIZE_THRESHOLD
      ) {
        console.log(
          `Skipping resize - accumulated differences not significant enough (${accumulatedWidthDiff}x${accumulatedHeightDiff})`
        );
        // Update the last size to track the current change, but don't reset accumulated differences yet
        lastSizeRef.current = { width: currentWidth, height: currentHeight };

        // If canvas exists and size hasn't changed, just ensure it's properly initialized
        if (!isCanvasReady) {
          console.log("Canvas exists but not ready, initializing...");
          safeInitCanvas(canvasRef.current).catch(console.error);
        }
        return;
      }

      // Additional check: If canvas is ready and the accumulated change is moderate, just resize without recreating
      if (
        canvasRef.current &&
        isCanvasReady &&
        accumulatedWidthDiff < LIGHTWEIGHT_RESIZE_THRESHOLD &&
        accumulatedHeightDiff < LIGHTWEIGHT_RESIZE_THRESHOLD
      ) {
        console.log("Performing lightweight resize without canvas recreation");
        // If we know the canvas is offscreen, we cannot resize directly from main thread
        if (isCanvasOffscreen) {
          console.log(
            "Canvas is offscreen, cannot resize directly from main thread"
          );
          // Note: We don't use fit command here as per requirements - fit should only be used during initial app initialization
        } else {
          // Try to resize directly, and catch if canvas has been transferred to offscreen
          try {
            // Check if canvas control has been transferred to offscreen
            // If so, we cannot resize it directly from the main thread
            const canvas = canvasRef.current;

            // Try to access and update canvas properties to check if it's still under main thread control
            canvas.width = currentWidth;
            canvas.height = currentHeight;
            canvas.style.width = `${currentWidth}px`;
            canvas.style.height = `${currentHeight}px`;

            console.log("Canvas resized successfully from main thread");
          } catch (error) {
            if (
              error instanceof DOMException &&
              error.name === "InvalidStateError"
            ) {
              console.log(
                "Canvas control transferred to offscreen, marking as offscreen"
              );
              setIsCanvasOffscreen(true); // Remember this for future resize attempts
              // Canvas has been transferred to offscreen, cannot resize directly
              console.log(
                "Cannot resize offscreen canvas directly from main thread"
              );
            } else {
              console.error("Unexpected error during canvas resize:", error);
            }
          }
        }

        // Update last known size
        lastSizeRef.current = { width: currentWidth, height: currentHeight };

        // Reset accumulated differences since we performed a resize
        accumulatedResizeRef.current = { width: 0, height: 0 };

        // Notify parent of canvas resize
        if (onCanvasResized) {
          onCanvasResized();
        }

        return;
      }

      // Update last known size
      lastSizeRef.current = { width: currentWidth, height: currentHeight };

      // Reset accumulated differences since we're proceeding with a full resize
      accumulatedResizeRef.current = { width: 0, height: 0 };

      console.log(
        `Resize triggered - Current: ${currentWidth}x${currentHeight}, Last: ${lastSize.width}x${lastSize.height}, Accumulated: ${accumulatedWidthDiff}x${accumulatedHeightDiff}`
      );
      console.log(
        `Canvas state - exists: ${!!canvasRef.current}, ready: ${isCanvasReady}, parent attached: ${canvasRef.current?.parentNode === parent}`
      );

      // Only proceed with full recreation if dimensions are valid
      if (currentWidth <= 0 || currentHeight <= 0) {
        console.log(
          "Skipping resize - invalid dimensions:",
          currentWidth,
          "x",
          currentHeight
        );
        return;
      }

      // Reset canvas ready state
      setIsCanvasReady(false);

      // --- Two-Pass Resize Logic ---

      // 0. Cancel any pending animation frame from previous resize events
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }

      // 1. Remove previous canvas if it exists
      if (canvasRef.current) {
        // Check if canvas is still attached to the expected parent
        if (canvasRef.current.parentNode === parent) {
          console.log("Removing previous canvas from parent");
          // Reset the initialized canvas ref since we're removing the old canvas
          if (initializedCanvasRef.current === canvasRef.current) {
            initializedCanvasRef.current = null;
          }
          parent.removeChild(canvasRef.current);
        } else {
          console.log(
            "Canvas exists but not attached to expected parent, skipping removal"
          );
        }
        canvasRef.current = null;
      }

      // --- Pass 1: Create and add small canvas ---
      console.log(
        `Pass 1: Creating small canvas (${INITIAL_CANVAS_SIZE}x${INITIAL_CANVAS_SIZE})`
      );
      const newCanvas = document.createElement("canvas");

      // Set attributes and style to the *initial* small size
      newCanvas.width = INITIAL_CANVAS_SIZE;
      newCanvas.height = INITIAL_CANVAS_SIZE;
      newCanvas.style.width = `${INITIAL_CANVAS_SIZE}px`;
      newCanvas.style.height = `${INITIAL_CANVAS_SIZE}px`;
      newCanvas.style.display = "block";
      newCanvas.style.border = "solid 1px orange"; // Indicate temporary size

      // Append the small canvas
      parent.appendChild(newCanvas);

      // Update ref, but DO NOT initialize yet
      canvasRef.current = newCanvas;

      // --- Pass 2: Defer final sizing and initialization ---
      rafIdRef.current = requestAnimationFrame(() => {
        // Check if component/container/canvas still exist before proceeding
        if (
          !containerRef.current ||
          !canvasRef.current ||
          canvasRef.current !== newCanvas
        ) {
          console.warn(
            "Resize Pass 2 skipped: Component or elements changed/unmounted."
          );
          rafIdRef.current = null;
          return;
        }

        const currentContainer = containerRef.current; // Use variable for clarity
        const currentCanvas = canvasRef.current; // Use variable for clarity

        // Read parent dimensions *after* layout calculation with small canvas
        const finalWidth = currentContainer.clientWidth;
        const finalHeight = currentContainer.clientHeight;

        console.log(
          `Pass 2: Resizing canvas to final size (${finalWidth}x${finalHeight}) and initializing.`
        );

        // Update canvas attributes (drawing buffer)
        currentCanvas.width = finalWidth;
        currentCanvas.height = finalHeight;

        // Update canvas style (display size)
        currentCanvas.style.width = `${finalWidth}px`;
        currentCanvas.style.height = `${finalHeight}px`;
        currentCanvas.style.border = "solid 1px green"; // Indicate final size (optional)

        // Update canvas height state
        setCanvasHeight(finalHeight);

        // *** Initialize the library *now* with the final canvas size ***
        safeInitCanvas(currentCanvas)
          .then(() => {
            // Notify parent that canvas has been resized after successful initialization
            onCanvasResized?.();
          })
          .catch(console.error);

        rafIdRef.current = null; // Clear the ref after execution

        // --- End Two-Pass Resize Logic ---
      });
    };

    // Debounce the entire two-pass handler with longer delay to reduce frequency
    const debouncedResizeHandler = debounce(handleResize, 500); // Increased from 250ms to 500ms

    // Wrapper for resize handler that checks visibility
    const visibilityAwareResizeHandler = () => {
      if (isTabVisibleRef.current) {
        // Use ref instead of state to avoid effect dependency
        debouncedResizeHandler();
      } else {
        console.log("Skipping resize - tab not visible");
      }
    };

    // Initial setup call - only run if canvas needs setup
    // Avoid running if canvas is already properly initialized to prevent unnecessary resets
    if (!canvasRef.current || !isCanvasReady) {
      console.log("Initial handleResize call - canvas needs setup");
      handleResize(); // Trigger the two-pass process for the first time
    } else {
      console.log(
        "Skipping initial handleResize - canvas already ready and exists"
      );
    }

    // Event listeners
    window.addEventListener("resize", visibilityAwareResizeHandler);
    const resizeObserver = new ResizeObserver(visibilityAwareResizeHandler);
    resizeObserver.observe(container);

    // Cleanup
    return () => {
      console.log(
        "Cleaning up schematic listeners, canvas, and animation frame"
      );
      window.removeEventListener("resize", visibilityAwareResizeHandler);
      resizeObserver.disconnect();
      debouncedResizeHandler.cancel();

      // Cancel pending animation frame on unmount
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }

      // Remove the last canvas
      if (canvasRef.current && canvasRef.current.parentNode === container) {
        // Reset the initialized canvas ref since we're removing the canvas
        if (initializedCanvasRef.current === canvasRef.current) {
          initializedCanvasRef.current = null;
        }
        container.removeChild(canvasRef.current);
        canvasRef.current = null;
      }
    };
  }, [safeInitCanvas]); // Only depend on safeInitCanvas, remove isTabVisible dependency that causes re-runs

  const sendToNetListButtonHandler = useCallback(() => {
    if (!canvasRef.current) return;
    // Send command to export netlist
    eeSch.sendCommand({ command: "export", exportType: "netList" });
  }, []);

  const fullscreenHandler = React.useCallback(() => {
    if (!canvasRef.current) return;
    if (fullscreen) {
      document.exitFullscreen().catch((err) => {
        console.error(`Error exiting fullscreen: ${err.message}`);
      });
      setFullscreen(false);
    } else {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Error entering fullscreen: ${err.message}`);
      });
      setFullscreen(true);
    }
  }, [fullscreen]);

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

  return (
    <Flex direction="column" height={"100%"}>
      <Box
        position="relative"
        flex="1"
        ref={containerRef}
        id="canvas-container"
      >
        {/* Canvas added dynamically */}

        <Float offset="10" placement="middle-start">
          {
            <Actions
              availableComponents={availableComponents}
              onExportImage={handleExportImage}
              onSaveSchematic={() => {
                eeSch.sendCommand({
                  command: "export",
                  exportType: "schematic",
                });
              }}
            />
          }
        </Float>
        <Float offset="10">
          <Tooltip
            content={fullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          >
            <IconButton aria-label="Fullscreen" onClick={fullscreenHandler}>
              {!fullscreen ? <Expand /> : <SquareX />}
            </IconButton>
          </Tooltip>
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
            top="10px"
            left="50%"
            transform="translateX(-50%)"
            zIndex={1000}
            bg={useColorModeValue("blue.50", "blue.900")}
            color={useColorModeValue("blue.800", "blue.100")}
            px={4}
            py={2}
            borderRadius="md"
            border="1px solid"
            borderColor={useColorModeValue("blue.200", "blue.700")}
            fontSize="sm"
            boxShadow="sm"
          >
            Click on components (for current) or wires (for voltage) to add to
            plot. Press ESC when done.
          </Box>
        )}
      </Box>
      <Flex spaceX={2} direction="row" p={2}>
        {/* ... status bar buttons ... */}
        <Button size="sm">{`X:${coord.x}, Y:${coord.y}`}</Button>
        <Button size="sm">{pointerInfo || "Info"}</Button>
        <Button size="sm">{"none"}</Button>
        <Box flex="1" />

        {<Status info={info} />}

        <Box flex="1" />
        <Button size="sm" onClick={sendToNetListButtonHandler}>
          Simulate (Netlist) <ArrowBigRight size={16} />
        </Button>
      </Flex>
      <ExportImageDialog
        isOpen={showExportImageDialog}
        onClose={() => setShowExportImageDialog(false)}
        svgContent={svgContent}
        loading={loadingSvg}
      />
    </Flex>
  );
};

export default Schematic;
