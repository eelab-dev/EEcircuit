import { useEffect, useRef, useState } from "react";
import { ResultType } from "eecircuit-engine";
import {
  LineConfig,
  WebglLineThick,
  WebglLinePlot,
  WebglPlot,
  WebglPolygonPlot,
} from "webgl-plot";
import { generatePlotColor, type PlotColor } from "./colorUtils";
import { ZoomController } from "./zoomController";
import { useAppStore } from "../store/appStore";
import { getPlotBackgroundColor } from "./plotBackgroundColors";

// Extended LineConfig with metadata for variable tracking
type ExtendedLineConfig = LineConfig & {
  variableName?: string;
  parameterValue?: string;
  isBracketLine?: boolean;
};
import type { AggregatedResult } from "../simulation/resultAggregator";


interface UseCanvasInitializationProps {
  results: ResultType[];
  updatePlot: () => void;
}

export const useCanvasInitialization = ({
  results,
  updatePlot,
}: UseCanvasInitializationProps) => {
  const isDarkMode = useAppStore((state) => state.isDarkMode);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wglpRef = useRef<WebglPlot | null>(null);
  const plotLineRef = useRef<WebglLineThick | null>(null);
  const crosshairRef = useRef<WebglLinePlot | null>(null);
  const snapCircleRef = useRef<WebglPolygonPlot | null>(null);
  const zoomController = useRef<ZoomController>(new ZoomController());
  const zoomLinesRef = useRef<WebglLinePlot | null>(null);
  const zoomRegionRef = useRef<WebglPolygonPlot | null>(null);
  const lineDataRef = useRef<ExtendedLineConfig[]>([]);
  const colorMapRef = useRef<Map<string, PlotColor>>(new Map());
  const [isCanvasInitialized, setIsCanvasInitialized] = useState(false);

  // Create the snap circle (fixed size, aspect ratio handled by transform scaling)
  const createSnapCircle = () => {
    if (!snapCircleRef.current || !wglpRef.current) return;

    // Create circle with fixed radius in NDC space
    const baseRadius = 0.04; // Base radius in NDC coordinates

    const snapCircle = WebglPolygonPlot.createCircle({
      center: [0, 0], // Will be updated when crosshair moves
      radius: baseRadius,
      segments: 20,
      fillColor: [0, 0, 0, 0], // Transparent fill (hollow)
      strokeColor: [1, 0.9, 0.1, 0.8], // Yellow stroke border
      strokeWeight: 3, // Thicker border for better visibility
      isFilled: false, // No fill - hollow
      isStroked: true, // Only stroke border
      enabled: false, // Initially disabled, enabled only in snap mode
    });

    snapCircleRef.current.initPolygons([snapCircle]);
  };

  // Initialize canvas and WebGL plot only once when results change
  useEffect(() => {
    if (!canvasRef.current || results.length === 0) return;

    const canvas = canvasRef.current;

    // Use requestAnimationFrame to defer initialization until after layout
    const rafId = requestAnimationFrame(() => {
      if (!canvasRef.current || results.length === 0) return;

      const devicePixelRatio = window.devicePixelRatio || 1;

      // Get the computed style dimensions after layout is complete
      const rect = canvas.getBoundingClientRect();
      const width = rect.width || 500;
      const height = rect.height || 500;

      canvas.width = width * devicePixelRatio;
      canvas.height = height * devicePixelRatio;

      // Get theme-aware background color (CSS string works for both canvas and webgl-plot)
      const backgroundColor = getPlotBackgroundColor(isDarkMode);

      // Initialize WebGL plot with theme-aware background
      wglpRef.current = new WebglPlot(canvas, {
        backgroundColor: backgroundColor,
      });

      // Initialize crosshair (thin lines)
      crosshairRef.current = wglpRef.current.newThinLinePlotter(2);

      // Create crosshair lines data (2 lines: horizontal and vertical)
      const crosshairLines: LineConfig[] = [
        {
          points: new Float32Array([-1, 0, 1, 0]), // Horizontal line
          color: [0, 1, 0, 0.8], // Green with transparency
          thickness: 1,
          enabled: true,
        },
        {
          points: new Float32Array([0, -1, 0, 1]), // Vertical line
          color: [0, 1, 0, 0.8], // Green with transparency
          thickness: 1,
          enabled: true,
        },
      ];

      crosshairRef.current.initLines(crosshairLines);

      // Initialize snap circle (polygon plot)
      snapCircleRef.current = new WebglPolygonPlot(wglpRef.current);

      // Create the initial circle
      createSnapCircle();

      // Initialize zoom components
      zoomLinesRef.current = wglpRef.current.newThinLinePlotter(2);
      zoomRegionRef.current = new WebglPolygonPlot(wglpRef.current);

      // Create zoom lines data (2 vertical lines for zoom selection)
      const zoomLines: LineConfig[] = [
        {
          points: new Float32Array([0, -1, 0, 1]), // First vertical line
          color: [1, 0.9, 0.1, 0.9], // Yellow with high opacity
          thickness: 2,
          enabled: false, // Initially disabled
        },
        {
          points: new Float32Array([0, -1, 0, 1]), // Second vertical line
          color: [1, 0.9, 0.1, 0.9], // Yellow with high opacity
          thickness: 2,
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
          isDarkMode
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

      // Create plot line with the correct number of lines

      plotLineRef.current = new WebglLineThick(
        { gl: wglpRef.current.gl },
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
            isDarkMode,
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
              array[i * 2] = paramData.data[0]?.values?.[i] as number; // X-axis data
              array[i * 2 + 1] = paramData.data[lineIndex]?.values?.[
                i
              ] as number; // Y-axis data
            }

            allLineData.push({
              points: new Float32Array(array),
              color: baseColor, // Use same color for all parameter sweeps of this variable
              thickness: 5,
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
            array[i * 2] = firstResult.data[0]?.values?.[i] as number; // X-axis data (frequency)
            array[i * 2 + 1] = firstResult.data[lineIndex]?.values?.[
              i
            ] as number; // Y-axis data (mag/phase)
          }

          allLineData.push({
            points: new Float32Array(array),
            color: generatePlotColor(
              variableName,
              isDarkMode,
              colorMapRef.current
            ),
            thickness: 5,
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

      setIsCanvasInitialized(true);

      // Initial draw with all variables selected
      updatePlot();
    });

    // Cleanup function to cancel the animation frame if component unmounts
    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [results, isDarkMode]);

  // Handle theme changes after canvas is initialized
  useEffect(() => {
    if (isCanvasInitialized && wglpRef.current) {
      const backgroundColor = getPlotBackgroundColor(isDarkMode);
      wglpRef.current.setBackgroundColor(backgroundColor);
      updatePlot(); // Redraw to apply the background color change
    }
  }, [isDarkMode, isCanvasInitialized]);

  return {
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
    createSnapCircle,
  };
};
