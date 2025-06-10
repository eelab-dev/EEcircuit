import React, { useEffect, useState, useRef } from "react";
import { ResultType } from "eecircuit-engine";
import {
  Box,
  Checkbox,
  CheckboxGroup,
  Fieldset,
  Flex,
  For,
  Grid,
  GridItem,
} from "@chakra-ui/react";
import { LineInitData, WebglLineThick, WebglPlot } from "webgl-plot";
import { useColorMode } from "../components/ui/color-mode";
import {
  generatePlotColor,
  clearColorCache,
  type PlotColor,
} from "./colorUtils";
import Axis from "./axis";

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
  const [hoveredVariable, setHoveredVariable] = useState<string | null>(null);
  const [isCanvasInitialized, setIsCanvasInitialized] = useState(false);
  const [axisScales, setAxisScales] = useState({
    scaleX: 1,
    scaleY: 1,
    offsetX: 0,
    offsetY: 0,
  });
  const { colorMode } = useColorMode();
  const [isAxis] = useState(true);

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
  }, [colorMode, isCanvasInitialized]);

  // Monitor canvas size changes
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;

    const updateCanvasDimensions = () => {
      const rect = canvas.getBoundingClientRect();
      const newWidth = rect.width;
      const newHeight = rect.height;

      console.log("Canvas dimensions update:", { newWidth, newHeight });

      // If the canvas is initialized and size changed, update WebGL canvas size
      if (isCanvasInitialized) {
        const devicePixelRatio = window.devicePixelRatio || 1;
        const newCanvasWidth = newWidth * devicePixelRatio;
        const newCanvasHeight = newHeight * devicePixelRatio;

        if (
          canvas.width !== newCanvasWidth ||
          canvas.height !== newCanvasHeight
        ) {
          canvas.width = newCanvasWidth;
          canvas.height = newCanvasHeight;

          // Update WebGL viewport to match new canvas size
          if (wglpRef.current) {
            wglpRef.current.viewport(0, 0, newCanvasWidth, newCanvasHeight);
          }

          // Force recalculation of scaling and redraw with new aspect ratio
          if (wglpRef.current && plotLineRef.current) {
            calculateAndApplyScaling();
            plotLineRef.current.draw();
          }
        }
      }
    };

    // Initial size update with a small delay to ensure layout is complete
    const initialUpdate = () => {
      requestAnimationFrame(() => {
        updateCanvasDimensions();
      });
    };

    initialUpdate();

    // Use ResizeObserver to monitor canvas size changes
    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(updateCanvasDimensions);
    });
    resizeObserver.observe(canvas);

    // Also add window resize listener as backup
    const handleWindowResize = () => {
      requestAnimationFrame(updateCanvasDimensions);
    };

    window.addEventListener("resize", handleWindowResize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", handleWindowResize);
    };
  }, [canvasRef.current, isCanvasInitialized]); // Watch for canvas ref changes and initialization

  // Calculate and apply auto-scaling transform for visible lines
  const calculateAndApplyScaling = () => {
    if (!plotLineRef.current || selectedVariables.length === 0) {
      // Fallback to default transform if no visible lines
      plotLineRef.current?.setGlobalTransform([1, 1], [-1, -1]);
      return;
    }

    const variableNames = results[0].variableNames.slice(1); // Exclude X-axis
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

      // Add padding to avoid edge cases and ensure constant values are visible
      // For constant values (zero range), use minimum padding to create visual separation
      const xPadding = xRange > 0 ? xRange * 0.05 : Math.abs(xMin) * 0.1 || 1;
      const yPadding = yRange > 0 ? yRange * 0.05 : Math.abs(yMin) * 0.1 || 1;

      xMin -= xPadding;
      xMax += xPadding;
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

      plotLineRef.current.setGlobalTransform(
        [scaleX, scaleY],
        [offsetX, offsetY]
      );

      // Update axis scales for synchronization
      setAxisScales({ scaleX, scaleY, offsetX, offsetY });
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
    const variableNames = results[0].variableNames.slice(1); // Exclude X-axis

    lineDataRef.current.forEach((lineData, index) => {
      const variableName = variableNames[index];
      const isSelected = selectedVariables.includes(variableName);
      const isHovered = hoveredVariable === variableName;

      // Regenerate color for current theme if not cached
      const currentColor = generatePlotColor(
        variableName,
        colorMode,
        colorMapRef.current
      );
      lineData.color = [...currentColor];

      // Set alpha to 0 for hidden lines, 1 for visible lines
      lineData.color[3] = isSelected ? 1 : 0;

      // Increase thickness for hovered lines if they are selected
      lineData.thickness = isSelected && isHovered ? 10 : 5;
    });

    // Calculate and apply auto-scaling for visible lines
    calculateAndApplyScaling();

    // Reinitialize with updated visibility
    plotLineRef.current.initLines(lineDataRef.current);
    plotLineRef.current.draw();
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

      // Initialize WebGL plot
      wglpRef.current = new WebglPlot(canvas);

      const numX = results[0].numPoints;
      const numVariables = results[0].numVariables;

      // Create plot line with maximum possible lines
      plotLineRef.current = new WebglLineThick(
        wglpRef.current,
        numVariables - 1
      );

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
          color: generatePlotColor(
            variableName,
            colorMode,
            colorMapRef.current
          ),
          thickness: 5,
        });
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
  }, [results]);

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
    <Flex direction="row" w="100%" h="100%" gap={4} p={4} overflow="hidden">
      <Flex flex="1" minW="0" direction="column" minHeight={0}>
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
          <GridItem
            rowStart={1}
            colStart={2}
            minW="0"
            minH="0"
            overflow="hidden"
          >
            <Box w="100%" h="100%" minW="0" minH="0" overflow="hidden">
              <canvas
                ref={canvasRef}
                style={{
                  width: "100%",
                  height: "100%",
                  display: "block",
                  backgroundColor: "transparent",
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
          <GridItem
            rowStart={2}
            colStart={2}
            borderTop={`${isAxis ? "solid 2px" : ""}`}
          >
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
      </Flex>
      {results.length > 0 && results[0].variableNames && (
        <Flex flexShrink="0" w="10em" minHeight={0} overflow="hidden">
          <Fieldset.Root w="100%" h="100%">
            <CheckboxGroup
              value={selectedVariables}
              onValueChange={setSelectedVariables}
              name="variables"
            >
              <Fieldset.Legend fontSize="sm" mb="2">
                X-axis: {results[0].variableNames[0]}
              </Fieldset.Legend>
              <Fieldset.Content overflowY="auto" maxHeight="100%">
                <For each={results[0].variableNames.slice(1)}>
                  {(value) => (
                    <Checkbox.Root
                      key={value}
                      value={value}
                      onMouseEnter={() => setHoveredVariable(value)}
                      onMouseLeave={() => setHoveredVariable(null)}
                    >
                      <Checkbox.HiddenInput />
                      <Checkbox.Control />
                      <Checkbox.Label
                        fontWeight={
                          hoveredVariable === value ? "semibold" : "normal"
                        }
                        transition="font-weight 0.1s ease"
                      >
                        {value}
                      </Checkbox.Label>
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
