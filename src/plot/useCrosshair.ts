import { useState, useEffect, useRef, RefObject } from "react";
import { ResultType } from "eecircuit-engine";
import { LineConfig, WebglLinePlot, WebglPolygonPlot } from "webgl-plot";

// Extended LineConfig with metadata for variable tracking
type ExtendedLineConfig = LineConfig & {
  variableName?: string;
  parameterValue?: string;
  isBracketLine?: boolean;
};

/**
 * DUAL CANVAS CURSOR & ZOOM SYNCHRONIZATION
 * 
 * This module implements cursor synchronization between dual canvases in the plot view.
 * When the user moves the cursor in either the top or bottom plot, both cursors sync
 * their X coordinates (time/frequency) while maintaining independent Y coordinates.
 * 
 * ZOOM SYNCHRONIZATION is implemented similarly in the ZoomController and useZoom hook:
 * - Both canvases share zoom state: isZooming, zoomStartX, zoomEndX, zoomBounds
 * - When zoom starts/updates/completes in one canvas, the other canvas mirrors the operation
 * - Zoom highlighting (yellow region) appears synchronized across both plots
 * - Final zoom bounds are applied to both canvases simultaneously
 * 
 * How cursor sync works:
 * 1. Parent Plot component maintains shared state: sharedCursorX, sharedCursorVisible
 * 2. Each PlotCanvas receives sync props: sharedCursorX, onCursorXChange, sharedCursorVisible, onCursorVisibilityChange
 * 3. When cursor moves in Canvas A:
 *    - updateCrosshair() calculates position and updates local crosshair
 *    - Calls onCursorXChange(xCoordinate) to share X position with parent
 * 4. Parent updates sharedCursorX state, triggering props change in Canvas B
 * 5. Canvas B's useEffect detects sharedCursorX change and updates its vertical line
 * 6. onRedrawNeeded() forces canvas redraw to show the synchronized cursor
 * 
 * Key implementation details:
 * - Only X coordinates are synchronized (Y positions remain canvas-specific)
 * - lastSyncedX ref prevents infinite loops and duplicate syncs
 * - Works in both snap-to-line and free-roam cursor modes
 * - Single canvas mode ignores sync props and works independently
 * 
 * Future developers: If modifying this sync behavior, ensure that:
 * - Cursor visibility is shared between canvases (both show/hide together)
 * - X coordinate sharing doesn't interfere with individual canvas scaling
 * - Canvas redraws are triggered after sync updates to make changes visible
 */

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
  sharedCursorX?: number | null;
  onCursorXChange?: (x: number) => void;
  sharedCursorVisible?: boolean;
  onCursorVisibilityChange?: (visible: boolean) => void;
  // Add canvas redraw callback
  onRedrawNeeded?: () => void;
}

