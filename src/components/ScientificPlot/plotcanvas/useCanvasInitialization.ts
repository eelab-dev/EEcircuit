import { useCallback, useEffect, useRef, useState } from "react";
import { ResultType } from "eecircuit-engine";
import {
  DebugLogger,
  LineConfig,
  UnifiedLinePlot,
  WebglLinePlot,
  WebglPolygonPlot,
  setupCanvasAndWebGL,
  clearCanvas,
} from "webgl-plot";
import { generatePlotColor, type PlotColor } from "./styling/colorUtils";
import { LINE_THICKNESS } from "./styling/lineThickness";
import { ZoomController } from "./interactions/zoomController";
import type { AggregatedResult } from "../../../simulation/resultAggregator";
const TRANSPARENT_CLEAR_COLOR: [number, number, number, number] = [0, 0, 0, 0];

const SNAP_CIRCLE_COLORS: Record<"light" | "dark", [number, number, number, number]> = {
  light: [154 / 255, 107 / 255, 0, 0.85], // Darker amber for light backgrounds
  dark: [1, 0.9, 0.1, 0.85], // Bright yellow for dark backgrounds
};

const getSnapCircleStrokeColor = (
  darkMode: boolean
): [number, number, number, number] =>
  darkMode ? SNAP_CIRCLE_COLORS.dark : SNAP_CIRCLE_COLORS.light;

// Extended LineConfig with metadata for variable tracking
type ExtendedLineConfig = LineConfig & {
  variableName?: string;
  parameterValue?: string;
  isBracketLine?: boolean;
};



interface UseCanvasInitializationProps {
  results: ResultType[];
  isDarkMode: boolean;
}

