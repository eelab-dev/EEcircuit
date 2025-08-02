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

interface PlotCanvasProps {
  results: ResultType[];
  selectedVariables: string[];
  hoveredVariable: string | null;
  colorMode: "light" | "dark";
}

const PlotCanvas: React.FC<PlotCanvasProps> = ({
  results,
  selectedVariables,
  hoveredVariable,
  colorMode,
}) => {
  const inputProfile = useAppStore((state) => state.inputProfile);
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
    colorMode,
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
      colorMode,
      showCrosshair,
      crosshairSnapToLines,
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
    results,
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
  }, [colorMode, isCanvasInitialized]);

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
            theme={colorMode}
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
            top="10px"
            right="10px"
            size="md"
            variant={crosshairSnapToLines ? "solid" : "outline"}
            colorScheme={crosshairSnapToLines ? "white" : "gray.800"}
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
            bg={
              colorMode === "dark"
                ? "rgba(45, 55, 72, 0.7)"
                : "rgba(255, 255, 255, 0.7)"
            }
            backdropFilter="blur(4px)"
            _hover={{
              bg:
                colorMode === "dark"
                  ? "rgba(45, 55, 72, 0.9)"
                  : "rgba(255, 255, 255, 0.9)",
            }}
          >
            {crosshairSnapToLines ? "📍 Snap" : "🎯 Free"}
          </Button>

          {/* Reset zoom button - only visible when zoom is active */}
          {zoomController.current?.getZoomBounds() && (
            <Button
              position="absolute"
              top="10px"
              right="120px"
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
              bg={
                colorMode === "dark"
                  ? "rgba(255, 193, 7, 0.8)"
                  : "rgba(255, 193, 7, 0.9)"
              }
              color={colorMode === "dark" ? "black" : "white"}
              backdropFilter="blur(4px)"
              _hover={{
                bg:
                  colorMode === "dark"
                    ? "rgba(255, 193, 7, 1)"
                    : "rgba(255, 193, 7, 1)",
              }}
            >
              🔍 Reset Zoom
            </Button>
          )}

          {/* Zoom instructions - only when not currently zooming */}
          {!zoomController.current?.getIsZooming() && !showCrosshair && (
            <Box
              position="absolute"
              bottom="10px"
              left="10px"
              bg={
                colorMode === "dark"
                  ? "rgba(26, 32, 44, 0.7)"
                  : "rgba(255, 255, 255, 0.7)"
              }
              backdropFilter="blur(4px)"
              color={colorMode === "dark" ? "white" : "black"}
              px="8px"
              py="4px"
              borderRadius="md"
              border="1px solid"
              borderColor={
                colorMode === "dark"
                  ? "rgba(113, 128, 150, 0.5)"
                  : "rgba(203, 213, 224, 0.5)"
              }
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
              top="10px"
              left="10px"
              bg={
                colorMode === "dark"
                  ? "rgba(26, 32, 44, 0.7)"
                  : "rgba(255, 255, 255, 0.7)"
              }
              backdropFilter="blur(4px)"
              color={colorMode === "dark" ? "white" : "black"}
              px="8px"
              py="4px"
              borderRadius="md"
              border="1px solid"
              borderColor={
                colorMode === "dark"
                  ? "rgba(113, 128, 150, 0.5)"
                  : "rgba(203, 213, 224, 0.5)"
              }
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
            theme={colorMode}
          />
        ) : (
          <></>
        )}
      </GridItem>
    </Grid>
  );
};

export default PlotCanvas;
