import React, { useEffect, useRef, useCallback, useState } from "react";
import {
  AvailableComponent,
  initCanvas,
  MessageToApp,
  SelectedItem,
  sendCommand,
} from "eecircuit-schematic";
import { Box, Flex, Float, IconButton, Button } from "@chakra-ui/react";
import { ArrowBigRight, Expand, SquareX } from "lucide-react";
import debounce from "lodash.debounce";

import Actions from "./actions";
import Properties from "./properties";
import Status from "./status";
import { Tooltip } from "../components/ui/tooltip";

type SchematicProps = {
  onNetlistExported: (netlist: string) => void;
  shouldFitToScreen?: boolean;
  onCanvasResized?: () => void;
};

const INITIAL_CANVAS_SIZE = 150; // Small fixed size for the first pass

const Schematic: React.FC<SchematicProps> = ({
  onNetlistExported,
  shouldFitToScreen,
  onCanvasResized,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // Ref to store the requestAnimationFrame ID for cancellation
  const rafIdRef = useRef<number | null>(null);
  const lastSizeRef = useRef<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  const [coord, setCoord] = useState({ x: 0, y: 0 });
  const [pointerInfo, setPointerInfo] = useState<string>("");
  const [selectedItem, setSelectedItem] = useState<SelectedItem>({
    type: "none",
  } as SelectedItem);

  const [availableComponents, setAvailableComponents] = useState<
    AvailableComponent[]
  >([]);
  const [fullscreen, setFullscreen] = useState(false);
  const [propertiesOpen, setPropertiesOpen] = useState(false);
  const [dragBox, setDragBox] = useState(false);
  const [info, setInfo] = useState<string[]>([]);
  const [canvasHeight, setCanvasHeight] = useState(0);
  const [isCanvasReady, setIsCanvasReady] = useState(false);

  const msgCallback = useCallback(
    (msg: MessageToApp) => {
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
          }
          break;
        case "netList":
          onNetlistExported(msg.netList);
          break;
        case "availableComponents":
          setAvailableComponents(msg.availableComponents);
          break;
        case "info":
          setInfo((prevInfo) => [...prevInfo, `${msg.mType}: ${msg.info}`]);
          break;
      }
    },
    [onNetlistExported]
  );

  // Handle fit to screen when requested
  useEffect(() => {
    if (shouldFitToScreen && canvasRef.current && isCanvasReady) {
      // Add a small delay to ensure the canvas is fully rendered
      const timer = setTimeout(() => {
        sendCommand({ command: "view", viewType: "fit" });
      }, 50);
      return () => clearTimeout(timer);
    } else if (shouldFitToScreen && canvasRef.current && !isCanvasReady) {
      // Canvas exists but not ready, initialize it first
      console.log("Initializing canvas for fit-to-screen...");
      initCanvas(canvasRef.current, msgCallback);
      setIsCanvasReady(true);
      // The fit command will be triggered when isCanvasReady becomes true
    }
  }, [shouldFitToScreen, isCanvasReady, msgCallback]);

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

      if (canvasRef.current && widthDiff < 10 && heightDiff < 10) {
        console.log(
          `Skipping resize - dimensions haven't changed significantly (${widthDiff}x${heightDiff})`
        );
        // If canvas exists and size hasn't changed, just ensure it's properly initialized
        if (!isCanvasReady) {
          console.log("Canvas exists but not ready, initializing...");
          initCanvas(canvasRef.current, msgCallback);
          setIsCanvasReady(true);
        }
        return;
      }

      // Update last known size
      lastSizeRef.current = { width: currentWidth, height: currentHeight };

      console.log(
        `Resizing canvas from (${lastSize.width}x${lastSize.height}) to (${currentWidth}x${currentHeight})`
      );

      // Reset canvas ready state
      setIsCanvasReady(false);

      // --- Two-Pass Resize Logic ---

      // 0. Cancel any pending animation frame from previous resize events
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }

      // 1. Remove previous canvas if it exists
      if (canvasRef.current && canvasRef.current.parentNode === parent) {
        console.log("Removing previous canvas");
        parent.removeChild(canvasRef.current);
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
        initCanvas(currentCanvas, msgCallback);

        // Mark canvas as ready
        setIsCanvasReady(true);

        // Notify parent that canvas has been resized
        onCanvasResized?.();

        rafIdRef.current = null; // Clear the ref after execution

        // --- End Two-Pass Resize Logic ---
      });
    };

    // Debounce the entire two-pass handler
    const debouncedResizeHandler = debounce(handleResize, 250); // Adjust delay

    // Use IntersectionObserver to track visibility
    let isVisible = false;
    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        const wasVisible = isVisible;
        isVisible = entry.isIntersecting && entry.intersectionRatio > 0;

        // If container just became visible and we have a canvas, ensure it's ready
        if (isVisible && !wasVisible && canvasRef.current && !isCanvasReady) {
          console.log("Container became visible, ensuring canvas is ready...");
          setTimeout(() => {
            if (canvasRef.current && !isCanvasReady) {
              initCanvas(canvasRef.current, msgCallback);
              setIsCanvasReady(true);
            }
          }, 100);
        }
      },
      { threshold: 0.1 }
    );
    intersectionObserver.observe(container);

    // Wrapper for resize handler that checks visibility
    const visibilityAwareResizeHandler = () => {
      if (isVisible) {
        debouncedResizeHandler();
      } else {
        console.log("Skipping resize - container not visible");
      }
    };

    // Initial setup call
    handleResize(); // Trigger the two-pass process for the first time

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
      intersectionObserver.disconnect();
      debouncedResizeHandler.cancel();

      // Cancel pending animation frame on unmount
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }

      // Remove the last canvas
      if (canvasRef.current && canvasRef.current.parentNode === container) {
        container.removeChild(canvasRef.current);
        canvasRef.current = null;
      }
    };
  }, []); // msgCallback is stable*/

  const sendToNetListButtonHandler = useCallback(() => {
    if (!canvasRef.current) return;
    // Send command to export netlist
    sendCommand({ command: "export", exportType: "netList" });
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
    } else {
      setPropertiesOpen(true);
    }
  }, [selectedItem]);

  // Add drag and drop support for schematic files
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const preventDefault = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleDragOver = (e: DragEvent) => {
      preventDefault(e);
      // Provide visual feedback
      setDragBox(true);
    };

    const handleDragLeave = (e: DragEvent) => {
      preventDefault(e);
      setDragBox(false);
      // Restore original style
    };

    const handleDrop = async (e: DragEvent) => {
      preventDefault(e);
      setDragBox(false);
      const files = e.dataTransfer?.files;
      if (!files?.length) return;
      const file = files[0];
      const content = await file.text();
      sendCommand({ command: "loadSchematic", schematic: content });
    };

    // Add event listeners
    container.addEventListener("dragover", (e) =>
      handleDragOver(e as DragEvent)
    );
    container.addEventListener("dragenter", (e) =>
      preventDefault(e as DragEvent)
    );
    container.addEventListener("dragleave", (e) =>
      handleDragLeave(e as DragEvent)
    );
    container.addEventListener("drop", (e) => handleDrop(e as DragEvent));

    // Clean up
    return () => {
      container.removeEventListener("dragover", (e) =>
        handleDragOver(e as DragEvent)
      );
      container.removeEventListener("dragenter", (e) =>
        preventDefault(e as DragEvent)
      );
      container.removeEventListener("dragleave", (e) =>
        handleDragLeave(e as DragEvent)
      );
      container.removeEventListener("drop", (e) => handleDrop(e as DragEvent));
    };
  }, [dragBox]);

  return (
    <Flex direction="column" height={"100%"}>
      <Box
        position="relative"
        flex="1"
        ref={containerRef}
        id="canvas-container"
      >
        {/* Canvas added dynamically */}

        {dragBox ? (
          <Box bg="blue.400/80" width="100%" height="100%" position="absolute">
            <Flex
              direction="column"
              alignItems="center"
              justifyContent="center"
              width="100%"
              height="100%"
            >
              <Box
                p={4}
                color="gray.100"
                fontSize="5xl"
                width="50%"
                textAlign="center"
              >
                Drop schematic file here!
              </Box>
            </Flex>
          </Box>
        ) : null}

        <Float offset="10" placement="middle-start">
          {<Actions availableComponents={availableComponents} />}
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
              sendCommand({
                command: "setSelectedItemNameValue",
                name: name,
                value: value,
              });
            }}
            onCloseButtonClick={propertiesCallBack}
          />
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
          Send to Netlist <ArrowBigRight size={16} />
        </Button>
      </Flex>
    </Flex>
  );
};

export default Schematic;
