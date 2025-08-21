import { useState, useEffect, useRef, RefObject, useCallback, startTransition } from "react";
import { ResultType } from "eecircuit-engine";
import { LineConfig, UnifiedLinePlot, WebglLinePlot, WebglPolygonPlot, clearCanvas } from "webgl-plot";
import { generatePlotColor, type PlotColor } from "./styling/colorUtils";
import { LINE_THICKNESS } from "./styling/lineThickness";
import { ZoomController } from "./interactions/zoomController";
import { BRACKET_PLOT_STYLES } from "../bracketPlotStyles";
import type { AggregatedResult } from "../../simulation/resultAggregator";
import { useAppStore } from "../../store/appStore";
import { convertLinearToLogSpace } from "./utils/coordinateUtils";

/**
 * CRITICAL FIXES FOR DUAL CANVAS MODE:
 * 
 * This hook includes two critical fixes to ensure proper dual canvas operation:
 * 
 * 1. EMPTY AXIS AREAS BUG PREVENTION:
 *    - When calculating full data bounds (no zoom), this hook calls setOriginalDataBounds()
 *      on the ZoomController with the full X-axis data range
 *    - ZoomController then constrains all pan operations (drag and scroll) to keep the 
 *      zoomed view within the original data bounds
 *    - This prevents users from panning into areas with no data points, which would
 *      show confusing empty axis tick marks
 * 
 * 2. CONSISTENT AXIS SCALING FIX:
 *    - Previously, Canvas 1 and Canvas 2 could end up with different axis scales 
 *      (e.g., Canvas 1: scaleX=200, Canvas 2: scaleX=1) due to timing issues
 *    - This occurred when calculateAndApplyScaling() was called at different times:
 *      - From canvas resize events (before lines enabled) → getAllDataBounds() fails → fallback path
 *      - From updatePlot() (after lines enabled) → getAllDataBounds() works → normal path
 *    - FIX: Always use consistent autoScale() approach instead of unreliable getAllDataBounds()
 *    - This ensures both canvases have identical scaleX values for the same X-axis data
 *    - Eliminates the need for complex NDC coordinate normalization in zoom synchronization
 * 
 * IMPORTANT: If you modify the scaling calculation logic, ensure that:
 * - Both canvases use the same code path (avoid getAllDataBounds() inconsistencies)
 * - setOriginalDataBounds() is still called with the correct full data range
 * - The hasEnabledLines guard prevents premature scaling calculations
 */

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

interface UsePlotCalculationsProps {
  plotLineRef: RefObject<UnifiedLinePlot | null>;
  glRef: RefObject<WebGL2RenderingContext | null>;
  crosshairRef: RefObject<WebglLinePlot | null>;
  snapCircleRef: RefObject<WebglPolygonPlot | null>;
  zoomLinesRef: RefObject<WebglLinePlot | null>;
  zoomRegionRef: RefObject<WebglPolygonPlot | null>;
  zoomController: RefObject<ZoomController>;
  lineDataRef: RefObject<ExtendedLineConfig[]>;
  colorMapRef: RefObject<Map<string, PlotColor>>;
  results: ResultType[];
  selectedVariables: string[];
  hoveredVariable: string | null;
  showCrosshair: boolean;
  crosshairSnapToLines: boolean;
  // Bracket operation props
  isBracketOperationPlot?: boolean;
  bracketOperationResults?: AggregatedResult;
  emphasizedPlotIndex?: number;
  // Axis rendering callback
  onAxisScalesChange?: (scales: AxisScales) => void;
  // Canvas identification for dual mode
  canvasId?: 1 | 2;
}

interface UsePlotCalculationsReturn {
  axisScales: AxisScales;
  calculateAndApplyScaling: () => void;
  updatePlot: () => void;
  updateHover: () => void;
  updateBracketEmphasis: () => void;
}