export const useCrosshair = ({
  crosshairRef,
  snapCircleRef,
  canvasRef,
  results,
  selectedVariables,
  lineDataRef,
  getAxisScales,
  sharedCursorX,
  onCursorXChange,
  sharedCursorVisible,
  onCursorVisibilityChange,
  onRedrawNeeded,
}: UseCrosshairProps) => {
  const [localShowCrosshair, setLocalShowCrosshair] = useState(false);
  const lastSyncedX = useRef<number | null>(null);
  
  // Use shared cursor visibility in dual canvas mode, local state otherwise
  const showCrosshair = sharedCursorVisible !== undefined ? sharedCursorVisible : localShowCrosshair;
  const setShowCrosshair = sharedCursorVisible !== undefined ? onCursorVisibilityChange! : setLocalShowCrosshair;
  const [crosshairSnapToLines, setCrosshairSnapToLines] = useState(false);
  const [crosshairCoords, setCrosshairCoords] = useState<{
    x: number;
    y: number;
  }>({ x: 0, y: 0 });

  // Store axis scales to detect changes
  const lastAxisScalesRef = useRef<AxisScales | null>(null);

  // Function to sync crosshair with current axis scales
  const syncCrosshairWithAxisScales = () => {
    if (sharedCursorX !== null && sharedCursorX !== undefined && crosshairRef.current) {
      const axisScales = getAxisScales();
      const sharedNdcX = sharedCursorX * axisScales.scaleX + axisScales.offsetX;
      
      // Update vertical line to shared X position
      const verticalPoints = new Float32Array([sharedNdcX, -1, sharedNdcX, 1]);
      crosshairRef.current.updateLinePoints(1, verticalPoints);
      
      // Force canvas redraw
      if (onRedrawNeeded) {
        onRedrawNeeded();
      }
    }
  };

  // Dual canvas cursor synchronization: sync vertical crosshair to shared X coordinate
  useEffect(() => {
    if (sharedCursorX !== null && sharedCursorX !== undefined && crosshairRef.current && sharedCursorX !== lastSyncedX.current) {
      lastSyncedX.current = sharedCursorX;
      syncCrosshairWithAxisScales();
    }
  }, [sharedCursorX]);

  // Monitor axis scales and re-sync crosshair when they change (e.g., after zoom operations)
  // This effect runs on every render to check for axis scale changes, which is intentional
  // because axis scales can change due to zoom operations and we need to detect these changes
  useEffect(() => {
    const currentAxisScales = getAxisScales();
    
    // Check if axis scales have changed significantly
    const hasScalesChanged = !lastAxisScalesRef.current || 
      Math.abs(lastAxisScalesRef.current.scaleX - currentAxisScales.scaleX) > 1e-10 ||
      Math.abs(lastAxisScalesRef.current.scaleY - currentAxisScales.scaleY) > 1e-10 ||
      Math.abs(lastAxisScalesRef.current.offsetX - currentAxisScales.offsetX) > 1e-10 ||
      Math.abs(lastAxisScalesRef.current.offsetY - currentAxisScales.offsetY) > 1e-10;
    
    if (hasScalesChanged) {
      // Re-apply shared cursor position with new axis scales
      syncCrosshairWithAxisScales();
      
      // Update stored axis scales
      lastAxisScalesRef.current = { ...currentAxisScales };
    }
  });

  // Update crosshair position - can snap to nearest plot line or move freely
  const updateCrosshair = (mouseX: number, mouseY: number) => {
    if (!crosshairRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    // Convert mouse coordinates to normalized device coordinates [-1, 1]
    const mouseNdcX = (mouseX / rect.width) * 2 - 1;
    const mouseNdcY = -((mouseY / rect.height) * 2 - 1); // Flip Y coordinate

    let finalDataX, finalDataY;

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
    } else {
      // FREE ROAMING MODE: Use mouse position directly
      const axisScales = getAxisScales();
      finalDataX = (mouseNdcX - axisScales.offsetX) / axisScales.scaleX;
      finalDataY = (mouseNdcY - axisScales.offsetY) / axisScales.scaleY;
    }

    // Update crosshair coordinates state
    setCrosshairCoords({ x: finalDataX, y: finalDataY });

    // Convert to NDC coordinates for rendering
    const axisScales = getAxisScales();
    const finalNdcX = finalDataX * axisScales.scaleX + axisScales.offsetX;
    const finalNdcY = finalDataY * axisScales.scaleY + axisScales.offsetY;

    // Create horizontal and vertical lines
    const horizontalPoints = new Float32Array([-1, finalNdcY, 1, finalNdcY]);
    const verticalPoints = new Float32Array([finalNdcX, -1, finalNdcX, 1]);

    // Update crosshair lines
    crosshairRef.current.updateLinePoints(0, horizontalPoints);
    crosshairRef.current.updateLinePoints(1, verticalPoints);

    // Update snap circle
    if (snapCircleRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const aspectRatio = rect.width / rect.height;
      
      let scaleX = 1;
      let scaleY = 1;
      
      if (aspectRatio > 1) {
        scaleX = 1 / aspectRatio;
      } else {
        scaleY = aspectRatio;
      }
      
      snapCircleRef.current.updatePolygonTransform(
        0,
        [scaleX, scaleY],
        [finalNdcX, finalNdcY]
      );
      
      snapCircleRef.current.setPolygonEnabled(0, crosshairSnapToLines);
    }

    // Share X coordinate with other canvas in dual mode
    if (onCursorXChange) {
      onCursorXChange(finalDataX);
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