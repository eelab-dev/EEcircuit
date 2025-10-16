import React, { useEffect, useState, useRef, useCallback } from "react";
import { ResultType } from "eecircuit-engine";
import { Box, Grid, GridItem, Button } from "@chakra-ui/react";
import { clearColorCache } from "./styling/colorUtils";
import { formatEngineering } from "./formatUtils";
import AxisCanvas, { type AxisCanvasRef } from "./axis/AxisCanvas";
import { useAppStore } from "../../store/appStore";
import { useCanvasInitialization } from "./useCanvasInitialization";
import { getPlotBackgroundColor } from "./styling/plotBackgroundColors";
import { useCanvasDimensions } from "./useCanvasDimensions";
import { useCrosshair } from "./interactions/useCrosshair";
import { useZoom } from "./interactions/useZoom";
import { usePlotCalculations } from "./usePlotCalculations";
import { useEventHandlers } from "./interactions/useEventHandlers";
import PlotProgressOverlay from "../../components/PlotProgressOverlay";
import type { AggregatedResult } from "../../simulation/resultAggregator";
import type { ZoomController } from "./interactions/zoomController";
import type { UnifiedLinePlot } from "webgl-plot";

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
  // X-axis scale synchronization props
  sharedXAxisScale?: { scaleX: number; offsetX: number; sourceCanvas: 1 | 2; timestamp: number } | null;
  onXAxisScaleChange?: ((scale: { scaleX: number; offsetX: number }) => void) | null;
  // Canvas identification for dual mode
  canvasId?: 1 | 2;
  // Direct plotLine ref access for external control
  plotLineRef?: React.RefObject<UnifiedLinePlot | null>;
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
  sharedXAxisScale,
  onXAxisScaleChange,
  canvasId,
  plotLineRef: externalPlotLineRef,
}) => {
  const inputProfile = useAppStore((state) => state.inputProfile);
  const emphasizedPlotIndex = useAppStore((state) => state.emphasizedPlotIndex);
  const isDarkMode = useAppStore((state) => state.isDarkMode);
  const [isAxis] = useState(true);

  // Theme-aware background color for canvas using single source of truth
  const canvasBackgroundColor = getPlotBackgroundColor(isDarkMode);

  // Ref for direct DOM manipulation of crosshair coordinates (no React re-renders)
  const crosshairDisplayRef = useRef<HTMLDivElement>(null);

  // Refs for imperative axis rendering (no React re-renders)
  const xAxisRef = useRef<AxisCanvasRef>(null);
  const yAxisRef = useRef<AxisCanvasRef>(null);

  // We need to use refs to avoid circular dependencies between hooks
  const updatePlotRef = useRef<(() => void) | null>(null);
  const calculateAndApplyScalingRef = useRef<(() => void) | null>(null);
  const axisScalesRef = useRef({
    scaleX: 1,
    scaleY: 1,
    offsetX: 0,
    offsetY: 0,
  });

  // Callback for cursor sync redraw - optimized for crosshair-only updates
  const handleRedrawNeeded = () => {
    // For crosshair updates in both single and dual canvas modes
    // Always draw plot lines first to ensure crosshair appears on top
    if (plotLineRef.current) {
      plotLineRef.current.draw();
    }

    // Draw crosshair if visible
    if (showCrosshair && crosshairRef.current) {
      crosshairRef.current.draw();
    }

    // Draw snap circle if in snap mode
    if (showCrosshair && crosshairSnapToLines && snapCircleRef.current) {
      snapCircleRef.current.draw();
    }

    // Draw zoom components if zooming
    if (
      zoomController.current?.getIsZooming() &&
      zoomLinesRef.current &&
      zoomRegionRef.current
    ) {
      zoomLinesRef.current.draw();
      zoomRegionRef.current.draw();
    }
  };

  // Full plot update callback for when complete redraw is needed
  const handleFullRedrawNeeded = () => {
    if (updatePlotRef.current) {
      updatePlotRef.current();
    }
  };

  // Direct webgl redraw callback for zoom/pan operations (no React re-render)
  const handleWebglRedraw = useCallback(() => {
    handleFullRedrawNeeded();
  }, []);

  // Direct DOM update for crosshair coordinates (no React re-render)
  const updateCrosshairDisplay = useCallback((x: number, y: number) => {
    if (crosshairDisplayRef.current) {
      crosshairDisplayRef.current.textContent = `X: ${formatEngineering(x)}, Y: ${formatEngineering(y)}`;
    }
  }, []);

  // Direct axis rendering (no React re-render)
  const renderAxes = useCallback(
    (scales: typeof axisScalesRef.current) => {
      // FINAL DEFENSIVE CHECK: Never render axes with invalid scales
      if (
        !isFinite(scales.scaleX) ||
        !isFinite(scales.scaleY) ||
        !isFinite(scales.offsetX) ||
        !isFinite(scales.offsetY) ||
        scales.scaleX === 0 ||
        scales.scaleY === 0
      ) {
        return; // Don't render axes with invalid scales
      }

      // CRITICAL FIX: Always get fresh log axis state from store to avoid stale closures
      const currentIsLogX = useAppStore.getState().isLogX;
      let currentIsLogY: boolean;
      if (canvasId === 1) {
        currentIsLogY = useAppStore.getState().isLogY1;
      } else if (canvasId === 2) {
        currentIsLogY = useAppStore.getState().isLogY2;
      } else {
        currentIsLogY = useAppStore.getState().isLogY; // Single canvas mode
      }

      const axisParams = {
        scale: scales.scaleX,
        offset: scales.offsetX,
        isDarkMode,
        isLogX: currentIsLogX,
        isLogY: currentIsLogY,
      };

      xAxisRef.current?.renderAxis(axisParams);

      const yAxisParams = {
        scale: scales.scaleY,
        offset: scales.offsetY,
        isDarkMode,
        isLogX: currentIsLogX,
        isLogY: currentIsLogY,
      };

      yAxisRef.current?.renderAxis(yAxisParams);
    },
    [isDarkMode]
  ); // Fresh values fetched inside effect to avoid stale closures

  // Initialize canvas first
  const {
    canvasRef,
    glRef,
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
  });

  // Initialize crosshair
  const {
    showCrosshair,
    crosshairSnapToLines,
    setCrosshairSnapToLines,
    updateCrosshair,
  } = useCrosshair({
    crosshairRef,
    snapCircleRef,
    canvasRef,
    plotLineRef,
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
    canvasId,
  });

  // Initialize plot calculations
  const { axisScales, calculateAndApplyScaling, updatePlot, updateHover, updateBracketEmphasis } =
    usePlotCalculations({
      plotLineRef,
      glRef,
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
      isCanvasInitialized,
      isBracketOperationPlot,
      bracketOperationResults,
      emphasizedPlotIndex,
      onAxisScalesChange: renderAxes, // Call axis rendering when scales change
      sharedXAxisScale,
      onXAxisScaleChange,
      canvasId,
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

    // Set external plotLine ref for direct access from parent
    if (externalPlotLineRef) {
      externalPlotLineRef.current = plotLineRef.current;
    }
  }, [
    updatePlot,
    calculateAndApplyScaling,
    axisScales,
    zoomController,
    zoomControllerRef,
    plotUpdateRef,
    plotScalingRef,
    externalPlotLineRef,
  ]);

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
    canvasId,
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
    resetZoom,
  });

  // Use canvas dimensions hook
  useCanvasDimensions({
    canvasRef,
    glRef,
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

  // Update zoom colors when theme changes (after initialization)
  useEffect(() => {
    if (isCanvasInitialized && zoomController.current) {
      zoomController.current.updateZoomColors(isDarkMode);
    }
  }, [isDarkMode, isCanvasInitialized]);

  // Update plot visibility when selected variables change
  useEffect(() => {
    if (isCanvasInitialized) {
      updatePlot();
    }
  }, [selectedVariables, isCanvasInitialized, canvasId]);

  // Update hover state with optimized line thickness changes only
  useEffect(() => {
    if (isCanvasInitialized) {
      updateHover();
    }
  }, [hoveredVariable, isCanvasInitialized, updateHover]);

  // Update plot when emphasized plot index changes for bracket operations
  // Use optimized updateBracketEmphasis instead of full updatePlot for better performance
  useEffect(() => {
    if (isCanvasInitialized && isBracketOperationPlot) {
      updateBracketEmphasis();
    }
  }, [emphasizedPlotIndex, isCanvasInitialized, isBracketOperationPlot, updateBracketEmphasis]);

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
        {isAxis ? <AxisCanvas ref={yAxisRef} axis="y" /> : <></>}
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
                  ? "💡 Scroll to pan • Drag to zoom • Double-click to reset"
                  : "💡 Drag to zoom • Double-click to reset")}
              {inputProfile === "mouse" &&
                (zoomController.current?.isZoomedIn()
                  ? "💡 Scroll wheel to pan • Drag to zoom • Shift+scroll to zoom • Double-click to reset"
                  : "💡 Shift+scroll to zoom • Drag to zoom • Double-click to reset")}
              {inputProfile === "touchscreen" &&
                (zoomController.current?.isZoomedIn()
                  ? "💡 Single-finger drag to pan • Pinch to zoom • Double-tap to reset"
                  : "💡 Pinch to zoom • Double-tap to reset")}
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
              backgroundColor: canvasBackgroundColor, // Theme-aware background
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
              // Don't automatically show cursor on mouse enter - let user control via toggle button
            }}
            onMouseLeave={() => {
              // Handle mouse leave during operations
              // Don't automatically hide cursor on mouse leave - let user control via toggle button
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
        {isAxis ? <AxisCanvas ref={xAxisRef} axis="x" /> : <></>}
      </GridItem>
    </Grid>
  );
};

export default PlotCanvas;
