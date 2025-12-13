import { RefObject, useEffect, useRef } from "react";
import { LineConfig } from "webgl-plot";
import { ZoomController } from "./zoomController";


// Extended LineConfig with metadata for variable tracking
type ExtendedLineConfig = LineConfig & {
  variableName?: string;
  parameterValue?: string;
  isBracketLine?: boolean;
};

interface AxisScales {
  scaleX: number;
  scaleY: number;
  offsetX: number;
  offsetY: number;
}

interface UseZoomProps {
  zoomController: RefObject<ZoomController>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  selectedVariables: string[];
  lineDataRef: RefObject<ExtendedLineConfig[]>;
  isCanvasInitialized: boolean;
  inputProfile: string;
  calculateAndApplyScaling: () => void;
  updatePlot: () => void;
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
  otherCanvasZoomController?: React.RefObject<ZoomController | null>;
  otherCanvasUpdatePlot?: React.RefObject<(() => void) | null>;
  otherCanvasCalcScaling?: React.RefObject<(() => void) | null>;
  getAxisScales: () => AxisScales;
  // Direct webgl redraw callback (no React re-render)
  onWebglRedraw?: () => void;
  // Canvas identification for dual mode
  canvasId?: 1 | 2;
  // Log axis state
  isLogX: boolean;
  isLogY: boolean;
}

