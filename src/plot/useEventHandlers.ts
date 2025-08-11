import { useEffect, useState, RefObject } from "react";
import { ZoomController } from "./zoomController";

interface UseEventHandlersProps {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  zoomController: RefObject<ZoomController>;
  isCanvasInitialized: boolean;
  selectedVariables: string[];
  inputProfile: string;
  handleZoomAtCursor: (mouseX: number, mouseY: number, zoomIn: boolean) => void;
  handleHorizontalScroll: (deltaX: number) => void;
  resetZoom: () => void;
}

export const useEventHandlers = ({
  canvasRef,
  zoomController,
  isCanvasInitialized,
  selectedVariables,
  inputProfile,
  handleZoomAtCursor,
  handleHorizontalScroll,
  resetZoom,
}: UseEventHandlersProps) => {
  // Touch gesture state for pinch, zoom, and pan
  const [touchState, setTouchState] = useState<{
    initialDistance: number | null;
    initialTouchX: number;
    initialTouchY: number;
    isPanning: boolean;
    lastPanX: number;
    lastTapTime: number;
    tapCount: number;
  }>({
    initialDistance: null,
    initialTouchX: 0,
    initialTouchY: 0,
    isPanning: false,
    lastPanX: 0,
    lastTapTime: 0,
    tapCount: 0,
  });

  // Add touch event listeners for pinch and zoom in touchscreen mode
  useEffect(() => {
    if (!canvasRef.current || inputProfile !== "touchscreen") return;

    const canvas = canvasRef.current;

    const getTouchDistance = (touch1: Touch, touch2: Touch) => {
      const dx = touch1.clientX - touch2.clientX;
      const dy = touch1.clientY - touch2.clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const getTouchCenter = (touch1: Touch, touch2: Touch) => {
      const rect = canvas.getBoundingClientRect();
      const centerX = (touch1.clientX + touch2.clientX) / 2 - rect.left;
      const centerY = (touch1.clientY + touch2.clientY) / 2 - rect.top;
      return { x: centerX, y: centerY };
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const touch0 = e.touches[0];
        const touch1 = e.touches[1];
        if (!touch0 || !touch1) return;

        const distance = getTouchDistance(touch0, touch1);
        const center = getTouchCenter(touch0, touch1);
        setTouchState({
          initialDistance: distance,
          initialTouchX: center.x,
          initialTouchY: center.y,
          isPanning: false,
          lastPanX: center.x,
          lastTapTime: touchState.lastTapTime,
          tapCount: touchState.tapCount,
        });
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && touchState.initialDistance !== null) {
        e.preventDefault();
        const touch0 = e.touches[0];
        const touch1 = e.touches[1];
        if (!touch0 || !touch1) return;

        const currentDistance = getTouchDistance(touch0, touch1);
        const center = getTouchCenter(touch0, touch1);

        // Calculate distance and horizontal movement changes
        const distanceRatio = currentDistance / touchState.initialDistance;
        const horizontalMovement = Math.abs(center.x - touchState.initialTouchX);
        const distanceChange = Math.abs(distanceRatio - 1);

        // Determine gesture type: if horizontal movement is significant and distance change is minimal, it's panning
        const isHorizontalPan = horizontalMovement > 10 && distanceChange < 0.1;

        if (isHorizontalPan && zoomController.current?.isZoomedIn()) {
          // Two-finger horizontal pan when zoomed in - use scroll-based panning like trackpad
          if (!touchState.isPanning) {
            // Start panning mode
            setTouchState((prev) => ({
              ...prev,
              isPanning: true,
              lastPanX: center.x,
            }));
          } else {
            // Calculate horizontal movement delta and apply as scroll
            const deltaX = center.x - touchState.lastPanX;
            // Convert pixel delta to scroll units (higher sensitivity for touch)
            const scrollDelta = deltaX * 0.05; // Increased sensitivity for touch input

            handleHorizontalScroll(-scrollDelta); // Negative to match trackpad behavior

            // Update last position for next delta calculation
            setTouchState((prev) => ({
              ...prev,
              lastPanX: center.x,
            }));
          }
        } else if (distanceChange > 0.05) {
          // Pinch to zoom if there's significant distance change
          const zoomIn = distanceRatio > 1;
          handleZoomAtCursor(center.x, center.y, zoomIn);

          // Update the reference distance for next calculation
          setTouchState((prev) => ({
            ...prev,
            initialDistance: currentDistance,
          }));
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        const currentTime = Date.now();
        const timeSinceLastTap = currentTime - touchState.lastTapTime;
        
        // Check for single finger tap (double-tap detection)
        if (e.changedTouches.length === 1 && !touchState.isPanning && touchState.initialDistance === null) {
          if (timeSinceLastTap < 300 && touchState.tapCount === 1) {
            // Double-tap detected - reset zoom
            resetZoom();
            setTouchState({
              initialDistance: null,
              initialTouchX: 0,
              initialTouchY: 0,
              isPanning: false,
              lastPanX: 0,
              lastTapTime: 0,
              tapCount: 0,
            });
          } else {
            // First tap or too long since last tap
            setTouchState({
              initialDistance: null,
              initialTouchX: 0,
              initialTouchY: 0,
              isPanning: false,
              lastPanX: 0,
              lastTapTime: currentTime,
              tapCount: 1,
            });
          }
        } else {
          // Reset touch state for multi-touch gestures or after panning
          setTouchState({
            initialDistance: null,
            initialTouchX: 0,
            initialTouchY: 0,
            isPanning: false,
            lastPanX: 0,
            lastTapTime: touchState.lastTapTime,
            tapCount: touchState.tapCount,
          });
        }
      }
    };

    canvas.addEventListener("touchstart", handleTouchStart, { passive: false });
    canvas.addEventListener("touchmove", handleTouchMove, { passive: false });
    canvas.addEventListener("touchend", handleTouchEnd, { passive: false });

    return () => {
      canvas.removeEventListener("touchstart", handleTouchStart);
      canvas.removeEventListener("touchmove", handleTouchMove);
      canvas.removeEventListener("touchend", handleTouchEnd);
    };
  }, [
    isCanvasInitialized,
    selectedVariables,
    inputProfile,
    touchState.initialDistance,
    touchState.isPanning,
    touchState.lastPanX,
    touchState.lastTapTime,
    touchState.tapCount,
    resetZoom,
  ]);

  // Add native wheel event listener to properly handle preventDefault
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;

    const handleWheel = (e: WheelEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Handle different input profiles
      if (inputProfile === "trackpad") {
        // Trackpad mode: ctrl+wheel for zoom
        if (e.ctrlKey) {
          e.preventDefault();
          const zoomIn = e.deltaY < 0;
          handleZoomAtCursor(mouseX, mouseY, zoomIn);
          return;
        }
        // Regular trackpad scroll for panning when zoomed in
        if (zoomController.current?.isZoomedIn()) {
          e.preventDefault();
          let deltaX = e.deltaX;
          if (Math.abs(deltaX) < Math.abs(e.deltaY) && e.shiftKey) {
            deltaX = e.deltaY;
          }
          if (Math.abs(deltaX) > 0) {
            const normalizedDelta = deltaX > 0 ? 1 : -1;
            handleHorizontalScroll(normalizedDelta);
          }
        }
      } else if (inputProfile === "mouse") {
        // Mouse mode: shift+wheel for zoom, regular wheel for panning
        if (e.shiftKey) {
          e.preventDefault();
          const zoomIn = e.deltaY < 0;
          handleZoomAtCursor(mouseX, mouseY, zoomIn);
        } else if (zoomController.current?.isZoomedIn()) {
          // Regular mouse wheel for panning when zoomed in
          e.preventDefault();
          let deltaX = e.deltaX;
          if (Math.abs(deltaX) < Math.abs(e.deltaY)) {
            deltaX = e.deltaY;
          }
          if (Math.abs(deltaX) > 0) {
            const normalizedDelta = deltaX > 0 ? 1 : -1;
            handleHorizontalScroll(normalizedDelta);
          }
        }
      } else if (inputProfile === "touchscreen") {
        // Touchscreen mode: handle pinch and zoom (via wheel events)
        if (e.ctrlKey) {
          // Pinch gesture often translates to ctrl+wheel
          e.preventDefault();
          const zoomIn = e.deltaY < 0;
          handleZoomAtCursor(mouseX, mouseY, zoomIn);
          return;
        }
        // Regular scroll for panning when zoomed in
        if (zoomController.current?.isZoomedIn()) {
          e.preventDefault();
          let deltaX = e.deltaX;
          if (Math.abs(deltaX) < Math.abs(e.deltaY) && e.shiftKey) {
            deltaX = e.deltaY;
          }
          if (Math.abs(deltaX) > 0) {
            const normalizedDelta = deltaX > 0 ? 1 : -1;
            handleHorizontalScroll(normalizedDelta);
          }
        }
      }
    };

    // Add the wheel event listener with passive: false to allow preventDefault
    canvas.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      canvas.removeEventListener("wheel", handleWheel);
    };
  }, [isCanvasInitialized, selectedVariables, inputProfile]); // Re-add listener when canvas is re-initialized, selectedVariables change, or input profile changes

  return {
    touchState,
  };
};