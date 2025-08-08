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
}

export const useEventHandlers = ({
  canvasRef,
  zoomController,
  isCanvasInitialized,
  selectedVariables,
  inputProfile,
  handleZoomAtCursor,
  handleHorizontalScroll,
}: UseEventHandlersProps) => {
  // Touch gesture state for pinch and zoom
  const [touchState, setTouchState] = useState<{
    initialDistance: number | null;
    initialTouchX: number;
    initialTouchY: number;
  }>({
    initialDistance: null,
    initialTouchX: 0,
    initialTouchY: 0,
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

        // Calculate zoom based on distance change
        const distanceRatio = currentDistance / touchState.initialDistance;

        // Only trigger zoom if there's significant change (> 5% for smoother touch experience)
        if (Math.abs(distanceRatio - 1) > 0.05) {
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
        setTouchState({
          initialDistance: null,
          initialTouchX: 0,
          initialTouchY: 0,
        });
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
        // Mouse mode: mouse wheel for zoom
        e.preventDefault();
        const zoomIn = e.deltaY < 0;
        handleZoomAtCursor(mouseX, mouseY, zoomIn);
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