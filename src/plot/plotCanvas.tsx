import React, { useEffect, useState, useRef } from "react";
import { ResultType } from "eecircuit-engine";
import { Box, Grid, GridItem, Button } from "@chakra-ui/react";
import { clearColorCache } from "./colorUtils";
import { formatEngineering } from "./formatUtils";
import Axis from "./axis";
import { useAppStore } from "../store/appStore";
import { useCanvasInitialization } from "./useCanvasInitialization";
import { useCanvasDimensions } from "./useCanvasDimensions";
import { useCrosshair } from "./useCrosshair";
import { useZoom } from "./useZoom";
import { usePlotCalculations } from "./usePlotCalculations";
import { useEventHandlers } from "./useEventHandlers";
import PlotProgressOverlay from "../components/PlotProgressOverlay";
import type { AggregatedResult } from "../simulation/resultAggregator";

interface PlotCanvasProps {
  results: ResultType[];
  selectedVariables: string[];
  hoveredVariable: string | null;
  // Bracket operation props
  isBracketOperationPlot?: boolean;
  bracketOperationResults?: AggregatedResult;
  // Cursor synchronization props
  sharedCursorX?: number | null;
  onCursorXChange?: (x: number) => void;
  sharedCursorVisible?: boolean;
  onCursorVisibilityChange?: (visible: boolean) => void;
}

