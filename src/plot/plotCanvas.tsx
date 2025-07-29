import React, { useEffect, useRef, useState } from "react";
import { ResultType } from "eecircuit-engine";
import { Box, Grid, GridItem, Button } from "@chakra-ui/react";
import {
  LineConfig,
  WebglLineThick,
  WebglLinePlot,
  WebglPlot,
  WebglPolygonPlot,
} from "webgl-plot";
import {
  generatePlotColor,
  clearColorCache,
  type PlotColor,
} from "./colorUtils";
import { formatEngineering } from "./formatUtils";
import Axis from "./axis";
import { ZoomController } from "./zoomController";

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
  const snapCircleRef = useRef<WebglPolygonPlot | null>(null);
  // Zoom controller - handles all zoom logic in pure TypeScript
  const zoomController = useRef<ZoomController>(new ZoomController());
  // Zoom feature refs - managed by zoom controller
  const zoomLinesRef = useRef<WebglLinePlot | null>(null);
  const zoomRegionRef = useRef<WebglPolygonPlot | null>(null);
  const lineDataRef = useRef<LineConfig[]>([]);
  const colorMapRef = useRef<Map<string, PlotColor>>(new Map());
  const [isCanvasInitialized, setIsCanvasInitialized] = useState(false);
  const [showCrosshair, setShowCrosshair] = useState(false);
  const [crosshairSnapToLines, setCrosshairSnapToLines] = useState(false);
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

      // Guard against zero dimensions to prevent NaN aspect ratios and unnecessary updates
      if (newWidth === 0 || newHeight === 0) {
        console.log("Canvas dimensions are zero, skipping update:", {
          newWidth,
          newHeight,
        });
        return;
      }

      const aspectRatio = newWidth / newHeight;

      console.log("Canvas dimensions update:", {
        newWidth,
        newHeight,
        aspectRatio,
      });

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

  // Update crosshair position - can snap to nearest plot line or move freely
  const updateCrosshair = (mouseX: number, mouseY: number) => {
    if (!crosshairRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    // Convert mouse coordinates to normalized device coordinates [-1, 1]
    const mouseNdcX = (mouseX / rect.width) * 2 - 1;
    const mouseNdcY = -((mouseY / rect.height) * 2 - 1); // Flip Y coordinate

    let finalDataX, finalDataY, finalNdcX, finalNdcY;

    if (
      crosshairSnapToLines &&
      results.length &&
      selectedVariables.length > 0
    ) {
      // SNAP TO LINES MODE: Find the closest point on any visible line
      const mouseDataX = (mouseNdcX - axisScales.offsetX) / axisScales.scaleX;
      const mouseDataY = (mouseNdcY - axisScales.offsetY) / axisScales.scaleY;

      let closestPoint = { x: mouseDataX, y: mouseDataY, distance: Infinity };

      const variableNames = results[0].variableNames.slice(1); // Exclude X-axis

      lineDataRef.current.forEach((lineData, index) => {
        // Add bounds checking to prevent accessing undefined variable names
        const variableName = variableNames[index];

        // Skip processing if variableName is undefined (out of bounds)
        if (!variableName) {
          return; // Skip this iteration
        }

        const isSelected = selectedVariables.includes(variableName);

        if (!isSelected || !lineData.enabled) return;

        const points = lineData.points;

        // Find the closest X value in the data
        let closestXIndex = 0;
        let minXDiff = Infinity;

        for (let i = 0; i < points.length; i += 2) {
          const x = points[i];
          const xDiff = Math.abs(x - mouseDataX);
          if (xDiff < minXDiff) {
            minXDiff = xDiff;
            closestXIndex = i;
          }
        }

        // Check the closest point and its neighbors for the best Y match
        const checkIndices = [closestXIndex];
        if (closestXIndex > 0) checkIndices.push(closestXIndex - 2);
        if (closestXIndex < points.length - 2)
          checkIndices.push(closestXIndex + 2);

        for (const idx of checkIndices) {
          if (idx >= 0 && idx < points.length) {
            const x = points[idx];
            const y = points[idx + 1];

            // Calculate distance to mouse position (weighted more towards Y difference)
            const xDiff = Math.abs(x - mouseDataX);
            const yDiff = Math.abs(y - mouseDataY);
            const distance = xDiff * 0.3 + yDiff * 0.7; // Prioritize Y proximity

            if (distance < closestPoint.distance) {
              closestPoint = { x, y, distance };
            }
          }
        }
      });

      finalDataX = closestPoint.x;
      finalDataY = closestPoint.y;
      finalNdcX = closestPoint.x * axisScales.scaleX + axisScales.offsetX;
      finalNdcY = closestPoint.y * axisScales.scaleY + axisScales.offsetY;
    } else {
      // FREE ROAMING MODE: Use mouse position directly
      finalDataX = (mouseNdcX - axisScales.offsetX) / axisScales.scaleX;
      finalDataY = (mouseNdcY - axisScales.offsetY) / axisScales.scaleY;
      finalNdcX = mouseNdcX;
      finalNdcY = mouseNdcY;
    }

    // Update crosshair coordinates state
    setCrosshairCoords({ x: finalDataX, y: finalDataY });

    // Create horizontal line (constant Y, varying X)
    const horizontalPoints = new Float32Array([-1, finalNdcY, 1, finalNdcY]);

    // Create vertical line (constant X, varying Y)
    const verticalPoints = new Float32Array([finalNdcX, -1, finalNdcX, 1]);

    // Update crosshair lines
    crosshairRef.current.updateLinePoints(0, horizontalPoints); // Horizontal line
    crosshairRef.current.updateLinePoints(1, verticalPoints); // Vertical line

    // Update snap circle position and visibility
    if (snapCircleRef.current) {
      // Calculate aspect ratio for dynamic scaling
      const rect = canvasRef.current.getBoundingClientRect();
      const aspectRatio = rect.width / rect.height;

      // Apply aspect ratio correction through scaling
      let scaleX = 1;
      let scaleY = 1;

      if (aspectRatio > 1) {
        // Wide canvas: compress horizontally to maintain circular appearance
        scaleX = 1 / aspectRatio;
      } else {
        // Tall canvas: compress vertically to maintain circular appearance
        scaleY = aspectRatio;
      }

      // Update circle position using NDC coordinates with aspect ratio scaling
      snapCircleRef.current.updatePolygonTransform(
        0,
        [scaleX, scaleY],
        [finalNdcX, finalNdcY]
      );

      // Enable/disable the circle based on snap mode
      snapCircleRef.current.setPolygonEnabled(0, crosshairSnapToLines);
    }
  };

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

  // Zoom functions
  const startZoom = (mouseX: number) => {
    // Update zoom controller with current axis scales before starting zoom
    zoomController.current.updateAxisScales(axisScales);
    zoomController.current.startZoom(mouseX);
  };

  const updateZoomSelection = (mouseX: number) => {
    zoomController.current.updateZoomSelection(mouseX);
  };

  const completeZoom = () => {
    const appliedBounds = zoomController.current.completeZoom();

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
    const wasReset = zoomController.current.resetZoom();

    if (wasReset) {
      // Immediately recalculate and redraw without delay
      calculateAndApplyScaling();
      if (isCanvasInitialized) {
        updatePlot();
      }
    }
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
    // Use custom bounds if zoom is active, otherwise calculate from data
    const customXBounds = zoomController.current.getZoomBounds();
    if (customXBounds) {
      xMin = customXBounds.min;
      xMax = customXBounds.max;
    } else {
      const firstVisibleLineIndex = lineDataRef.current.findIndex(
        (_, index) => {
          const variableName = variableNames[index];
          // Add bounds check before checking selectedVariables
          return variableName && selectedVariables.includes(variableName);
        }
      );

      if (firstVisibleLineIndex !== -1) {
        const points = lineDataRef.current[firstVisibleLineIndex].points;
        for (let i = 0; i < points.length; i += 2) {
          const x = points[i];
          xMin = Math.min(xMin, x);
          xMax = Math.max(xMax, x);
        }
      }
    }

    // Calculate Y-axis bounds for all visible lines
    // If zoom is active, only consider Y values within the zoomed X range
    lineDataRef.current.forEach((lineData, index) => {
      const variableName = variableNames[index];

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

          // If zoom is active, only include Y values within X bounds
          if (customXBounds) {
            if (x >= customXBounds.min && x <= customXBounds.max) {
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

      // Don't apply global transform to snap circle as it's already in NDC coordinates

      // Update axis scales for synchronization
      const newAxisScales = { scaleX, scaleY, offsetX, offsetY };
      setAxisScales(newAxisScales);

      // Update zoom controller with new axis scales for coordinate conversion
      zoomController.current.updateAxisScales(newAxisScales);
    } else {
      // Fallback to default transform if no valid data
      plotLineRef.current.setGlobalTransform([1, 1], [-1, -1]);

      // Don't apply transform to snap circle as it's in NDC coordinates

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
      // Add bounds checking to prevent accessing undefined variable names
      const variableName = variableNames[index];

      // Skip processing if variableName is undefined (out of bounds)
      if (!variableName) {
        return; // Skip this iteration
      }

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

    // Draw snap circle if in snap mode
    if (showCrosshair && crosshairSnapToLines && snapCircleRef.current) {
      snapCircleRef.current.draw();
    }

    // Draw zoom components if zooming
    if (
      zoomController.current.getIsZooming() &&
      zoomLinesRef.current &&
      zoomRegionRef.current
    ) {
      zoomLinesRef.current.draw();
      zoomRegionRef.current.draw();
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
      const zoomRegion = {
        fillColor: [1, 1, 0, 0.3] as [number, number, number, number], // Semi-transparent yellow
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
          canvasRef.current
        );
      }

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

        // Add bounds check for variableName
        if (!variableName) {
          continue; // Skip this line
        }

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

      // Don't apply initial transform to snap circle as it's in NDC coordinates

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
          {/* Crosshair snap toggle button - always visible */}
          <Button
            position="absolute"
            top="10px"
            right="10px"
            size="md"
            variant={crosshairSnapToLines ? "solid" : "outline"}
            colorScheme={crosshairSnapToLines ? "white" : "gray.800"}
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
            bg={
              colorMode === "dark"
                ? "rgba(45, 55, 72, 0.7)"
                : "rgba(255, 255, 255, 0.7)"
            }
            backdropFilter="blur(4px)"
            _hover={{
              bg:
                colorMode === "dark"
                  ? "rgba(45, 55, 72, 0.9)"
                  : "rgba(255, 255, 255, 0.9)",
            }}
          >
            {crosshairSnapToLines ? "📍 Snap" : "🎯 Free"}
          </Button>

          {/* Reset zoom button - only visible when zoom is active */}
          {zoomController.current.getZoomBounds() && (
            <Button
              position="absolute"
              top="10px"
              right="120px"
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
              bg={
                colorMode === "dark"
                  ? "rgba(255, 193, 7, 0.8)"
                  : "rgba(255, 193, 7, 0.9)"
              }
              color={colorMode === "dark" ? "black" : "white"}
              backdropFilter="blur(4px)"
              _hover={{
                bg:
                  colorMode === "dark"
                    ? "rgba(255, 193, 7, 1)"
                    : "rgba(255, 193, 7, 1)",
              }}
            >
              🔍 Reset Zoom
            </Button>
          )}

          {/* Zoom instructions - only when not currently zooming */}
          {!zoomController.current.getIsZooming() && !showCrosshair && (
            <Box
              position="absolute"
              bottom="10px"
              left="10px"
              bg={
                colorMode === "dark"
                  ? "rgba(26, 32, 44, 0.7)"
                  : "rgba(255, 255, 255, 0.7)"
              }
              backdropFilter="blur(4px)"
              color={colorMode === "dark" ? "white" : "black"}
              px="8px"
              py="4px"
              borderRadius="md"
              border="1px solid"
              borderColor={
                colorMode === "dark"
                  ? "rgba(113, 128, 150, 0.5)"
                  : "rgba(203, 213, 224, 0.5)"
              }
              fontSize="xs"
              fontFamily="monospace"
              zIndex={10}
              boxShadow="sm"
            >
              💡 Click & drag to zoom X-axis • Double-click to reset
            </Box>
          )}

          {/* Crosshair coordinates display - only when crosshair is active */}
          {showCrosshair && (
            <Box
              position="absolute"
              top="10px"
              left="10px"
              bg={
                colorMode === "dark"
                  ? "rgba(26, 32, 44, 0.7)"
                  : "rgba(255, 255, 255, 0.7)"
              }
              backdropFilter="blur(4px)"
              color={colorMode === "dark" ? "white" : "black"}
              px="8px"
              py="4px"
              borderRadius="md"
              border="1px solid"
              borderColor={
                colorMode === "dark"
                  ? "rgba(113, 128, 150, 0.5)"
                  : "rgba(203, 213, 224, 0.5)"
              }
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
              cursor: zoomController.current.getIsZooming()
                ? "col-resize"
                : showCrosshair
                  ? "crosshair"
                  : "default",
            }}
            onMouseDown={(e) => {
              // Only start zoom on left mouse button
              if (e.button === 0) {
                const rect = e.currentTarget.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                startZoom(mouseX);
              }
            }}
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const mouseX = e.clientX - rect.left;
              const mouseY = e.clientY - rect.top;

              if (zoomController.current.getIsZooming()) {
                // Update zoom selection
                updateZoomSelection(mouseX);
              } else {
                // Normal crosshair behavior
                updateCrosshair(mouseX, mouseY);
              }

              if (isCanvasInitialized) {
                updatePlot();
              }
            }}
            onMouseUp={(e) => {
              // Complete zoom on left mouse button release
              if (e.button === 0 && zoomController.current.getIsZooming()) {
                completeZoom();
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
              if (!zoomController.current.getIsZooming()) {
                setShowCrosshair(true);
              }
            }}
            onMouseLeave={() => {
              if (!zoomController.current.getIsZooming()) {
                setShowCrosshair(false);
                if (isCanvasInitialized) {
                  updatePlot();
                }
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
