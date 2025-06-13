import React, { useEffect, useRef, useState } from "react";
import { ResultType } from "eecircuit-engine";
import { Box, Grid, GridItem } from "@chakra-ui/react";
import {
  LineConfig,
  WebglLineThick,
  WebglLinePlot,
  WebglPlot,
} from "webgl-plot";
import {
  generatePlotColor,
  clearColorCache,
  type PlotColor,
} from "./colorUtils";
import { formatEngineering } from "./formatUtils";
import Axis from "./axis";

interface PlotCanvasProps {
  results: ResultType[];
  selectedVariables: string[];
  hoveredVariable: string | null;
  colorMode: "light" | "dark";
}

interface AxisScales {
  scaleX: number;
  scaleY: number;
  offsetX: number;
  offsetY: number;
}

const PlotCanvas: React.FC<PlotCanvasProps> = ({
  results,
  selectedVariables,
  hoveredVariable,
  colorMode,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wglpRef = useRef<WebglPlot | null>(null);
  const plotLineRef = useRef<WebglLineThick | null>(null);
  const crosshairRef = useRef<WebglLinePlot | null>(null);
  const lineDataRef = useRef<LineConfig[]>([]);
  const colorMapRef = useRef<Map<string, PlotColor>>(new Map());
  const [isCanvasInitialized, setIsCanvasInitialized] = useState(false);
  const [showCrosshair, setShowCrosshair] = useState(false);
  const [crosshairCoords, setCrosshairCoords] = useState<{
    x: number;
    y: number;
  }>({ x: 0, y: 0 });
  const [axisScales, setAxisScales] = useState<AxisScales>({
    scaleX: 1,
    scaleY: 1,
    offsetX: 0,
    offsetY: 0,
  });
  const [isAxis] = useState(true);

  // Debug: Log axisScales changes (can be removed when debugging is complete)
  // useEffect(() => {
  //   console.log("axisScales state updated:", axisScales);
  // }, [axisScales]);

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

    // Handle page visibility changes (when switching tabs)
    const handleVisibilityChange = () => {
      if (!document.hidden && isCanvasInitialized) {
        // Page became visible again - redraw plot
        console.log("Page became visible, redrawing plot");
        requestAnimationFrame(() => {
          if (wglpRef.current && plotLineRef.current) {
            calculateAndApplyScaling();
            plotLineRef.current.draw();
          }
        });
      }
    };

    window.addEventListener("resize", handleWindowResize);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", handleWindowResize);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [canvasRef.current, isCanvasInitialized]); // Watch for canvas ref changes and initialization

  // Update crosshair position
  const updateCrosshair = (mouseX: number, mouseY: number) => {
    if (!crosshairRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    // Convert mouse coordinates to normalized device coordinates [-1, 1]
    const ndcX = (mouseX / rect.width) * 2 - 1;
    const ndcY = -((mouseY / rect.height) * 2 - 1); // Flip Y coordinate

    // Convert NDC coordinates back to data coordinates
    const dataX = (ndcX - axisScales.offsetX) / axisScales.scaleX;
    const dataY = (ndcY - axisScales.offsetY) / axisScales.scaleY;

    // Update crosshair coordinates state
    setCrosshairCoords({ x: dataX, y: dataY });

    // Create horizontal line (constant Y, varying X)
    const horizontalPoints = new Float32Array([-1, ndcY, 1, ndcY]);

    // Create vertical line (constant X, varying Y)
    const verticalPoints = new Float32Array([ndcX, -1, ndcX, 1]);

    // Update crosshair lines
    crosshairRef.current.updateLinePoints(0, horizontalPoints); // Horizontal line
    crosshairRef.current.updateLinePoints(1, verticalPoints); // Vertical line
  };

  // Calculate and apply auto-scaling transform for visible lines
  const calculateAndApplyScaling = () => {
    if (!plotLineRef.current || selectedVariables.length === 0) {
      // Fallback to default transform if no visible lines
      console.log("Using fallback transform");
      plotLineRef.current?.setGlobalTransform([1, 1], [-1, -1]);
      setAxisScales({ scaleX: 1, scaleY: 1, offsetX: -1, offsetY: -1 });
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

      // Update line properties using the new API methods
      plotLineRef.current!.updateLineColor(index, currentColor);
      plotLineRef.current!.setLineEnabled(index, isSelected);

      // Increase thickness for hovered lines if they are selected
      const thickness = isSelected && isHovered ? 10 : 5;
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

      const numX = results[0].numPoints;
      const numVariables = results[0].numVariables;

      // Create plot line with maximum possible lines
      plotLineRef.current = new WebglLineThick(
        { gl: wglpRef.current.gl },
        numVariables - 1
      );

      // Prepare line data for all variables (excluding X-axis at index 0)
      const allLineData: LineConfig[] = [];
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
          color: generatePlotColor(
            variableName,
            colorMode,
            colorMapRef.current
          ),
          thickness: 5,
          scale: [1, 1],
          offset: [0, 0],
          enabled: true,
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
      <GridItem rowStart={1} colStart={2} minW="0" minH="0" overflow="hidden">
        <Box
          w="100%"
          h="100%"
          minW="0"
          minH="0"
          overflow="hidden"
          position="relative"
        >
          {/* Crosshair coordinates display */}
          {showCrosshair && (
            <Box
              position="absolute"
              top="10px"
              left="10px"
              bg={colorMode === "dark" ? "gray.800" : "white"}
              color={colorMode === "dark" ? "white" : "black"}
              px="8px"
              py="4px"
              borderRadius="md"
              border="1px solid"
              borderColor={colorMode === "dark" ? "gray.600" : "gray.300"}
              fontSize="sm"
              fontFamily="monospace"
              zIndex={10}
              boxShadow="sm"
            >
              X: {formatEngineering(crosshairCoords.x)}, Y:{" "}
              {formatEngineering(crosshairCoords.y)}
            </Box>
          )}
          <canvas
            ref={canvasRef}
            style={{
              width: "100%",
              height: "100%",
              display: "block",
              backgroundColor: "transparent",
              cursor: showCrosshair ? "crosshair" : "default",
            }}
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const mouseX = e.clientX - rect.left;
              const mouseY = e.clientY - rect.top;
              updateCrosshair(mouseX, mouseY);
              if (isCanvasInitialized) {
                updatePlot();
              }
            }}
            onMouseEnter={() => {
              setShowCrosshair(true);
            }}
            onMouseLeave={() => {
              setShowCrosshair(false);
              if (isCanvasInitialized) {
                updatePlot();
              }
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
  );
};

export default PlotCanvas;
