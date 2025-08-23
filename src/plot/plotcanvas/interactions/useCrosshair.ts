import { useState, useEffect, useRef, RefObject } from "react";
import { ResultType } from "eecircuit-engine";
import { LineConfig, WebglLinePlot, WebglPolygonPlot, UnifiedLinePlot } from "webgl-plot";
import { LINE_THICKNESS } from "../styling/lineThickness";
import { useAppStore } from "../../../store/appStore";
import { convertDataToDisplayCoordinates } from "../utils/coordinateUtils";

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
 * SIMPLIFIED SYNCHRONIZATION APPROACH:
 * Since both canvases have identical X-axis scales (enforced by usePlotCalculations validation),
 * coordinates can be shared directly in data space without complex conversions.
 * 
 * How cursor sync works:
 * 1. Parent Plot component maintains shared state: sharedCursorX, sharedCursorVisible
 * 2. Each PlotCanvas receives sync props: sharedCursorX, onCursorXChange, sharedCursorVisible, onCursorVisibilityChange
 * 3. When cursor moves in Canvas A:
 *    - updateCrosshair() calculates position and updates webgl-plot lines directly
 *    - Updates coordinates via direct DOM manipulation (onCoordinateUpdate)
 *    - Calls onCursorXChange(dataX) to share X data coordinate with parent
 *    - Triggers webgl redraw via onRedrawNeeded() - no React re-render
 * 4. Parent updates sharedCursorX state, triggering props change in Canvas B
 * 5. Canvas B's useEffect detects sharedCursorX change and uses data coordinate directly
 * 6. onRedrawNeeded() forces webgl redraw to show the synchronized cursor
 * 
 * Key implementation details:
 * - X coordinates shared as data coordinates directly (no conversion)
 * - Y positions remain canvas-specific and independent
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
  plotLineRef: RefObject<UnifiedLinePlot | null>;
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
  // Canvas identification for dual mode
  canvasId?: 1 | 2;
}

