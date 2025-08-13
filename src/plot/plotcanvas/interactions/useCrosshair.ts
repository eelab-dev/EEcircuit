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
 * HIGH-PERFORMANCE CROSSHAIR SYSTEM WITH DUAL CANVAS SYNCHRONIZATION
 * 
 * This module implements a high-performance crosshair system optimized for real-time
 * mouse tracking at maximum FPS. The crosshair uses webgl-plot lines for efficient
 * rendering with minimal React overhead.
 * 
 * PERFORMANCE OPTIMIZATIONS:
 * - webgl-plot lines updated directly via updateLinePoints() - no React re-renders
 * - Crosshair coordinates stored in ref to avoid React state updates
 * - Direct DOM manipulation for coordinate display (no React state changes)
 * - Mouse move events bypass React updatePlot() calls for crosshair-only updates
 * - Optimized for smooth 60+ FPS crosshair movement without throttling
 * 
 * DUAL CANVAS CURSOR SYNCHRONIZATION:
 * When the user moves the cursor in either the top or bottom plot, both cursors sync
 * their X coordinates (time/frequency) while maintaining independent Y coordinates.
 * 
 * ZOOM SYNCHRONIZATION is implemented similarly in the ZoomController and useZoom hook:
 * - Both canvases share zoom state: isZooming, zoomStartX, zoomEndX, zoomBounds
 * - When zoom starts/updates/completes in one canvas, the other canvas mirrors the operation
 * - Zoom highlighting (yellow region) appears synchronized across both plots
 * - Final zoom bounds are applied to both canvases simultaneously
 * 
 * PAN SYNCHRONIZATION works through shared pan offset state:
 * - Both canvases share pan state: sharedPanOffset
 * - When user pans (via scroll wheel or trackpad) in one canvas, the panOffset is shared with the other
 * - ZoomController notifies parent about pan offset changes via callback
 * - Other canvas receives the shared offset and applies it to maintain synchronized view
 * - Works for both horizontal scroll wheel and trackpad pan gestures
 * 
 * How cursor sync works:
 * 1. Parent Plot component maintains shared state: sharedCursorX, sharedCursorVisible
 * 2. Each PlotCanvas receives sync props: sharedCursorX, onCursorXChange, sharedCursorVisible, onCursorVisibilityChange
 * 3. When cursor moves in Canvas A:
 *    - updateCrosshair() calculates position and updates webgl-plot lines directly
 *    - Updates coordinates via direct DOM manipulation (onCoordinateUpdate)
 *    - Calls onCursorXChange(xCoordinate) to share X position with parent
 *    - Triggers webgl redraw via onRedrawNeeded() - no React re-render
 * 4. Parent updates sharedCursorX state, triggering props change in Canvas B
 * 5. Canvas B's useEffect detects sharedCursorX change and updates its vertical line
 * 6. onRedrawNeeded() forces webgl redraw to show the synchronized cursor
 * 
 * Key implementation details:
 * - Only X coordinates are synchronized (Y positions remain canvas-specific)
 * - lastSyncedX ref prevents infinite loops and duplicate syncs
 * - Works in both snap-to-line and free-roam cursor modes
 * - Single canvas mode ignores sync props and works independently
 * - Crosshair coordinates stored in crosshairCoordsRef to avoid React state
 * - Coordinate display updated via direct textContent manipulation
 * 
 * Future developers: If modifying this behavior, ensure that:
 * - Cursor visibility is shared between canvases (both show/hide together)
 * - X coordinate sharing doesn't interfere with individual canvas scaling
 * - webgl redraws are triggered after sync updates to make changes visible
 * - Performance optimizations are maintained (avoid React state on mouse move)
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
  // Direct DOM update callback for crosshair display
  onCoordinateUpdate?: (x: number, y: number) => void;
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
  onCoordinateUpdate,
}: UseCrosshairProps) => {
  const [localShowCrosshair, setLocalShowCrosshair] = useState(false);
  const lastSyncedX = useRef<number | null>(null);
  
  // Use shared cursor visibility in dual canvas mode, local state otherwise
  const showCrosshair = sharedCursorVisible !== undefined ? sharedCursorVisible : localShowCrosshair;
  const setShowCrosshair = sharedCursorVisible !== undefined ? onCursorVisibilityChange! : setLocalShowCrosshair;
  const [crosshairSnapToLines, setCrosshairSnapToLines] = useState(false);

  // Add/remove crosshair lines from webgl-plot based on showCrosshair state
  useEffect(() => {
    if (crosshairRef.current) {
      if (showCrosshair) {
        // Add crosshair lines to webgl-plot
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
      } else {
        // Remove all crosshair lines from webgl-plot
        crosshairRef.current.initLines([]);
      }
      
      // Also disable snap circle when crosshair is hidden
      if (snapCircleRef.current) {
        snapCircleRef.current.setPolygonEnabled(0, showCrosshair && crosshairSnapToLines);
      }
      
      // Force canvas redraw to show/hide the crosshair
      if (onRedrawNeeded) {
        onRedrawNeeded();
      }
    }
  }, [showCrosshair, crosshairSnapToLines]);
  
  // Store crosshair coordinates in ref to avoid React re-renders
  const crosshairCoordsRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Dual canvas cursor synchronization: sync vertical crosshair to shared X coordinate
  useEffect(() => {
    if (sharedCursorX !== null && sharedCursorX !== undefined && crosshairRef.current && showCrosshair && sharedCursorX !== lastSyncedX.current) {
      lastSyncedX.current = sharedCursorX;
      const currentAxisScales = getAxisScales();
      const sharedNdcX = sharedCursorX * currentAxisScales.scaleX + currentAxisScales.offsetX;
      
      // Update vertical line to shared X position (only if lines exist)
      const verticalPoints = new Float32Array([sharedNdcX, -1, sharedNdcX, 1]);
      crosshairRef.current.updateLinePoints(1, verticalPoints);
      
      // Force canvas redraw
      if (onRedrawNeeded) {
        onRedrawNeeded();
      }
    }
  }, [sharedCursorX, showCrosshair]);

  // Update crosshair position - can snap to nearest plot line or move freely
  const updateCrosshair = (mouseX: number, mouseY: number) => {
    if (!crosshairRef.current || !canvasRef.current || !showCrosshair) return;

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

    // Update crosshair coordinates in ref (no React re-render)
    crosshairCoordsRef.current = { x: finalDataX, y: finalDataY };

    // Update coordinate display directly via DOM (no React re-render)
    if (onCoordinateUpdate) {
      onCoordinateUpdate(finalDataX, finalDataY);
    }

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
      
      snapCircleRef.current.setPolygonEnabled(0, showCrosshair && crosshairSnapToLines);
    }

    // Share X coordinate with other canvas in dual mode
    if (onCursorXChange) {
      onCursorXChange(finalDataX);
    }

    // Force webgl redraw for crosshair updates
    if (onRedrawNeeded) {
      onRedrawNeeded();
    }
  };

  return {
    showCrosshair,
    setShowCrosshair,
    crosshairSnapToLines,
    setCrosshairSnapToLines,
    updateCrosshair,
  };
};