import React, { useEffect, useState, useRef } from "react";
import { ResultType } from "eecircuit-engine";
import { Checkbox, CheckboxGroup, Fieldset, Flex, For } from "@chakra-ui/react";
import { LineInitData, WebglLineThick, WebglPlot } from "webgl-plot";
import { useColorMode } from "../components/ui/color-mode";
import {
  generatePlotColor,
  clearColorCache,
  type PlotColor,
} from "./colorUtils";

interface PlotProps {
  results: ResultType[];
}

const Plot: React.FC<PlotProps> = ({ results }) => {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const wglpRef = useRef<WebglPlot | null>(null);
  const plotLineRef = useRef<WebglLineThick | null>(null);
  const lineDataRef = useRef<LineInitData[]>([]);
  const colorMapRef = useRef<Map<string, PlotColor>>(new Map());
  const [selectedVariables, setSelectedVariables] = useState<string[]>([]);
  const [isCanvasInitialized, setIsCanvasInitialized] = useState(false);
  const { colorMode } = useColorMode();

  // Initialize with all variables selected by default
  useEffect(() => {
    if (results.length > 0 && results[0].variableNames) {
      // Skip the first variable (usually time) and select all others by default
      setSelectedVariables(results[0].variableNames.slice(1));
    }
  }, [results]);

  // Clear color cache when color mode changes
  useEffect(() => {
    clearColorCache(colorMapRef.current);
    // Regenerate colors if canvas is already initialized
    if (isCanvasInitialized) {
      updatePlot();
    }
  }, [colorMode]);

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
    const variableNames = results[0].variableNames.slice(1); // Exclude X-axis

    lineDataRef.current.forEach((lineData, index) => {
      const variableName = variableNames[index];
      const isSelected = selectedVariables.includes(variableName);

      // Regenerate color for current theme if not cached
      const currentColor = generatePlotColor(
        variableName,
        colorMode,
        colorMapRef.current
      );
      lineData.color = [...currentColor];

      // Set alpha to 0 for hidden lines, 1 for visible lines
      lineData.color[3] = isSelected ? 1 : 0;
    });

    // Calculate bounds for visible lines to auto-scale
    let xMin = Infinity,
      xMax = -Infinity;
    let yMin = Infinity,
      yMax = -Infinity;

    // Calculate X-axis bounds once (same for all lines)
    const firstVisibleLineIndex = lineDataRef.current.findIndex((_, index) => {
      const variableName = variableNames[index];
      return selectedVariables.includes(variableName);
    });

    if (firstVisibleLineIndex !== -1) {
      const points = lineDataRef.current[firstVisibleLineIndex].points;
      for (let i = 0; i < points.length; i += 2) {
        const x = points[i];
        xMin = Math.min(xMin, x);
        xMax = Math.max(xMax, x);
      }
    }

    // Calculate Y-axis bounds for all visible lines
    lineDataRef.current.forEach((lineData, index) => {
      const variableName = variableNames[index];
      const isSelected = selectedVariables.includes(variableName);

      if (isSelected) {
        const points = lineData.points;
        for (let i = 1; i < points.length; i += 2) {
          const y = points[i];
          yMin = Math.min(yMin, y);
          yMax = Math.max(yMax, y);
        }
      }
    });

    // Apply auto-scaling if we have valid bounds
    if (isFinite(xMin) && isFinite(xMax) && isFinite(yMin) && isFinite(yMax)) {
      const xRange = xMax - xMin;
      const yRange = yMax - yMin;

      // Add small padding to avoid edge cases
      const xPadding = xRange * 0.05;
      const yPadding = yRange * 0.05;

      xMin -= xPadding;
      xMax += xPadding;
      yMin -= yPadding;
      yMax += yPadding;

      const finalXRange = xMax - xMin;
      const finalYRange = yMax - yMin;

      // Calculate scale and offset for fitting data to [-1, 1] range
      // Scale: how much to shrink/expand the data
      const scaleX = finalXRange > 0 ? 2 / finalXRange : 1;
      const scaleY = finalYRange > 0 ? 2 / finalYRange : 1;

      // Offset: where to position the center of the data
      // Transform from data space to [-1, 1] space
      const offsetX = -1 - xMin * scaleX;
      const offsetY = -1 - yMin * scaleY;

      plotLineRef.current.setGlobalTransform(
        [scaleX, scaleY],
        [offsetX, offsetY]
      );
    } else {
      // Fallback to default transform if no valid data
      plotLineRef.current.setGlobalTransform([1, 1], [-1, -1]);
    }

    // Reinitialize with updated visibility
    plotLineRef.current.initLines(lineDataRef.current);
    plotLineRef.current.draw();
  };

  // Initialize canvas and WebGL plot only once when results change
  useEffect(() => {
    if (!canvasRef.current || results.length === 0) return;

    const canvas = canvasRef.current;
    const devicePixelRatio = window.devicePixelRatio || 1;

    // Get the computed style dimensions
    const rect = canvas.getBoundingClientRect();
    const width = rect.width || 500;
    const height = rect.height || 500;

    canvas.width = width * devicePixelRatio;
    canvas.height = height * devicePixelRatio;

    // Initialize WebGL plot
    wglpRef.current = new WebglPlot(canvas);

    const numX = results[0].numPoints;
    const numVariables = results[0].numVariables;

    // Create plot line with maximum possible lines
    plotLineRef.current = new WebglLineThick(wglpRef.current, numVariables - 1);

    // Prepare line data for all variables (excluding X-axis at index 0)
    const allLineData: LineInitData[] = [];
    const array = new Float32Array(numX * 2);

    for (let lineIndex = 1; lineIndex < numVariables; lineIndex++) {
      const variableName = results[0].variableNames[lineIndex];

      // Fill array with x,y data
      for (let i = 0; i < numX; i++) {
        array[i * 2] = results[0].data[0].values[i] as number; // X-axis data
        array[i * 2 + 1] = results[0].data[lineIndex].values[i] as number; // Y-axis data
      }

      allLineData.push({
        points: new Float32Array(array),
        scale: [1, 1],
        offset: [0, 0],
        color: generatePlotColor(variableName, colorMode, colorMapRef.current),
        thickness: 0.01,
      });
    }

    lineDataRef.current = allLineData;
    plotLineRef.current.initLines(allLineData);
    plotLineRef.current.setGlobalTransform([1, 1], [-1, -1]);
    setIsCanvasInitialized(true);

    // Initial draw with all variables selected
    updatePlot();
  }, [results]);

  // Update plot visibility when selected variables change
  useEffect(() => {
    if (isCanvasInitialized) {
      updatePlot();
    }
  }, [selectedVariables, isCanvasInitialized]);

  return (
    <Flex direction="row" w="100%" h="60vh" gap={4} p={4}>
      <Flex flex="1" minW="0">
        <canvas
          ref={canvasRef}
          style={{ width: "100%", height: "100%", display: "block" }}
        />
      </Flex>
      {results.length > 0 && results[0].variableNames && (
        <Flex flexShrink="0" w="10em">
          <Fieldset.Root w="100%">
            <CheckboxGroup
              value={selectedVariables}
              onValueChange={setSelectedVariables}
              name="variables"
            >
              <Fieldset.Legend fontSize="sm" mb="2">
                X-axis: {results[0].variableNames[0]}
              </Fieldset.Legend>
              <Fieldset.Content>
                <For each={results[0].variableNames.slice(1)}>
                  {(value) => (
                    <Checkbox.Root key={value} value={value}>
                      <Checkbox.HiddenInput />
                      <Checkbox.Control />
                      <Checkbox.Label>{value}</Checkbox.Label>
                    </Checkbox.Root>
                  )}
                </For>
              </Fieldset.Content>
            </CheckboxGroup>
          </Fieldset.Root>
        </Flex>
      )}
    </Flex>
  );
};

export default Plot;