export const useCrosshair = ({
  crosshairRef,
  snapCircleRef,
  canvasRef,
  plotLineRef,
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
  canvasId,
}: UseCrosshairProps) => {
  const [localShowCrosshair, setLocalShowCrosshair] = useState(false);
  const lastSyncedX = useRef<number | null>(null);
  const crosshairLinesInitialized = useRef<boolean>(false);
  
  // Get log axis state from store
  const isLogX = useAppStore((state) => state.isLogX);
  const isLogY = useAppStore((state) => {
    if (canvasId === 1) {
      return state.isLogY1;
    } else if (canvasId === 2) {
      return state.isLogY2;
    } else {
      return state.isLogY; // Single canvas mode
    }
  });
  
  // Use shared cursor visibility in both single and dual canvas modes
  const showCrosshair = sharedCursorVisible !== undefined ? sharedCursorVisible : localShowCrosshair;
  const setShowCrosshair = sharedCursorVisible !== undefined ? onCursorVisibilityChange! : setLocalShowCrosshair;
  const [crosshairSnapToLines, setCrosshairSnapToLines] = useState(false);

  /**
   * Convert mouse coordinates to data coordinates considering log spaces
   * Uses webgl-plot's enhanced coordinate-space aware API to handle log transformations
   */
  const convertMouseToDataCoordinates = (mouseNdcX: number, mouseNdcY: number) => {
    if (!plotLineRef.current) {
      // Fallback to manual calculation if plotLineRef is not available
      const axisScales = getAxisScales();
      return {
        dataX: (mouseNdcX - axisScales.offsetX) / axisScales.scaleX,
        dataY: (mouseNdcY - axisScales.offsetY) / axisScales.scaleY,
      };
    }

    // Get current data bounds with coordinate space information
    const bounds = plotLineRef.current.getDataBounds();
    if (!bounds) {
      // Fallback if bounds not available
      const axisScales = getAxisScales();
      return {
        dataX: (mouseNdcX - axisScales.offsetX) / axisScales.scaleX,
        dataY: (mouseNdcY - axisScales.offsetY) / axisScales.scaleY,
      };
    }

    // Convert NDC coordinates to data space using bounds
    // NDC coordinates are -1 to +1, convert to 0 to 1 range first
    const normalizedX = (mouseNdcX + 1) / 2; // Convert from [-1,1] to [0,1]
    const normalizedY = (mouseNdcY + 1) / 2; // Convert from [-1,1] to [0,1]

    // Interpolate within the data bounds
    const dataX = bounds.minX + normalizedX * (bounds.maxX - bounds.minX);
    const dataY = bounds.minY + normalizedY * (bounds.maxY - bounds.minY);

    return { dataX, dataY };
  };

  // Note: convertDataToDisplayCoordinates is now imported from coordinateUtils

  // Add/remove crosshair lines from webgl-plot based on showCrosshair state
  // Also re-initialize when switching between single/dual canvas modes
  useEffect(() => {
    if (crosshairRef.current) {
      if (showCrosshair) {
        // Add crosshair lines to webgl-plot
        const crosshairLines: LineConfig[] = [
          {
            points: new Float32Array([-1, 0, 1, 0]), // Horizontal line
            color: [0, 1, 0, 0.8], // Green with transparency
            thickness: LINE_THICKNESS.CROSSHAIR,
            enabled: true,
          },
          {
            points: new Float32Array([0, -1, 0, 1]), // Vertical line
            color: [0, 1, 0, 0.8], // Green with transparency
            thickness: LINE_THICKNESS.CROSSHAIR,
            enabled: true,
          },
        ];
        crosshairRef.current.initLines(crosshairLines);
        crosshairLinesInitialized.current = true;
      } else {
        // Remove all crosshair lines from webgl-plot
        crosshairRef.current.initLines([]);
        crosshairLinesInitialized.current = false;
      }
      
      // Also disable snap circle when crosshair is hidden
      if (snapCircleRef.current) {
        snapCircleRef.current.setPolygonEnabled(0, showCrosshair && crosshairSnapToLines);
      }
      
      // Use lightweight redraw for crosshair visibility changes
      if (onRedrawNeeded) {
        onRedrawNeeded();
      }
    }
  }, [showCrosshair, crosshairSnapToLines]);

  // Reset initialization flag when crosshairRef changes (canvas mode switch)
  // and trigger re-initialization if crosshair should be visible
  useEffect(() => {
    crosshairLinesInitialized.current = false;
    
    // If crosshair should be visible, trigger re-initialization
    if (showCrosshair && crosshairRef.current) {
      // Use a microtask to ensure the reset happens first
      Promise.resolve().then(() => {
        if (crosshairRef.current && showCrosshair) {
          const crosshairLines: LineConfig[] = [
            {
              points: new Float32Array([-1, 0, 1, 0]), // Horizontal line
              color: [0, 1, 0, 0.8], // Green with transparency
              thickness: LINE_THICKNESS.CROSSHAIR,
              enabled: true,
            },
            {
              points: new Float32Array([0, -1, 0, 1]), // Vertical line
              color: [0, 1, 0, 0.8], // Green with transparency
              thickness: LINE_THICKNESS.CROSSHAIR,
              enabled: true,
            },
          ];
          crosshairRef.current.initLines(crosshairLines);
          crosshairLinesInitialized.current = true;
          
          if (onRedrawNeeded) {
            onRedrawNeeded();
          }
        }
      });
    }
  }, [crosshairRef.current]);
  
  // Store crosshair coordinates in ref to avoid React re-renders
  const crosshairCoordsRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Dual canvas cursor synchronization: sync vertical crosshair to shared X coordinate
  useEffect(() => {
    // PROTECTION: Skip sync if no variables are selected - prevents invalid axis scale issues
    if (selectedVariables.length === 0) {
      return;
    }
    
    if (sharedCursorX !== null && sharedCursorX !== undefined && crosshairRef.current && showCrosshair && crosshairLinesInitialized.current && sharedCursorX !== lastSyncedX.current) {
      lastSyncedX.current = sharedCursorX;
      
      // SIMPLIFIED: Use shared data coordinate directly since X-axis scales are identical
      // The incoming sharedCursorX is already in the correct data coordinate space
      const dataSpaceX = sharedCursorX;
      
      const currentAxisScales = getAxisScales();
      
      // CRITICAL FIX: Handle invalid axis scales during sync (same as main crosshair logic)
      const hasValidScales = !(currentAxisScales.scaleX === 1 && currentAxisScales.scaleY === 1 && 
                              currentAxisScales.offsetX === -1 && currentAxisScales.offsetY === -1);

      let sharedNdcX: number;
      if (hasValidScales) {
        // Use normal coordinate conversion when scales are valid
        sharedNdcX = dataSpaceX * currentAxisScales.scaleX + currentAxisScales.offsetX;
      } else {
        // When axis scales are invalid, estimate NDC position based on canvas bounds
        // This provides approximate positioning until valid scales are available
        if (canvasRef.current) {
          const rect = canvasRef.current.getBoundingClientRect();
          // Estimate mouse position for the shared X coordinate (approximate center)
          const estimatedMouseX = rect.width * 0.5; // Use center as fallback
          sharedNdcX = (estimatedMouseX / rect.width) * 2 - 1;
        } else {
          sharedNdcX = 0; // Fallback to center
        }
      }
      
      // Update vertical line to shared X position (lines are guaranteed to be initialized)
      const verticalPoints = new Float32Array([sharedNdcX, -1, sharedNdcX, 1]);
      crosshairRef.current.updateLinePoints(1, verticalPoints);
      
      // Use lightweight redraw for cursor sync
      if (onRedrawNeeded) {
        onRedrawNeeded();
      }
    }
  }, [sharedCursorX, showCrosshair, isLogX, selectedVariables.length]);

  // Update crosshair position - can snap to nearest plot line or move freely
  const updateCrosshair = (mouseX: number, mouseY: number) => {
    if (!crosshairRef.current || !canvasRef.current || !showCrosshair || !crosshairLinesInitialized.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    // Convert mouse coordinates to normalized device coordinates [-1, 1]
    const mouseNdcX = (mouseX / rect.width) * 2 - 1;
    const mouseNdcY = -((mouseY / rect.height) * 2 - 1); // Flip Y coordinate

    // CRITICAL FIX: Check if axis scales are valid/meaningful
    // Default/invalid scales have offsetX=-1, offsetY=-1 which breaks coordinate conversion
    const currentAxisScales = getAxisScales();
    const hasValidScales = !(currentAxisScales.scaleX === 1 && currentAxisScales.scaleY === 1 && 
                            currentAxisScales.offsetX === -1 && currentAxisScales.offsetY === -1);

    if (!hasValidScales) {
      // Use direct NDC coordinates for positioning when axis scales are invalid
      const horizontalPoints = new Float32Array([-1, mouseNdcY, 1, mouseNdcY]);
      const verticalPoints = new Float32Array([mouseNdcX, -1, mouseNdcX, 1]);
      
      crosshairRef.current.updateLinePoints(0, horizontalPoints);
      crosshairRef.current.updateLinePoints(1, verticalPoints);
      
      // Update snap circle if in snap mode
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
          [mouseNdcX, mouseNdcY]
        );
        
        snapCircleRef.current.setPolygonEnabled(0, showCrosshair && crosshairSnapToLines);
      }

      // Use lightweight redraw for crosshair movement
      if (onRedrawNeeded) {
        onRedrawNeeded();
      }
      return;
    }

    let finalDataX, finalDataY;

    if (
      crosshairSnapToLines &&
      results.length &&
      selectedVariables.length > 0
    ) {
      // SNAP TO LINES MODE: Find the closest point on any visible line
      // Use new coordinate conversion that handles log spaces
      const { dataX: mouseDataX, dataY: mouseDataY } = convertMouseToDataCoordinates(mouseNdcX, mouseNdcY);

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
      // Use new coordinate conversion that handles log spaces
      const { dataX: mouseDataX, dataY: mouseDataY } = convertMouseToDataCoordinates(mouseNdcX, mouseNdcY);
      finalDataX = mouseDataX;
      finalDataY = mouseDataY;
    }

    // Update crosshair coordinates in ref (no React re-render)
    crosshairCoordsRef.current = { x: finalDataX, y: finalDataY };

    // Convert to display coordinates for coordinate callback (handles log to linear conversion)
    if (onCoordinateUpdate) {
      const { displayX, displayY } = convertDataToDisplayCoordinates(finalDataX, finalDataY, isLogX, isLogY);
      onCoordinateUpdate(displayX, displayY);
    }

    // Convert to NDC coordinates for rendering
    const axisScales = getAxisScales();
    const finalNdcX = finalDataX * axisScales.scaleX + axisScales.offsetX;
    const finalNdcY = finalDataY * axisScales.scaleY + axisScales.offsetY;

    // Create horizontal and vertical lines
    const horizontalPoints = new Float32Array([-1, finalNdcY, 1, finalNdcY]);
    const verticalPoints = new Float32Array([finalNdcX, -1, finalNdcX, 1]);

    // Update crosshair lines (lines are guaranteed to be initialized)
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
    // SIMPLIFIED: Share data coordinate directly since X-axis scales are identical between canvases
    // PROTECTION: Only share coordinates if this canvas has selected variables
    if (onCursorXChange && selectedVariables.length > 0) {
      // Share data coordinate directly - no conversion needed since X-axis scales are identical
      onCursorXChange(finalDataX);
    }

    // Use lightweight redraw for crosshair movement - no need to clear canvas and redraw all lines
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