export const usePlotCalculations = ({
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
  isBracketOperationPlot = false,
  bracketOperationResults,
  emphasizedPlotIndex = 0,
  onAxisScalesChange,
  canvasId,
}: UsePlotCalculationsProps): UsePlotCalculationsReturn => {
  const isDarkMode = useAppStore((state) => state.isDarkMode);
  const isLogX = useAppStore((state) => state.isLogX);
  const isLogY = useAppStore((state) => {
    if (canvasId === 1) {
      return state.isLogY1;
    } else if (canvasId === 2) {
      return state.isLogY2;
    } else {
      return state.isLogY; // Single canvas mode
    }
  });
  const [axisScales, setAxisScales] = useState<AxisScales>({
    scaleX: 1,
    scaleY: 1,
    offsetX: 0,
    offsetY: 0,
  });


  // Debounced axis scale updates to prevent rapid re-renders
  const scaleUpdateTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Helper to update axis scales with comprehensive validation
  const updateAxisScales = useCallback((newScales: AxisScales) => {
    // VALIDATION: Check for uninitialized/invalid scale values
    if (newScales.scaleX === 0 || newScales.scaleY === 0 || !isFinite(newScales.scaleX) || !isFinite(newScales.scaleY)) {
      // Don't update axes with invalid scales - let the transition complete first
      return;
    }

    // If we're transitioning, store scales in ref and debounce the update
    if (isTransitioningRef.current) {
      pendingScalesRef.current = newScales;
      clearTimeout(scaleUpdateTimeoutRef.current);
      scaleUpdateTimeoutRef.current = setTimeout(() => {
        if (pendingScalesRef.current) {
          // CRITICAL: Re-validate scales before applying from timeout
          const scales = pendingScalesRef.current;

          // Use a more robust validation for near-zero values
          if (scales.scaleX === 0 || scales.scaleY === 0 || !isFinite(scales.scaleX) || !isFinite(scales.scaleY) ||
            Math.abs(scales.scaleX) < Number.EPSILON || Math.abs(scales.scaleY) < Number.EPSILON) {
            pendingScalesRef.current = null;
            return; // Don't apply invalid scales
          }

          setAxisScales(scales);
          onAxisScalesChange?.(scales);
          pendingScalesRef.current = null;
        }
      }, 16); // One frame delay (60fps)
    } else {
      // Normal immediate update when not transitioning
      setAxisScales(newScales);
      onAxisScalesChange?.(newScales);
    }
  }, [onAxisScalesChange]);

  // Forward declaration for the updatePlot function
  const updatePlotRef = useRef<(() => void) | null>(null);
  // Forward declaration for calculateAndApplyScaling function
  const calculateAndApplyScalingRef = useRef<(() => void) | null>(null);

  // Refs to track transition state and prevent cascading re-renders
  const isTransitioningRef = useRef(false);
  const pendingScalesRef = useRef<AxisScales | null>(null);

  // Batched axis transition handler using React.startTransition
  const handleAxisTransition = useCallback(() => {
    if (!plotLineRef.current || !glRef.current || isTransitioningRef.current) return;

    isTransitioningRef.current = true;

    // Batch all axis mode changes in a single React transition
    startTransition(() => {
      try {
        // 1. Apply log axis settings
        plotLineRef.current!.setLogAxis(isLogX, isLogY);

        // 2. Auto-scale for the new coordinate space
        plotLineRef.current!.autoScale();

        // 3. Reset zoom if transitioning to linear mode
        if (!isLogX && !isLogY && zoomController.current) {
          zoomController.current.resetZoom();
        }

        // 4. OPTIMIZED: Only recalculate axis scales, avoid full plot redraw
        // The log conversion happens internally in webgl-plot, so we only need
        // to get new data bounds and calculate new axis scales
        calculateAndApplyScalingRef.current?.();

        // 5. Single draw call to apply the log transformation visually
        plotLineRef.current!.draw();
      } finally {
        // Reset transition flag after all operations complete
        isTransitioningRef.current = false;
      }
    });
  }, [isLogX, isLogY]);

  // Handle log axis changes with batched updates to prevent re-render cascades
  useEffect(() => {
    if (!plotLineRef.current || !glRef.current) return;
    handleAxisTransition();
  }, [isLogX, isLogY, plotLineRef.current, handleAxisTransition]);

  // Handle data updates with simplified autoScale (now works correctly for all coordinate spaces)
  useEffect(() => {
    if (!plotLineRef.current || selectedVariables.length === 0) return;

    // Use autoScale for data updates in both linear and log space
    // autoScale() now works correctly for all coordinate spaces
    plotLineRef.current.autoScale();
  }, [selectedVariables, results]);

  // Calculate and apply scaling using webgl-plot's enhanced API with zoom support
  const calculateAndApplyScaling = useCallback(() => {
    if (!plotLineRef.current || selectedVariables.length === 0) {
      // Fallback to default transform if no visible lines
      plotLineRef.current?.setGlobalTransform([1, 1], [-1, -1]);
      updateAxisScales({ scaleX: 1, scaleY: 1, offsetX: -1, offsetY: -1 });
      return;
    }
    
    // CRITICAL FIX: Guard against premature scaling when no lines match selected variables
    // This prevents the inconsistent axis scaling issue between dual canvases
    const hasEnabledLines = lineDataRef.current?.some(line => {
      const extendedLine = line as ExtendedLineConfig;
      return extendedLine.variableName && selectedVariables.includes(extendedLine.variableName);
    });
    
    if (!hasEnabledLines) {
      return; // Skip scaling calculation until lines are properly selected
    }

    // Check if zoom is active to determine scaling approach
    const customXBounds = zoomController.current?.getZoomBounds();

    if (customXBounds) {
      // Zoom is active: maintain compatibility with existing zoom system
      // We still need manual bounds calculation for zoom integration
      const xMin = customXBounds.min;
      const xMax = customXBounds.max;
      let yMin = Infinity;
      let yMax = -Infinity;

      // Set original data bounds for zoom controller (empty axis areas bug prevention)
      if (!zoomController.current?.hasOriginalDataBounds()) {
        const allDataBounds = plotLineRef.current.getAllDataBounds();
        if (allDataBounds) {
          // CRITICAL FIX: Always use linear space bounds, regardless of log axis
          // The zoom controller will handle coordinate conversion internally
          zoomController.current?.setOriginalDataBounds(allDataBounds.minX, allDataBounds.maxX);
        }
      }

      // Calculate Y-axis bounds for visible lines within zoom range
      // IMPORTANT: Line data points are in linear space, but zoom bounds may be in log space
      // We need to handle coordinate space conversion properly

      // Convert zoom bounds to linear space for comparison with line data
      // Note: Using inverse conversion since we need log->linear here
      let xMinLinear = xMin;
      let xMaxLinear = xMax;
      if (isLogX) {
        xMinLinear = Math.pow(10, xMin);
        xMaxLinear = Math.pow(10, xMax);
      }

      lineDataRef.current?.forEach((lineData) => {
        const extendedLineData = lineData as ExtendedLineConfig;
        const variableName = extendedLineData.variableName;
        if (!variableName || !selectedVariables.includes(variableName)) return;

        const points = lineData.points;
        for (let i = 1; i < points.length; i += 2) {
          const x = points[i - 1];
          const y = points[i];
          if (x !== undefined && y !== undefined && x >= xMinLinear && x <= xMaxLinear) {
            // Convert Y to log space if needed for bounds calculation
            const yValue = convertLinearToLogSpace(y, isLogY);
            yMin = Math.min(yMin, yValue);
            yMax = Math.max(yMax, yValue);
          }
        }
      });

      if (isFinite(yMin) && isFinite(yMax)) {
        const yRange = yMax - yMin;
        const yPadding = yRange > 0 ? yRange * 0.05 : Math.abs(yMin) * 0.1 || 1;
        yMin -= yPadding;
        yMax += yPadding;

        const finalXRange = xMax - xMin;
        const finalYRange = yMax - yMin;

        // Ensure we never generate invalid scales - use meaningful fallbacks
        const scaleX = finalXRange > 0 && isFinite(finalXRange) ? 2 / finalXRange : 1;
        const scaleY = finalYRange > 0 && isFinite(finalYRange) ? 2 / finalYRange : 1;

        // Additional validation to prevent zero or invalid scales
        if (!isFinite(scaleX) || !isFinite(scaleY) || scaleX === 0 || scaleY === 0) {
          return; // Skip this calculation cycle
        }
        const offsetX = -1 - xMin * scaleX;
        const offsetY = -1 - yMin * scaleY;

        // Apply transform for zoom bounds in all coordinate spaces
        // The webgl-plot library handles log space transformations correctly
        plotLineRef.current.setGlobalTransform([scaleX, scaleY], [offsetX, offsetY]);

        const newAxisScales = { scaleX, scaleY, offsetX, offsetY };
        updateAxisScales(newAxisScales);
        zoomController.current?.updateAxisScales(newAxisScales);
        zoomController.current?.updateLogAxisState({ isLogX, isLogY });
      }
    } else {
      // ENHANCED FIX: Use consistent autoScale() approach for all canvases
      // This ensures identical axis scaling between dual canvases since they process the same X-axis data
      
      // Set original data bounds for zoom controller by calculating from line data
      if (zoomController.current && !zoomController.current.hasOriginalDataBounds() && lineDataRef.current) {
        // Calculate bounds manually from line data for consistency
        let dataMinX = Infinity;
        let dataMaxX = -Infinity;
        
        lineDataRef.current.forEach(line => {
          const extendedLine = line as ExtendedLineConfig;
          if (extendedLine.variableName && selectedVariables.includes(extendedLine.variableName)) {
            const points = line.points;
            for (let i = 0; i < points.length; i += 2) {
              const x = points[i];
              if (x !== undefined && isFinite(x)) {
                dataMinX = Math.min(dataMinX, x);
                dataMaxX = Math.max(dataMaxX, x);
              }
            }
          }
        });
        
        if (isFinite(dataMinX) && isFinite(dataMaxX)) {
          zoomController.current.setOriginalDataBounds(dataMinX, dataMaxX);
        }
      }
      
      // Use autoScale() directly for consistent behavior across all canvases
      plotLineRef.current.autoScale();
      
      // Extract axis scales after autoScale
      const globalScale = plotLineRef.current.getGlobalScale();
      const globalOffset = plotLineRef.current.getGlobalOffset();
      
      const scaleX = globalScale[0];
      const scaleY = globalScale[1];
      const offsetX = globalOffset[0];
      const offsetY = globalOffset[1];
      
      if (isFinite(scaleX) && isFinite(scaleY) && isFinite(offsetX) && isFinite(offsetY) &&
        scaleX !== 0 && scaleY !== 0) {
        
        const newAxisScales = { scaleX, scaleY, offsetX, offsetY };
        updateAxisScales(newAxisScales);
        zoomController.current?.updateAxisScales(newAxisScales);
        zoomController.current?.updateLogAxisState({ isLogX, isLogY });
        
      } else {
        // Fallback to default transform if autoScale fails
        plotLineRef.current.setLogAxis(false, false);
        plotLineRef.current.setGlobalTransform([1, 1], [-1, -1]);
        updateAxisScales({ scaleX: 1, scaleY: 1, offsetX: -1, offsetY: -1 });
      }
    }
  }, [selectedVariables, isLogX, isLogY, updateAxisScales]);

  // Update plot visibility and colors
  const updatePlot = useCallback(() => {
    if (!glRef.current || !plotLineRef.current || results.length === 0)
      return;

    clearCanvas(glRef.current);

    if (selectedVariables.length === 0) {
      return;
    }

    // Update line visibility based on selected variables
    lineDataRef.current?.forEach((lineData, index) => {
      // Use metadata from lineData instead of assuming index mapping
      const extendedLineData = lineData as ExtendedLineConfig;
      const variableName = extendedLineData.variableName;

      // Skip processing if variableName is undefined
      if (!variableName) {
        // Ensure line is disabled if variable name is undefined
        plotLineRef.current!.setLineEnabled(index, false);
        return; // Skip this iteration
      }

      const isSelected = selectedVariables.includes(variableName);
      const isHovered = hoveredVariable === variableName;

      // Regenerate color for current theme if not cached
      let currentColor = generatePlotColor(
        variableName,
        isDarkMode,
        colorMapRef.current!
      );

      // Handle bracket operation emphasis
      let thickness: number;
      if (isBracketOperationPlot && extendedLineData.isBracketLine && bracketOperationResults) {
        // For bracket operations, determine if this line should be emphasized
        const parameterIndex = bracketOperationResults.parameterValues?.findIndex(
          (paramValue) => paramValue === extendedLineData.parameterValue
        ) ?? -1;

        const isEmphasized = parameterIndex === emphasizedPlotIndex;

        // Apply emphasis styling
        thickness = isEmphasized
          ? BRACKET_PLOT_STYLES.EMPHASIZED_LINE_THICKNESS
          : BRACKET_PLOT_STYLES.NORMAL_LINE_THICKNESS;

        // Apply transparency to color
        const alpha = isEmphasized
          ? BRACKET_PLOT_STYLES.EMPHASIZED_TRANSPARENCY
          : BRACKET_PLOT_STYLES.NORMAL_TRANSPARENCY;
        currentColor = [currentColor[0], currentColor[1], currentColor[2], alpha];
      } else {
        // Regular plot behavior
        thickness = isSelected && isHovered ? LINE_THICKNESS.HOVERED : LINE_THICKNESS.NORMAL;
      }

      // Update line properties using the new API methods
      plotLineRef.current!.updateLineColor(index, currentColor);

      // Explicitly set line enabled/disabled state - this is critical for proper line visibility
      plotLineRef.current!.setLineEnabled(index, isSelected);

      plotLineRef.current!.updateLineThickness(index, thickness);

      // Update local cache for consistency
      lineData.color = [...currentColor];
      lineData.enabled = isSelected;
      lineData.thickness = thickness;
    });

    // Calculate and apply auto-scaling for visible lines in both linear and log modes
    // Use fresh state to avoid stale closure issues
    calculateAndApplyScaling();

    plotLineRef.current.draw();

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




    plotLineRef.current.draw();

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
  }, [
    glRef,
    plotLineRef,
    results,
    selectedVariables,
    lineDataRef,
    colorMapRef,
    isDarkMode,
    isBracketOperationPlot,
    bracketOperationResults,
    emphasizedPlotIndex,
    showCrosshair,
    crosshairRef,
    snapCircleRef,
    crosshairSnapToLines,
    zoomController,
    zoomLinesRef,
    zoomRegionRef,
    calculateAndApplyScaling
  ]);

  // Set the updatePlot ref so it can be called from the log axis useEffect
  useEffect(() => {
    updatePlotRef.current = updatePlot;
    calculateAndApplyScalingRef.current = calculateAndApplyScaling;
  }, [updatePlot, calculateAndApplyScaling]);

  // Cleanup timeout on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (scaleUpdateTimeoutRef.current) {
        clearTimeout(scaleUpdateTimeoutRef.current);
      }
    };
  }, []);

  // Optimized hover update - only updates line thickness without full redraw
  const updateHover = useCallback(() => {
    if (!plotLineRef.current || !lineDataRef.current) return;

    // Only update thickness for lines that need it
    lineDataRef.current.forEach((lineData, index) => {
      const extendedLineData = lineData as ExtendedLineConfig;
      const variableName = extendedLineData.variableName;
      
      if (!variableName) return;

      const isSelected = selectedVariables.includes(variableName);
      const isHovered = hoveredVariable === variableName;

      // Only update thickness if this is a regular plot (not bracket operation)
      if (!isBracketOperationPlot) {
        const thickness = isSelected && isHovered ? LINE_THICKNESS.HOVERED : LINE_THICKNESS.NORMAL;
        plotLineRef.current!.updateLineThickness(index, thickness);
        lineData.thickness = thickness;
      }
    });

    // Single draw call to update the visual changes
    plotLineRef.current.draw();

    // Redraw crosshair and other overlays if visible
    if (showCrosshair && crosshairRef.current) {
      crosshairRef.current.draw();
    }

    if (showCrosshair && crosshairSnapToLines && snapCircleRef.current) {
      snapCircleRef.current.draw();
    }

    if (zoomController.current?.getIsZooming() && zoomLinesRef.current && zoomRegionRef.current) {
      zoomLinesRef.current.draw();
      zoomRegionRef.current.draw();
    }
  }, [
    plotLineRef,
    lineDataRef,
    selectedVariables,
    hoveredVariable,
    isBracketOperationPlot,
    showCrosshair,
    crosshairRef,
    snapCircleRef,
    crosshairSnapToLines,
    zoomController,
    zoomLinesRef,
    zoomRegionRef
  ]);

  // Optimized bracket emphasis update - only updates line thickness and color without full redraw
  const updateBracketEmphasis = useCallback(() => {
    if (!plotLineRef.current || !lineDataRef.current || !isBracketOperationPlot || !bracketOperationResults) return;

    // Only update emphasis for bracket operation lines
    lineDataRef.current.forEach((lineData, index) => {
      const extendedLineData = lineData as ExtendedLineConfig;
      const variableName = extendedLineData.variableName;
      
      if (!variableName || !extendedLineData.isBracketLine) return;

      const isSelected = selectedVariables.includes(variableName);
      if (!isSelected) return; // Skip non-selected lines

      // Determine if this line should be emphasized
      const parameterIndex = bracketOperationResults.parameterValues?.findIndex(
        (paramValue) => paramValue === extendedLineData.parameterValue
      ) ?? -1;

      const isEmphasized = parameterIndex === emphasizedPlotIndex;

      // Apply emphasis styling - thickness and color
      const thickness = isEmphasized
        ? BRACKET_PLOT_STYLES.EMPHASIZED_LINE_THICKNESS
        : BRACKET_PLOT_STYLES.NORMAL_LINE_THICKNESS;

      // Apply transparency to existing color
      const currentColor = lineData.color || [1, 1, 1, 1]; // Fallback to white
      const alpha = isEmphasized
        ? BRACKET_PLOT_STYLES.EMPHASIZED_TRANSPARENCY
        : BRACKET_PLOT_STYLES.NORMAL_TRANSPARENCY;
      const updatedColor: [number, number, number, number] = [currentColor[0], currentColor[1], currentColor[2], alpha];

      // Update line properties using webgl-plot API
      plotLineRef.current!.updateLineThickness(index, thickness);
      plotLineRef.current!.updateLineColor(index, updatedColor);

      // Update local cache for consistency
      lineData.thickness = thickness;
      lineData.color = updatedColor;
    });

    // Single draw call to update the visual changes
    plotLineRef.current.draw();

    // Redraw crosshair and other overlays if visible
    if (showCrosshair && crosshairRef.current) {
      crosshairRef.current.draw();
    }

    if (showCrosshair && crosshairSnapToLines && snapCircleRef.current) {
      snapCircleRef.current.draw();
    }

    if (zoomController.current?.getIsZooming() && zoomLinesRef.current && zoomRegionRef.current) {
      zoomLinesRef.current.draw();
      zoomRegionRef.current.draw();
    }
  }, [
    plotLineRef,
    lineDataRef,
    selectedVariables,
    isBracketOperationPlot,
    bracketOperationResults,
    emphasizedPlotIndex,
    showCrosshair,
    crosshairRef,
    snapCircleRef,
    crosshairSnapToLines,
    zoomController,
    zoomLinesRef,
    zoomRegionRef
  ]);

  return {
    axisScales,
    calculateAndApplyScaling,
    updatePlot,
    updateHover,
    updateBracketEmphasis,
  };
};