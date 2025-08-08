import { useState, RefObject } from "react";
import { ResultType } from "eecircuit-engine";
import { LineConfig, WebglLinePlot, WebglPolygonPlot } from "webgl-plot";

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

interface UseCrosshairProps {
  crosshairRef: RefObject<WebglLinePlot | null>;
  snapCircleRef: RefObject<WebglPolygonPlot | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  results: ResultType[];
  selectedVariables: string[];
  lineDataRef: RefObject<ExtendedLineConfig[]>;
  getAxisScales: () => AxisScales;
}

export const useCrosshair = ({
  crosshairRef,
  snapCircleRef,
  canvasRef,
  results,
  selectedVariables,
  lineDataRef,
  getAxisScales,
}: UseCrosshairProps) => {
  const [showCrosshair, setShowCrosshair] = useState(false);
  const [crosshairSnapToLines, setCrosshairSnapToLines] = useState(false);
  const [crosshairCoords, setCrosshairCoords] = useState<{
    x: number;
    y: number;
  }>({ x: 0, y: 0 });

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
      const axisScales = getAxisScales();
      const mouseDataX = (mouseNdcX - axisScales.offsetX) / axisScales.scaleX;
      const mouseDataY = (mouseNdcY - axisScales.offsetY) / axisScales.scaleY;

      let closestPoint = { x: mouseDataX, y: mouseDataY, distance: Infinity };

      lineDataRef.current?.forEach((lineData) => {
        // Use variableName from line metadata instead of array index
        // This is crucial for bracket operations where there are multiple lines per variable
        const extendedLineData = lineData as ExtendedLineConfig;
        const variableName = extendedLineData.variableName;

        // Skip processing if variableName is undefined
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
          if (x === undefined) continue;
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

            if (x === undefined || y === undefined) continue;

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

      finalDataX = closestPoint.x ?? mouseDataX;
      finalDataY = closestPoint.y ?? mouseDataY;
      finalNdcX = finalDataX * axisScales.scaleX + axisScales.offsetX;
      finalNdcY = finalDataY * axisScales.scaleY + axisScales.offsetY;
    } else {
      // FREE ROAMING MODE: Use mouse position directly
      const axisScales = getAxisScales();
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

  return {
    showCrosshair,
    setShowCrosshair,
    crosshairSnapToLines,
    setCrosshairSnapToLines,
    crosshairCoords,
    updateCrosshair,
  };
};