export const useZoom = ({
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
  getAxisScales,
  onWebglRedraw,
  canvasId,
  isLogX,
  isLogY,
}: UseZoomProps) => {
  const lastSyncedZoomState = useRef<typeof sharedZoomState>(null);

  // Set up zoom state synchronization callback
  useEffect(() => {
    const controller = zoomController.current;
    if (controller && onZoomStateChange) {
      controller.setZoomStateCallback(onZoomStateChange);
      return () => {
        controller.setZoomStateCallback(null);
      };
    }

    return undefined;
  }, [zoomController, onZoomStateChange]);

  // Set up direct webgl redraw callback
  useEffect(() => {
    const controller = zoomController.current;
    if (controller && onWebglRedraw) {
      // Create a combined callback that also recalculates scaling for real-time operations
      const webglRedrawWithScaling = () => {
        calculateAndApplyScaling();
        onWebglRedraw();
      };
      controller.setWebglRedrawCallback(webglRedrawWithScaling);
      return () => {
        controller.setWebglRedrawCallback(null);
      };
    }

    return undefined;
  }, [zoomController, onWebglRedraw, calculateAndApplyScaling]);
  
  // Set up direct pan offset synchronization callback
  useEffect(() => {
    const controller = zoomController.current;
    if (controller && otherCanvasZoomController) {
      const directPanSyncCallback = (panOffset: number) => {
        // Directly apply pan offset to the other canvas without React state
        if (otherCanvasZoomController.current) {
          otherCanvasZoomController.current.applyExternalPanOffset(panOffset);
          
          // CRITICAL: Immediately trigger redraw of the other canvas
          if (otherCanvasCalcScaling?.current) {
            otherCanvasCalcScaling.current();
          }
          if (otherCanvasUpdatePlot?.current) {
            otherCanvasUpdatePlot.current();
          }
        }
      };
      
      controller.setPanOffsetCallback(directPanSyncCallback);
      return () => {
        controller.setPanOffsetCallback(null);
      };
    }

    return undefined;
  }, [zoomController, otherCanvasZoomController, otherCanvasUpdatePlot, otherCanvasCalcScaling]);

  // Handle incoming shared zoom state changes
  useEffect(() => {
    if (
      sharedZoomState &&
      zoomController.current &&
      sharedZoomState !== lastSyncedZoomState.current
    ) {
      lastSyncedZoomState.current = sharedZoomState;
      
      // Update axis scales before applying external zoom state
      zoomController.current.updateAxisScales(getAxisScales());
      zoomController.current.updateLogAxisState({ isLogX, isLogY });
      
      // Apply the external zoom state
      zoomController.current.applyExternalZoomState(sharedZoomState);
      
      // If zoom bounds changed, recalculate scaling
      if (sharedZoomState.zoomBounds || !sharedZoomState.isZooming) {
        calculateAndApplyScaling();
        if (isCanvasInitialized) {
          updatePlot();
        }
      }
      
      // If we're showing zoom visuals, force a redraw
      if (sharedZoomState.isZooming && isCanvasInitialized) {
        updatePlot();
      }
    }
  }, [
    sharedZoomState,
    zoomController,
    calculateAndApplyScaling,
    updatePlot,
    isCanvasInitialized,
    getAxisScales,
    isLogX,
    isLogY,
  ]);
  
  
  // Zoom functions
  const startZoom = (mouseX: number) => {
    // Update zoom controller with current axis scales before starting zoom
    zoomController.current?.updateAxisScales(getAxisScales());
    zoomController.current?.updateLogAxisState({ isLogX, isLogY });
    zoomController.current?.startZoom(mouseX);
  };

  const updateZoomSelection = (mouseX: number) => {
    zoomController.current?.updateZoomSelection(mouseX);
  };

  const completeZoom = () => {
    const appliedBounds = zoomController.current?.completeZoom();

    if (appliedBounds) {
      // Recalculate and apply new scaling when zoom is applied
      calculateAndApplyScaling();

      // Force immediate redraw to apply zoom without waiting for mouse movement
      if (isCanvasInitialized) {
        updatePlot();
      }
    }
  };

  const resetZoom = () => {
    const wasReset = zoomController.current?.resetZoom();

    if (wasReset) {
      // Immediately recalculate and redraw without delay
      calculateAndApplyScaling();
      if (isCanvasInitialized) {
        updatePlot();
      }
    }
  };

  // Handle horizontal scroll wheel for panning when zoomed in
  // Supports both dedicated horizontal scroll wheels and Shift+vertical scroll
  const handleHorizontalScroll = (deltaX: number) => {
    if (!zoomController.current?.isZoomedIn()) {
      return; // Only allow scrolling when zoomed in
    }

    // ZoomController will handle the scroll and trigger webgl redraw automatically
    zoomController.current.handleHorizontalScroll(deltaX);
    // No React re-render needed - webgl redraw callback handles the visual update
  };

  // Handle zoom at cursor position based on input profile
  const handleZoomAtCursor = (
    mouseX: number,
    mouseY: number,
    zoomIn: boolean
  ) => {
    if (!canvasRef.current || selectedVariables.length === 0) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    // Get current axis scales (important for zoomed state)
    const currentAxisScales = getAxisScales();

    // Convert mouse position to data coordinates (matching ZoomController logic)
    const mouseNdcX = (mouseX / rect.width) * 2 - 1;
    const mouseDataX = (mouseNdcX - currentAxisScales.offsetX) / currentAxisScales.scaleX;
    // Note: Data coordinates are already in log space when log axes are enabled

    // Get full data bounds for zoom limits
    const firstVisibleLineIndex = lineDataRef.current?.findIndex((lineData) => {
      // Use variableName from line metadata instead of array index
      // This is crucial for bracket operations where there are multiple lines per variable
      const extendedLineData = lineData as ExtendedLineConfig;
      const variableName = extendedLineData.variableName;
      return variableName && selectedVariables.includes(variableName);
    });

    if (firstVisibleLineIndex === -1 || !lineDataRef.current) return;

    const firstVisibleLine = lineDataRef.current[firstVisibleLineIndex];
    if (!firstVisibleLine) return;
    
    const points = firstVisibleLine.points;
    if (points.length < 2) return;
    
    let fullXMin = points[0];
    let fullXMax = points[0];
    
    if (fullXMin === undefined || fullXMax === undefined) return;
    
    for (let i = 0; i < points.length; i += 2) {
      const x = points[i];
      if (x !== undefined) {
        fullXMin = Math.min(fullXMin, x);
        fullXMax = Math.max(fullXMax, x);
      }
    }
    const fullRange = fullXMax - fullXMin;

    // Create a zoom region centered on the cursor
    const currentBounds = zoomController.current?.getZoomBounds();
    let xMin: number, xMax: number;

    if (currentBounds) {
      xMin = currentBounds.min;
      xMax = currentBounds.max;
    } else {
      xMin = fullXMin;
      xMax = fullXMax;
    }

    const currentRange = xMax - xMin;

    // Adjust zoom factor based on input profile - trackpad is more sensitive so use smaller increments
    let zoomFactor;
    if (inputProfile === "trackpad") {
      zoomFactor = zoomIn ? 0.98 : 1.02; // Zoom in by 10% or out by 11% (slower)
    } else {
      zoomFactor = zoomIn ? 0.8 : 1.25; // Zoom in by 20% or out by 25% (normal speed)
    }

    const newRange = currentRange * zoomFactor;

    // Prevent zooming out beyond the full data range
    if (!zoomIn && newRange >= fullRange) {
      // If trying to zoom out beyond full range, reset to full view
      zoomController.current?.resetZoom();
      calculateAndApplyScaling();
      if (isCanvasInitialized) {
        updatePlot();
      }
      return;
    }

    // Calculate the cursor position as a ratio within the current view
    const cursorRatio = (mouseDataX - xMin) / currentRange;

    // Calculate new bounds centered on cursor position
    const newXMin = mouseDataX - newRange * cursorRatio;
    const newXMax = mouseDataX + newRange * (1 - cursorRatio);

    // Apply zoom using zoom controller
    zoomController.current?.setZoomBounds(newXMin, newXMax);

    // Recalculate and redraw
    calculateAndApplyScaling();
    if (isCanvasInitialized) {
      updatePlot();
    }
  };

  return {
    startZoom,
    updateZoomSelection,
    completeZoom,
    resetZoom,
    handleHorizontalScroll,
    handleZoomAtCursor,
  };
};