const PlotCanvas: React.FC<PlotCanvasProps> = ({
  results,
  selectedVariables,
  hoveredVariable,
  isBracketOperationPlot = false,
  bracketOperationResults,
  sharedCursorX,
  onCursorXChange,
  sharedCursorVisible,
  onCursorVisibilityChange,
}) => {
  const inputProfile = useAppStore((state) => state.inputProfile);
  const emphasizedPlotIndex = useAppStore((state) => state.emphasizedPlotIndex);
  const [isAxis] = useState(true);

  // We need to use refs to avoid circular dependencies between hooks
  const updatePlotRef = useRef<(() => void) | null>(null);
  const calculateAndApplyScalingRef = useRef<(() => void) | null>(null);
  const axisScalesRef = useRef({
    scaleX: 1,
    scaleY: 1,
    offsetX: 0,
    offsetY: 0,
  });

  // Callback for cursor sync redraw
  const handleRedrawNeeded = () => {
    if (updatePlotRef.current) {
      updatePlotRef.current();
    }
  };

  // Initialize canvas first
  const {
    canvasRef,
    wglpRef,
    plotLineRef,
    crosshairRef,
    snapCircleRef,
    zoomController,
    zoomLinesRef,
    zoomRegionRef,
    lineDataRef,
    colorMapRef,
    isCanvasInitialized,
  } = useCanvasInitialization({
    results,
    updatePlot: () => updatePlotRef.current?.(),
  });

  // Initialize crosshair
  const {
    showCrosshair,
    setShowCrosshair,
    crosshairSnapToLines,
    setCrosshairSnapToLines,
    crosshairCoords,
    updateCrosshair,
  } = useCrosshair({
    crosshairRef,
    snapCircleRef,
    canvasRef,
    results,
    selectedVariables,
    lineDataRef,
    getAxisScales: () => axisScalesRef.current,
    sharedCursorX,
    onCursorXChange,
    sharedCursorVisible,
    onCursorVisibilityChange,
    onRedrawNeeded: handleRedrawNeeded,
  });

  // Initialize plot calculations
  const { axisScales, calculateAndApplyScaling, updatePlot } =
    usePlotCalculations({
      plotLineRef,
      wglpRef,
      crosshairRef,
      snapCircleRef,
      zoomLinesRef,
      zoomRegionRef,
      zoomController,
      lineDataRef,
      colorMapRef,
      results,
      selectedVariables,
      hoveredVariable,
      showCrosshair,
      crosshairSnapToLines,
      isBracketOperationPlot,
      bracketOperationResults,
      emphasizedPlotIndex,
    });

  // Update refs when functions change
  useEffect(() => {
    updatePlotRef.current = updatePlot;
    calculateAndApplyScalingRef.current = calculateAndApplyScaling;
    axisScalesRef.current = axisScales;
  }, [updatePlot, calculateAndApplyScaling, axisScales]);

  // Initialize zoom
  const {
    startZoom,
    updateZoomSelection,
    completeZoom,
    resetZoom,
    handleHorizontalScroll,
    handleZoomAtCursor,
  } = useZoom({
    zoomController,
    canvasRef,
    selectedVariables,
    lineDataRef,
    axisScales,
    isCanvasInitialized,
    inputProfile,
    calculateAndApplyScaling,
    updatePlot,
  });

  // Initialize event handlers
  useEventHandlers({
    canvasRef,
    zoomController,
    isCanvasInitialized,
    selectedVariables,
    inputProfile,
    handleZoomAtCursor,
    handleHorizontalScroll,
  });

  // Use canvas dimensions hook
  useCanvasDimensions({
    canvasRef,
    wglpRef,
    plotLineRef,
    isCanvasInitialized,
    calculateAndApplyScaling,
  });

  // Clear color cache when color mode changes
  useEffect(() => {
    clearColorCache(colorMapRef.current!);
    // Regenerate colors if canvas is already initialized
    if (isCanvasInitialized) {
      updatePlot();
    }
  }, [isCanvasInitialized]);

  // Update plot visibility when selected variables change
  useEffect(() => {
    if (isCanvasInitialized) {
      updatePlot();
    }
  }, [selectedVariables, isCanvasInitialized]);

  // Update plot when hover state changes
  useEffect(() => {
    if (isCanvasInitialized) {
      updatePlot();
    }
  }, [hoveredVariable, isCanvasInitialized]);

  // Update plot when emphasized plot index changes for bracket operations
  useEffect(() => {
    if (isCanvasInitialized && isBracketOperationPlot) {
      updatePlot();
    }
  }, [emphasizedPlotIndex, isCanvasInitialized, isBracketOperationPlot]);

  return (
    <Grid
      templateRows={`minmax(0, 1fr) ${isAxis ? 1.5 : 0}em`}
      templateColumns={`${isAxis ? 5 : 0}em minmax(0, 1fr)`}
      gap={0}
      w="100%"
      h="100%"
      minHeight={0}
    >
      <GridItem rowStart={1} colStart={1} borderRight="solid 2px">
        {isAxis ? (
          <Axis
            scale={axisScales.scaleY}
            offset={axisScales.offsetY}
            axis="y"
          />
        ) : (
          <></>
        )}
      </GridItem>
      <GridItem rowStart={1} colStart={2} minW="0" minH="0" overflow="hidden">
        <Box
          w="100%"
          h="100%"
          minW="0"
          minH="0"
          overflow="hidden"
          position="relative"
        >
          {/* Crosshair snap toggle button - always visible */}
          <Button
            position="absolute"
            top="0.625rem"
            right="0.625rem"
            size="md"
            variant={crosshairSnapToLines ? "solid" : "outline"}
            colorScheme="gray"
            onClick={() => setCrosshairSnapToLines(!crosshairSnapToLines)}
            fontSize="xs"
            px={2}
            py={1}
            height="auto"
            minW="auto"
            zIndex={10}
            title={
              crosshairSnapToLines
                ? "Crosshair snaps to lines (Click to disable)"
                : "Crosshair moves freely (Click to snap to lines)"
            }
            boxShadow="sm"
            bg="bg.panel/70"
            color="fg"
            backdropFilter="blur(0.25rem)"
            _hover={{
              bg: "bg.panel/90",
            }}
          >
            {crosshairSnapToLines ? "📍 Snap" : "🎯 Free"}
          </Button>

          {/* Reset zoom button - only visible when zoom is active */}
          {zoomController.current?.getZoomBounds() && (
            <Button
              position="absolute"
              top="0.625rem"
              right="50%"
              transform="translateX(50%)"
              size="md"
              variant="solid"
              colorScheme="yellow"
              onClick={resetZoom}
              fontSize="xs"
              px={2}
              py={1}
              height="auto"
              minW="auto"
              zIndex={10}
              title="Reset zoom to original view"
              boxShadow="sm"
              bg="yellow.solid/80"
              color="yellow.contrast"
              backdropFilter="blur(0.25rem)"
              _hover={{
                bg: "yellow.solid",
              }}
            >
              🔍 Reset Zoom
            </Button>
          )}

          {/* Zoom instructions - only when not currently zooming */}
          {!zoomController.current?.getIsZooming() && !showCrosshair && (
            <Box
              position="absolute"
              bottom="0.625rem"
              left="0.625rem"
              bg="bg.panel/70"
              backdropFilter="blur(0.25rem)"
              color="fg"
              px="0.5rem"
              py="0.25rem"
              borderRadius="md"
              border="1px solid"
              borderColor="border.muted/50"
              fontSize="xs"
              fontFamily="monospace"
              zIndex={10}
              boxShadow="sm"
            >
              {inputProfile === "trackpad" &&
                "💡 Ctrl+scroll to zoom • Click & drag to zoom X-axis • Double-click to reset"}
              {inputProfile === "mouse" &&
                "💡 Mouse wheel to zoom • Click & drag to zoom X-axis • Double-click to reset"}
              {inputProfile === "touchscreen" &&
                "💡 Pinch to zoom • Click & drag to zoom X-axis • Double-click to reset"}
            </Box>
          )}

          {/* Crosshair coordinates display - only when crosshair is active */}
          {showCrosshair && (
            <Box
              position="absolute"
              top="0.625rem"
              left="0.625rem"
              bg="bg.panel/70"
              backdropFilter="blur(0.25rem)"
              color="fg"
              px="0.5rem"
              py="0.25rem"
              borderRadius="md"
              border="1px solid"
              borderColor="border.muted/50"
              fontSize="sm"
              fontFamily="monospace"
              zIndex={10}
              boxShadow="sm"
            >
              X: {formatEngineering(crosshairCoords.x)}, Y:{" "}
              {formatEngineering(crosshairCoords.y)}
            </Box>
          )}
          <canvas
            ref={canvasRef}
            style={{
              width: "100%",
              height: "100%",
              display: "block",
              backgroundColor: "transparent",
              outline: "none", // Prevent focus outline on iPad and other touch devices
              cursor: zoomController.current?.getIsZooming()
                ? "col-resize"
                : zoomController.current?.isZoomedIn()
                  ? "grab" // Show grab cursor when zoomed and can pan
                  : showCrosshair
                    ? "crosshair"
                    : "default",
            }}
            tabIndex={-1} // Prevent canvas from being focusable via keyboard
            onMouseDown={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const mouseX = e.clientX - rect.left;

              if (e.button === 0) {
                // Left mouse button - start zoom
                startZoom(mouseX);
              } else if (e.button === 2) {
                // Prevent context menu on right-click when zoomed in
                if (zoomController.current?.isZoomedIn()) {
                  e.preventDefault();
                }
              }
            }}
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const mouseX = e.clientX - rect.left;
              const mouseY = e.clientY - rect.top;

              if (zoomController.current?.getIsZooming()) {
                // Update zoom selection
                updateZoomSelection(mouseX);
              } else {
                // Crosshair behavior when not zooming
                updateCrosshair(mouseX, mouseY);
              }
              // Always redraw after mouse move
              if (isCanvasInitialized) {
                updatePlot();
              }
            }}
            onMouseUp={(e) => {
              if (e.button === 0 && zoomController.current?.getIsZooming()) {
                // Complete zoom on left mouse button release
                completeZoom();
              }
            }}
            onDoubleClick={() => {
              // Reset zoom on double click
              resetZoom();
              if (isCanvasInitialized) {
                updatePlot();
              }
            }}
            onMouseEnter={() => {
              if (!zoomController.current?.getIsZooming()) {
                setShowCrosshair(true);
              }
            }}
            onMouseLeave={() => {
              // No drag-based panning; just hide crosshair
              if (!zoomController.current?.getIsZooming()) {
                setShowCrosshair(false);
                if (isCanvasInitialized) {
                  updatePlot();
                }
              }
            }}
            onContextMenu={(e) => {
              // Prevent context menu when right-clicking for panning
              if (zoomController.current?.isZoomedIn()) {
                e.preventDefault();
              }
            }}
          ></canvas>
          
          {/* Progress overlay positioned in bottom right corner of canvas */}
          <PlotProgressOverlay />
        </Box>
      </GridItem>
      <GridItem
        rowStart={2}
        colStart={1}
        borderTop="solid 2px"
        borderRight="solid 2px"
      />
      <GridItem rowStart={2} colStart={2} borderTop={isAxis ? "solid 2px" : ""}>
        {isAxis ? (
          <Axis
            scale={axisScales.scaleX}
            offset={axisScales.offsetX}
            axis="x"
          />
        ) : (
          <></>
        )}
      </GridItem>
    </Grid>
  );
};

export default PlotCanvas;
