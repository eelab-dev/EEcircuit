import { useState, RefObject } from "react";
import { ResultType } from "eecircuit-engine";
import { LineConfig, WebglLineThick, WebglLinePlot, WebglPolygonPlot, WebglPlot } from "webgl-plot";
import { generatePlotColor, type PlotColor } from "./styling/colorUtils";
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
  plotLineRef: RefObject<WebglLineThick | null>;
  wglpRef: RefObject<WebglPlot | null>;
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
  isBracketOperationPlot = false,
  bracketOperationResults,
  emphasizedPlotIndex = 0,
}: UsePlotCalculationsProps): UsePlotCalculationsReturn => {
  const isDarkMode = useAppStore((state) => state.isDarkMode);
  const [axisScales, setAxisScales] = useState<AxisScales>({
    scaleX: 1,
    scaleY: 1,
    offsetX: 0,
    offsetY: 0,
  });

  // Calculate and apply auto-scaling transform for visible lines
  const calculateAndApplyScaling = () => {
    if (!plotLineRef.current || selectedVariables.length === 0) {
      // Fallback to default transform if no visible lines
      console.log("Using fallback transform");
      plotLineRef.current?.setGlobalTransform([1, 1], [-1, -1]);
      setAxisScales({ scaleX: 1, scaleY: 1, offsetX: -1, offsetY: -1 });
      return;
    }

    let xMin = Infinity,
      xMax = -Infinity;
    let yMin = Infinity,
      yMax = -Infinity;

    // Calculate X-axis bounds once (same for all lines)
    // Use custom bounds if zoom is active, otherwise calculate from data
    // Use bounds WITH pan offset for axis scaling calculation so axis matches visible area
    const customXBounds = zoomController.current?.getZoomBounds();
    if (customXBounds) {
      xMin = customXBounds.min;
      xMax = customXBounds.max;
    } else {
      const firstVisibleLineIndex = lineDataRef.current?.findIndex(
        (lineData) => {
          // Use variableName from line metadata instead of array index
          // This is crucial for bracket operations where there are multiple lines per variable
          const extendedLineData = lineData as ExtendedLineConfig;
          const variableName = extendedLineData.variableName;
          // Add bounds check before checking selectedVariables
          return variableName && selectedVariables.includes(variableName);
        }
      );

      if (firstVisibleLineIndex !== -1 && lineDataRef.current) {
        const firstVisibleLine = lineDataRef.current[firstVisibleLineIndex];
        if (firstVisibleLine) {
          const points = firstVisibleLine.points;
          for (let i = 0; i < points.length; i += 2) {
            const x = points[i];
            if (x !== undefined) {
              xMin = Math.min(xMin, x);
              xMax = Math.max(xMax, x);
            }
          }
          
          // CRITICAL: Set original data bounds in zoom controller to prevent empty axis areas bug
          // This constrains panning to stay within the original data range, preventing users
          // from panning into areas with no data points (which would show empty axis tick marks)
          // Only set once when bounds are first calculated (not on every scaling update)
          if (isFinite(xMin) && isFinite(xMax) && zoomController.current && !zoomController.current.hasOriginalDataBounds()) {
            zoomController.current.setOriginalDataBounds(xMin, xMax);
          }
        }
      }
    }

    // Calculate Y-axis bounds for all visible lines
    // If zoom is active, only consider Y values within the VISIBLE X range (current view)
    lineDataRef.current?.forEach((lineData) => {
      // Use variableName from line metadata instead of array index
      // This is crucial for bracket operations where there are multiple lines per variable
      const extendedLineData = lineData as ExtendedLineConfig;
      const variableName = extendedLineData.variableName;

      // Add bounds check before checking selectedVariables
      if (!variableName) {
        return; // Skip this iteration
      }

      const isSelected = selectedVariables.includes(variableName);

      if (isSelected) {
        const points = lineData.points;
        for (let i = 1; i < points.length; i += 2) {
          const x = points[i - 1]; // X coordinate
          const y = points[i]; // Y coordinate

          if (x === undefined || y === undefined) continue;

          // If zoom is active, only include Y values within the CURRENT visible X bounds
          // Use xMin/xMax which already include pan offset for the visible range
          if (customXBounds) {
            if (x >= xMin && x <= xMax) {
              yMin = Math.min(yMin, y);
              yMax = Math.max(yMax, y);
            }
          } else {
            yMin = Math.min(yMin, y);
            yMax = Math.max(yMax, y);
          }
        }
      }
    });


    // Apply auto-scaling if we have valid bounds
    if (isFinite(xMin) && isFinite(xMax) && isFinite(yMin) && isFinite(yMax)) {

      const xRange = xMax - xMin;
      const yRange = yMax - yMin;

      // Add padding to avoid edge cases and ensure constant values are visible
      // For constant values (zero range), use minimum padding to create visual separation
      const yPadding = yRange > 0 ? yRange * 0.05 : Math.abs(yMin) * 0.1 || 1;
      
      if (!customXBounds) {
        // Normal view: add padding to both X and Y
        const xPadding = xRange > 0 ? xRange * 0.05 : Math.abs(xMin) * 0.1 || 1;
        xMin -= xPadding;
        xMax += xPadding;
      }
      // For zoomed view: NO X padding (respect exact zoom bounds)
      
      // Always add Y padding
      yMin -= yPadding;
      yMax += yPadding;

      const finalXRange = xMax - xMin;
      const finalYRange = yMax - yMin;

      // Calculate scale to fit data to [-1, 1] range
      // Let the plot fill the entire canvas without aspect ratio constraints
      const scaleX = finalXRange > 0 ? 2 / finalXRange : 1;
      const scaleY = finalYRange > 0 ? 2 / finalYRange : 1;

      // Offset: where to position the center of the data
      // Transform from data space to [-1, 1] space
      const offsetX = -1 - xMin * scaleX;
      const offsetY = -1 - yMin * scaleY;
      
      // No need to apply pan offset here since we're already using bounds with pan offset

      plotLineRef.current.setGlobalTransform(
        [scaleX, scaleY],
        [offsetX, offsetY]
      );

      // Update axis scales for synchronization
      const newAxisScales = { scaleX, scaleY, offsetX, offsetY };
      setAxisScales(newAxisScales);

      // Update zoom controller with new axis scales for coordinate conversion
      zoomController.current?.updateAxisScales(newAxisScales);
    } else {
      // Fallback to default transform if no valid data
      plotLineRef.current.setGlobalTransform([1, 1], [-1, -1]);
      setAxisScales({ scaleX: 1, scaleY: 1, offsetX: -1, offsetY: -1 });
    }
  };

  // Update plot visibility and colors
  const updatePlot = () => {
    if (!wglpRef.current || !plotLineRef.current || results.length === 0)
      return;

    wglpRef.current.clear();

    if (selectedVariables.length === 0) {
      wglpRef.current.update();
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
        thickness = isSelected && isHovered ? 10 : 5;
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

    // Calculate and apply auto-scaling for visible lines
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
  };

  return {
    axisScales,
    calculateAndApplyScaling,
    updatePlot,
  };
};