export const useCanvasInitialization = ({
  results,
  isDarkMode,
}: UseCanvasInitializationProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const glRef = useRef<WebGL2RenderingContext | null>(null);
  const plotLineRef = useRef<UnifiedLinePlot | null>(null);
  const crosshairRef = useRef<WebglLinePlot | null>(null);
  const snapCircleRef = useRef<WebglPolygonPlot | null>(null);
  const zoomController = useRef<ZoomController>(new ZoomController());
  const zoomLinesRef = useRef<WebglLinePlot | null>(null);
  const zoomRegionRef = useRef<WebglPolygonPlot | null>(null);
  const lineDataRef = useRef<ExtendedLineConfig[]>([]);
  const colorMapRef = useRef<Map<string, PlotColor>>(new Map());
  const [isCanvasInitialized, setIsCanvasInitialized] = useState(false);

  // Create the snap circle (fixed size, aspect ratio handled by transform scaling)
  const initSnapCircle = useCallback((darkMode: boolean) => {
    if (!snapCircleRef.current || !glRef.current) return;

    // Create circle with fixed radius in NDC space
    const baseRadius = 0.04; // Base radius in NDC coordinates
    const strokeColor = getSnapCircleStrokeColor(darkMode);

    const snapCircle = WebglPolygonPlot.createCircle({
      center: [0, 0], // Will be updated when crosshair moves
      radius: baseRadius,
      segments: 20,
      fillColor: [0, 0, 0, 0], // Transparent fill (hollow)
      strokeColor,
      strokeWeight: LINE_THICKNESS.SNAP_CIRCLE_STROKE, // Thicker border for better visibility
      isFilled: false, // No fill - hollow
      isStroked: true, // Only stroke border
      enabled: false, // Initially disabled, enabled only in snap mode
    });

    snapCircleRef.current.initPolygons([snapCircle]);
  }, []);

  const createSnapCircle = () => {
    initSnapCircle(isDarkMode);
  };

  // Initialize canvas and WebGL plot only once when results change
  useEffect(() => {
    if (!canvasRef.current || results.length === 0) return;

    let cancelled = false;
    const canvas = canvasRef.current;
    const themeIsDarkMode = isDarkMode;

    // Use requestAnimationFrame to defer initialization until after layout
    const rafId = requestAnimationFrame(() => {
      if (!canvasRef.current || results.length === 0 || cancelled) return;

      const devicePixelRatio = window.devicePixelRatio || 1;

      // Get the computed style dimensions after layout is complete
      const rect = canvas.getBoundingClientRect();
      const width = rect.width || 500;
      const height = rect.height || 500;

      canvas.width = width * devicePixelRatio;
      canvas.height = height * devicePixelRatio;

      // Initialize WebGL2 context with transparent background so CSS handles theme colors
      // Keeping the buffer transparent prevents the old “stuck dark” plot background when
      // the browser enters the app already in light mode. Chakra sets the canvas bg via CSS,
      // and WebGL only contributes the plot lines. preserveDrawing avoids flicker between frames.
      glRef.current = setupCanvasAndWebGL(canvas, {
        backgroundColor: TRANSPARENT_CLEAR_COLOR,
        antialias: true,
        powerPerformance: "high-performance",
        transparent: true,
        preserveDrawing: true,
      });

      // Ensure the canvas is cleared immediately with a transparent background
      clearCanvas(glRef.current, TRANSPARENT_CLEAR_COLOR);

      // Initialize crosshair (thin lines) - start with no lines, useCrosshair hook will manage them
      crosshairRef.current = new WebglLinePlot(glRef.current, 2);

      // Initialize with empty lines array - useCrosshair hook will add/remove lines as needed
      crosshairRef.current.initLines([]);

      // Initialize snap circle (polygon plot)
      snapCircleRef.current = new WebglPolygonPlot(glRef.current);

      // Create the initial circle
      initSnapCircle(themeIsDarkMode);

      // Initialize zoom components
      zoomLinesRef.current = new WebglLinePlot(glRef.current, 2);
      zoomRegionRef.current = new WebglPolygonPlot(glRef.current);

      // Create zoom lines data (2 vertical lines for zoom selection)
      const zoomLines: LineConfig[] = [
        {
          points: new Float32Array([0, -1, 0, 1]), // First vertical line
          color: [1, 0.9, 0.1, 0.9], // Yellow with high opacity
          thickness: LINE_THICKNESS.ZOOM_LINES,
          enabled: false, // Initially disabled
        },
        {
          points: new Float32Array([0, -1, 0, 1]), // Second vertical line
          color: [1, 0.9, 0.1, 0.9], // Yellow with high opacity
          thickness: LINE_THICKNESS.ZOOM_LINES,
          enabled: false, // Initially disabled
        },
      ];

      zoomLinesRef.current.initLines(zoomLines);

      // Create zoom region polygon (initially empty rectangle using 6 points for two triangles)
      // Color will be updated based on theme via zoomController.updateZoomColors()
      const zoomRegion = {
        fillColor: [1, 1, 0, 0.3] as [number, number, number, number], // Default yellow (will be updated by theme)
        strokeColor: [1, 1, 0, 0] as [number, number, number, number], // No stroke
        strokeWeight: 0,
        isFilled: true,
        isStroked: false,
        // Initialize with 6 points (two triangles) - same format as updates
        points: new Float32Array([0, -1, 0, 1, 0, 1, 0, -1, 0, 1, 0, -1]), // Empty rectangle initially
        enabled: false, // Initially disabled
      };

      zoomRegionRef.current.initPolygons([zoomRegion]);

      // Initialize zoom controller with the WebGL components
      if (canvasRef.current && zoomLinesRef.current && zoomRegionRef.current) {
        zoomController.current.initialize(
          zoomLinesRef.current,
          zoomRegionRef.current,
          canvasRef.current,
          themeIsDarkMode,
          plotLineRef.current
        );
      }

      const firstResult = results[0];
      if (!firstResult) {
        console.error("No results available for canvas initialization");
        return;
      }

      const numX = firstResult.numPoints;
      const numVariables = firstResult.numVariables;

      // Calculate the number of lines needed
      const typedFirstResult = firstResult as AggregatedResult;
      const isBracketResult =
        "bracketPlotData" in typedFirstResult &&
        typedFirstResult.bracketPlotData;

      let totalLines: number;
      if (isBracketResult && typedFirstResult.bracketPlotData) {
        // For bracket operations: number of variables (excluding X) × number of parameter sweeps
        const numParameterSweeps = typedFirstResult.bracketPlotData.length;
        totalLines = (numVariables - 1) * numParameterSweeps;
      } else {
        // For normal simulations: number of variables excluding X-axis
        totalLines = numVariables - 1;
      }

      DebugLogger.setDebugMode(false);


      // Create plot line with the correct number of lines using UnifiedLinePlot
      plotLineRef.current = new UnifiedLinePlot(
        glRef.current,
        totalLines
      );

      // Prepare line data for all variables (excluding X-axis at index 0)
      const allLineData: LineConfig[] = [];

      if (isBracketResult && typedFirstResult.bracketPlotData) {
        // Handle bracket operation: create separate lines for each parameter sweep
        const bracketData = typedFirstResult.bracketPlotData;

        for (let lineIndex = 1; lineIndex < numVariables; lineIndex++) {
          const variableName = firstResult.variableNames[lineIndex];
          if (!variableName) continue;

          // Get the base color for this variable
            const baseColor = generatePlotColor(
              variableName,
              themeIsDarkMode,
              colorMapRef.current
            );

          // Create a separate line for each parameter sweep
          for (
            let paramIndex = 0;
            paramIndex < bracketData.length;
            paramIndex++
          ) {
            const paramData = bracketData[paramIndex];
            if (!paramData) continue;

            const numPoints = paramData.data[0]?.values?.length || 0;

            if (numPoints === 0) {
              console.warn(
                `Skipping parameter ${paramData.parameterValue}: no data points`
              );
              continue;
            }

            // Verify Y-axis data exists for this variable
            if (
              !paramData.data[lineIndex] ||
              !paramData.data[lineIndex]?.values
            ) {
              console.warn(
                `Skipping parameter ${paramData.parameterValue} for variable ${variableName}: missing Y data`
              );
              continue;
            }

            const yDataLength = paramData.data[lineIndex]?.values?.length || 0;
            if (yDataLength !== numPoints) {
              console.warn(
                `Data length mismatch for ${variableName}, param ${paramData.parameterValue}: X=${numPoints}, Y=${yDataLength}`
              );
            }

            const array = new Float32Array(numPoints * 2);

            // Fill array with x,y data for this parameter sweep
            for (let i = 0; i < numPoints; i++) {
              const xVal = paramData.data[0]?.values?.[i] as number; // X-axis data (frequency/time)
              const yVal = paramData.data[lineIndex]?.values?.[i] as number; // Y-axis data (mag/phase)

              array[i * 2] = xVal;
              array[i * 2 + 1] = yVal;
            } allLineData.push({
              points: new Float32Array(array),
              color: baseColor, // Use same color for all parameter sweeps of this variable
              thickness: LINE_THICKNESS.NORMAL,
              scale: [1, 1],
              offset: [0, 0],
              enabled: true,
              // Add metadata to track which variable this line belongs to
              variableName: variableName,
              parameterValue: paramData.parameterValue,
              isBracketLine: true,
            } as ExtendedLineConfig);
          }
        }
      } else {
        // Handle normal (non-bracket) results
        const array = new Float32Array(numX * 2);

        for (let lineIndex = 1; lineIndex < numVariables; lineIndex++) {
          const variableName = firstResult.variableNames[lineIndex];

          // Add bounds check for variableName
          if (!variableName) {
            console.warn(`Skipping lineIndex ${lineIndex} - no variable name`);
            continue; // Skip this line
          }

          // Check if data exists at this index
          if (
            !firstResult.data[lineIndex] ||
            !firstResult.data[lineIndex]?.values
          ) {
            console.warn(
              `Skipping ${variableName} at lineIndex ${lineIndex} - no data`
            );
            continue;
          }

          // Fill array with x,y data
          for (let i = 0; i < numX; i++) {
            const xVal = firstResult.data[0]?.values?.[i] as number; // X-axis data (frequency)
            const yVal = firstResult.data[lineIndex]?.values?.[i] as number; // Y-axis data (mag/phase)

            array[i * 2] = xVal;
            array[i * 2 + 1] = yVal;
          }

          allLineData.push({
            points: new Float32Array(array),
            color: generatePlotColor(
              variableName,
              themeIsDarkMode,
              colorMapRef.current
            ),
            thickness: LINE_THICKNESS.NORMAL,
            scale: [1, 1],
            offset: [0, 0],
            enabled: true,
            // Add metadata for normal lines too
            variableName: variableName,
            isBracketLine: false,
          } as ExtendedLineConfig);
        }
      }

      lineDataRef.current = allLineData;
      plotLineRef.current.initLines(allLineData);
      plotLineRef.current.setGlobalTransform([1, 1], [-1, -1]);

      if (!cancelled) {
        setIsCanvasInitialized(true);
      }

      // Don't call updatePlot here - let the parent component handle it
      // after variables are properly selected
      // updatePlot();
    });

    // Cleanup function to cancel the animation frame if component unmounts
    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      setIsCanvasInitialized(false);
    };
  }, [results, initSnapCircle]);

  useEffect(() => {
    if (!snapCircleRef.current) {
      return;
    }

    const strokeColor = getSnapCircleStrokeColor(isDarkMode);

    snapCircleRef.current.updatePolygonStyle(0, {
      strokeColor,
    });

    // Redraw ensures the updated stroke color is visible without waiting for interaction
    snapCircleRef.current.draw();
  }, [isDarkMode]);

  return {
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
    createSnapCircle,
  };
};
