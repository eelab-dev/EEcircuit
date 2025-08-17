import { useState, useEffect, useRef, RefObject } from "react";
import { ResultType } from "eecircuit-engine";
import { LineConfig, UnifiedLinePlot, WebglLinePlot, WebglPolygonPlot, clearCanvas } from "webgl-plot";
import { generatePlotColor, type PlotColor } from "./styling/colorUtils";
import { LINE_THICKNESS } from "./styling/lineThickness";
import { ZoomController } from "./interactions/zoomController";
import { BRACKET_PLOT_STYLES } from "../bracketPlotStyles";
import type { AggregatedResult } from "../../simulation/resultAggregator";
import { useAppStore } from "../../store/appStore";

/**
 * EMPTY AXIS AREAS BUG PREVENTION:
 * 
 * This hook includes critical code to prevent the "empty axis areas" bug that occurs
 * when users pan outside the original data bounds after zooming in.
 * 
 * The prevention mechanism:
 * 1. When calculating full data bounds (no zoom), this hook calls setOriginalDataBounds()
 *    on the ZoomController with the full X-axis data range
 * 2. ZoomController then constrains all pan operations (drag and scroll) to keep the 
 *    zoomed view within the original data bounds
 * 3. This prevents users from panning into areas with no data points, which would
 *    show confusing empty axis tick marks
 * 
 * IMPORTANT: If you modify the data bounds calculation logic, ensure that
 * setOriginalDataBounds() is still called with the correct full data range.
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
}

interface UsePlotCalculationsReturn {
  axisScales: AxisScales;
  calculateAndApplyScaling: () => void;
  updatePlot: () => void;
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
}: UsePlotCalculationsProps): UsePlotCalculationsReturn => {
  const isDarkMode = useAppStore((state) => state.isDarkMode);
  const isLogX = useAppStore((state) => state.isLogX);
  const isLogY = useAppStore((state) => state.isLogY);
  const [axisScales, setAxisScales] = useState<AxisScales>({
    scaleX: 1,
    scaleY: 1,
    offsetX: 0,
    offsetY: 0,
  });

  // Forward declaration for the updatePlot function
  const updatePlotRef = useRef<(() => void) | null>(null);

  // Handle log axis changes with enhanced coordinate-space aware API and view preservation
  // Also re-apply log axis state when plotLineRef changes (canvas mode switching)
  useEffect(() => {
    if (!plotLineRef.current || !glRef.current) return;

    
    if (isLogX || isLogY) {
      // Option A: Simple Auto-Scaling (now fixed in webgl-plot)
      // autoScale() now works correctly with coordinate-space awareness
      plotLineRef.current.setLogAxis(isLogX, isLogY);
      plotLineRef.current.autoScale(); // ✅ Now works correctly!
    } else {
      // Apply linear axis settings and auto-scale
      plotLineRef.current.setLogAxis(false, false);
      plotLineRef.current.autoScale();
    }
    
    // Update the plot after log axis changes to ensure proper line visibility and colors
    if (updatePlotRef.current) {
      updatePlotRef.current();
    }
  }, [isLogX, isLogY, plotLineRef.current]);

  // Handle data updates with simplified autoScale (now works correctly for all coordinate spaces)
  useEffect(() => {
    if (!plotLineRef.current || selectedVariables.length === 0) return;
    
    // Use autoScale for data updates in both linear and log space
    // autoScale() now works correctly for all coordinate spaces
    plotLineRef.current.autoScale();
  }, [selectedVariables, results]);

  // Calculate and apply scaling using webgl-plot's enhanced API with zoom support
  const calculateAndApplyScaling = () => {
    if (!plotLineRef.current || selectedVariables.length === 0) {
      // Fallback to default transform if no visible lines
      console.log("Using fallback transform");
      plotLineRef.current?.setGlobalTransform([1, 1], [-1, -1]);
      setAxisScales({ scaleX: 1, scaleY: 1, offsetX: -1, offsetY: -1 });
      return;
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
          zoomController.current?.setOriginalDataBounds(allDataBounds.minX, allDataBounds.maxX);
        }
      }

      // Calculate Y-axis bounds for visible lines within zoom range
      // IMPORTANT: Line data points are in linear space, but zoom bounds may be in log space
      // We need to handle coordinate space conversion properly
      
      // Convert zoom bounds to linear space for comparison with line data
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
            let yValue = y;
            if (isLogY && y > 0) {
              yValue = Math.log10(y);
            }
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
        const scaleX = finalXRange > 0 ? 2 / finalXRange : 1;
        const scaleY = finalYRange > 0 ? 2 / finalYRange : 1;
        const offsetX = -1 - xMin * scaleX;
        const offsetY = -1 - yMin * scaleY;

        // Apply transform for zoom bounds in all coordinate spaces
        // The webgl-plot library handles log space transformations correctly
        plotLineRef.current.setGlobalTransform([scaleX, scaleY], [offsetX, offsetY]);
        
        const newAxisScales = { scaleX, scaleY, offsetX, offsetY };
        setAxisScales(newAxisScales);
        zoomController.current?.updateAxisScales(newAxisScales);
        zoomController.current?.updateLogAxisState({ isLogX, isLogY });
      }
    } else {
      // No zoom: use autoScale() which now works correctly for all coordinate spaces
      const allDataBounds = plotLineRef.current.getAllDataBounds();
      
      if (allDataBounds) {
        // Set original data bounds for zoom controller (empty axis areas bug prevention)
        if (zoomController.current && !zoomController.current.hasOriginalDataBounds()) {
          zoomController.current.setOriginalDataBounds(allDataBounds.minX, allDataBounds.maxX);
        }

        // Use autoScale() for both linear and log axes (now works correctly)
        plotLineRef.current.autoScale();

        // Extract axis scales for external components (axes, zoom controller)
        const globalScale = plotLineRef.current.getGlobalScale();
        const globalOffset = plotLineRef.current.getGlobalOffset();
        const newAxisScales = {
          scaleX: globalScale[0],
          scaleY: globalScale[1],
          offsetX: globalOffset[0],
          offsetY: globalOffset[1],
        };
        setAxisScales(newAxisScales);
        zoomController.current?.updateAxisScales(newAxisScales);
        zoomController.current?.updateLogAxisState({ isLogX, isLogY });
      } else {
        // Fallback to default transform if no valid data
        plotLineRef.current.setLogAxis(false, false);
        plotLineRef.current.setGlobalTransform([1, 1], [-1, -1]);
        setAxisScales({ scaleX: 1, scaleY: 1, offsetX: -1, offsetY: -1 });
      }
    }
  };

  // Update plot visibility and colors
  const updatePlot = () => {
    if (!glRef.current || !plotLineRef.current || results.length === 0)
      return;

    clearCanvas(glRef.current);

    if (selectedVariables.length === 0) {
      // No need to call update() with new API - just clear and return
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
  };

  // Set the updatePlot ref so it can be called from the log axis useEffect
  useEffect(() => {
    updatePlotRef.current = updatePlot;
  }, [updatePlot]);

  return {
    axisScales,
    calculateAndApplyScaling,
    updatePlot,
  };
};