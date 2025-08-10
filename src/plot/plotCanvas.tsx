import React, { useEffect, useState, useRef, useCallback } from "react";
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
import type { ZoomController } from "./zoomController";

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
  // Zoom synchronization props
  sharedZoomState?: {
    isZooming: boolean;
    zoomStartX: number | null;
    zoomEndX: number | null;
    zoomBounds: { min: number; max: number } | null;
  } | null;
  onZoomStateChange?: (zoomState: {
    isZooming: boolean;
    zoomStartX: number | null;
    zoomEndX: number | null;
    zoomBounds: { min: number; max: number } | null;
  }) => void;
  // Direct pan synchronization props - no React state needed
  otherCanvasZoomController?: React.RefObject<ZoomController | null>;
  zoomControllerRef?: React.RefObject<ZoomController | null>;
  // Function refs for immediate plot updates
  plotUpdateRef?: React.RefObject<(() => void) | null>;
  plotScalingRef?: React.RefObject<(() => void) | null>;
  otherCanvasUpdatePlot?: React.RefObject<(() => void) | null>;
  otherCanvasCalcScaling?: React.RefObject<(() => void) | null>;
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
  sharedZoomState,
  onZoomStateChange,
  otherCanvasZoomController,
  zoomControllerRef,
  plotUpdateRef,
  plotScalingRef,
  otherCanvasUpdatePlot,
  otherCanvasCalcScaling,
}) => {
  const inputProfile = useAppStore((state) => state.inputProfile);
  const emphasizedPlotIndex = useAppStore((state) => state.emphasizedPlotIndex);
  const [isAxis] = useState(true);
  
  // Ref for direct DOM manipulation of crosshair coordinates (no React re-renders)
  const crosshairDisplayRef = useRef<HTMLDivElement>(null);
  

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

  // Direct webgl redraw callback for zoom/pan operations (no React re-render)
  const handleWebglRedraw = useCallback(() => {
    if (updatePlotRef.current) {
      updatePlotRef.current();
    }
  }, []);

  // Direct DOM update for crosshair coordinates (no React re-render)
  const updateCrosshairDisplay = useCallback((x: number, y: number) => {
    if (crosshairDisplayRef.current) {
      crosshairDisplayRef.current.textContent = `X: ${formatEngineering(x)}, Y: ${formatEngineering(y)}`;
    }
  }, []);



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
    onCoordinateUpdate: updateCrosshairDisplay,
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
    
    // Set the zoom controller ref for direct pan synchronization
    if (zoomControllerRef) {
      zoomControllerRef.current = zoomController.current;
    }
    
    // Set function refs for direct plot updates from other canvas
    if (plotUpdateRef) {
      plotUpdateRef.current = updatePlot;
    }
    if (plotScalingRef) {
      plotScalingRef.current = calculateAndApplyScaling;
    }
  }, [updatePlot, calculateAndApplyScaling, axisScales, zoomController, zoomControllerRef, plotUpdateRef, plotScalingRef]);

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
    isCanvasInitialized,
    inputProfile,
    calculateAndApplyScaling,
    updatePlot,
    sharedZoomState,
    onZoomStateChange,
    otherCanvasZoomController,
    otherCanvasUpdatePlot,
    otherCanvasCalcScaling,
    getAxisScales: () => axisScalesRef.current,
    onWebglRedraw: handleWebglRedraw,
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
                (zoomController.current?.isZoomedIn() 
                  ? "💡 Right-drag to pan • Left-drag to zoom • Ctrl+scroll to zoom • Double-click to reset"
                  : "💡 Ctrl+scroll to zoom • Left-drag to zoom X-axis • Double-click to reset")}
              {inputProfile === "mouse" &&
                (zoomController.current?.isZoomedIn()
                  ? "💡 Right-drag to pan • Left-drag to zoom • Mouse wheel to zoom • Double-click to reset"
                  : "💡 Mouse wheel to zoom • Left-drag to zoom X-axis • Double-click to reset")}
              {inputProfile === "touchscreen" &&
                (zoomController.current?.isZoomedIn()
                  ? "💡 Right-drag to pan • Left-drag to zoom • Pinch to zoom • Double-click to reset"
                  : "💡 Pinch to zoom • Left-drag to zoom X-axis • Double-click to reset")}
            </Box>
          )}

          {/* Crosshair coordinates display - only when crosshair is active */}
          {showCrosshair && (
            <Box
              ref={crosshairDisplayRef}
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
              X: 0, Y: 0
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
                : zoomController.current?.getIsPanning()
                  ? "grabbing" // Show grabbing cursor when actively panning
                  : showCrosshair
                    ? "crosshair"
                    : "col-resize", // Default cursor suggests drag-to-zoom
            }}
            tabIndex={-1} // Prevent canvas from being focusable via keyboard
            onMouseDown={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const mouseX = e.clientX - rect.left;

              if (e.button === 0) {
                // Always allow zoom with left mouse button
                startZoom(mouseX);
              } else if (e.button === 2) {
                if (zoomController.current?.isZoomedIn()) {
                  // Right mouse button when zoomed - start drag panning
                  e.preventDefault(); // Prevent context menu
                  zoomController.current.startPan(mouseX);
                } else {
                  // Prevent context menu on right-click when not zoomed
                  e.preventDefault();
                }
              }
            }}
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const mouseX = e.clientX - rect.left;
              const mouseY = e.clientY - rect.top;

              if (zoomController.current?.getIsZooming()) {
                // Update zoom selection - ZoomController handles webgl redraw automatically
                updateZoomSelection(mouseX);
                // No React re-render needed for zoom selection visual updates
                return;
              } else if (zoomController.current?.getIsPanning()) {
                // Real-time drag panning - this will sync to other canvas immediately
                zoomController.current.updatePan(mouseX);
                // ZoomController will trigger webgl redraw automatically via callback
                // No React re-render needed for smooth panning
              } else {
                // Crosshair behavior when not zooming or panning
                updateCrosshair(mouseX, mouseY);
                // Crosshair updates already trigger webgl redraw, no need for React re-render
                return;
              }
            }}
            onMouseUp={(e) => {
              if (e.button === 0) {
                if (zoomController.current?.getIsZooming()) {
                  // Complete zoom on left mouse button release
                  completeZoom();
                }
              } else if (e.button === 2) {
                if (zoomController.current?.getIsPanning()) {
                  // End drag panning on right mouse button release
                  zoomController.current.endPan();
                  // Final redraw after pan ends - use React update for state consistency
                  calculateAndApplyScaling();
                  if (isCanvasInitialized) {
                    updatePlot();
                  }
                }
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
              // Handle mouse leave during operations
              if (!zoomController.current?.getIsZooming()) {
                setShowCrosshair(false);
                if (isCanvasInitialized) {
                  updatePlot();
                }
              }
              // End panning if mouse leaves canvas
              if (zoomController.current?.getIsPanning()) {
                zoomController.current.endPan();
                // Final redraw after pan ends - use React update for state consistency
                calculateAndApplyScaling();
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
