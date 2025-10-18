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
  // Touch gesture state for separate single-finger pan and two-finger zoom
  const [touchState, setTouchState] = useState<{
    // Two-finger zoom state
    initialDistance: number | null;
    initialZoomCenter: { x: number; y: number } | null;
    isZooming: boolean;
    accumulatedZoomFactor: number;
    
    // Single-finger pan state
    singleFingerStart: { x: number; y: number } | null;
    isPanning: boolean;
    lastPanX: number;
    
    // Tap detection
    lastTapTime: number;
    tapCount: number;
  }>({
    // Two-finger zoom state
    initialDistance: null,
    initialZoomCenter: null,
    isZooming: false,
    accumulatedZoomFactor: 1.0,
    
    // Single-finger pan state
    singleFingerStart: null,
    isPanning: false,
    lastPanX: 0,
    
    // Tap detection
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
      if (e.touches.length === 1) {
        // Single finger - prepare for potential panning (only when zoomed in)
        if (zoomController.current?.isZoomedIn()) {
          const touch = e.touches[0];
          if (!touch) return;
          
          const rect = canvas.getBoundingClientRect();
          const touchX = touch.clientX - rect.left;
          const touchY = touch.clientY - rect.top;
          
          setTouchState(prev => ({
            ...prev,
            singleFingerStart: { x: touchX, y: touchY },
            isPanning: false,
            lastPanX: touchX,
          }));
        }
      } else if (e.touches.length === 2) {
        // Two fingers - start zoom gesture
        e.preventDefault();
        const touch0 = e.touches[0];
        const touch1 = e.touches[1];
        if (!touch0 || !touch1) return;

        const distance = getTouchDistance(touch0, touch1);
        const center = getTouchCenter(touch0, touch1);
        
        setTouchState(prev => ({
          ...prev,
          initialDistance: distance,
          initialZoomCenter: { x: center.x, y: center.y },
          isZooming: false,
          accumulatedZoomFactor: 1.0,
          // Clear any single-finger state
          singleFingerStart: null,
          isPanning: false,
        }));
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 1 && touchState.singleFingerStart && zoomController.current?.isZoomedIn()) {
        // Single finger panning (only when zoomed in)
        const touch = e.touches[0];
        if (!touch) return;
        
        const rect = canvas.getBoundingClientRect();
        const touchX = touch.clientX - rect.left;
        const touchY = touch.clientY - rect.top;
        
        const deltaX = touchX - touchState.singleFingerStart.x;
        const deltaY = touchY - touchState.singleFingerStart.y;
        
        // Check if horizontal movement is dominant (for panning)
        if (Math.abs(deltaX) > 10 && Math.abs(deltaX) > Math.abs(deltaY)) {
          e.preventDefault(); // Prevent scrolling
          
          if (!touchState.isPanning) {
            // Start panning
            setTouchState(prev => ({
              ...prev,
              isPanning: true,
              lastPanX: touchX,
            }));
          } else {
            // Continue panning
            const panDelta = touchX - touchState.lastPanX;
            const scrollDelta = panDelta * 0.1; // Responsive pan sensitivity
            handleHorizontalScroll(-scrollDelta);
            
            setTouchState(prev => ({
              ...prev,
              lastPanX: touchX,
            }));
          }
        }
      } else if (e.touches.length === 2 && touchState.initialDistance !== null && touchState.initialZoomCenter !== null) {
        // Two finger pinch zoom
        e.preventDefault();
        const touch0 = e.touches[0];
        const touch1 = e.touches[1];
        if (!touch0 || !touch1) return;

        const currentDistance = getTouchDistance(touch0, touch1);
        const center = getTouchCenter(touch0, touch1);

        // Calculate zoom factor from distance change
        const distanceRatio = currentDistance / touchState.initialDistance;
        const zoomFactor = distanceRatio / touchState.accumulatedZoomFactor;
        
        // Apply smooth zoom with moderate sensitivity
        if (Math.abs(zoomFactor - 1) > 0.02) { // Reasonable threshold
          const steps = Math.max(1, Math.min(3, Math.floor(Math.abs(zoomFactor - 1) * 12)));
          const stepSize = zoomFactor > 1 ? 1.04 : 0.96; // Smooth zoom steps
          
          for (let i = 0; i < steps; i++) {
            handleZoomAtCursor(center.x, center.y, stepSize > 1);
          }
          
          // Update accumulated zoom factor
          setTouchState(prev => ({
            ...prev,
            accumulatedZoomFactor: distanceRatio,
            isZooming: true,
          }));
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const currentTime = Date.now();
      const timeSinceLastTap = currentTime - touchState.lastTapTime;
      
      if (e.touches.length === 0) {
        // All fingers lifted - check for double-tap or reset state
        if (e.changedTouches.length === 1 && !touchState.isPanning && !touchState.isZooming && touchState.initialDistance === null) {
          if (timeSinceLastTap < 300 && touchState.tapCount === 1) {
            // Double-tap detected - reset zoom
            resetZoom();
            setTouchState({
              // Two-finger zoom state
              initialDistance: null,
              initialZoomCenter: null,
              isZooming: false,
              accumulatedZoomFactor: 1.0,
              
              // Single-finger pan state
              singleFingerStart: null,
              isPanning: false,
              lastPanX: 0,
              
              // Tap detection
              lastTapTime: 0,
              tapCount: 0,
            });
          } else {
            // First tap or too long since last tap
            setTouchState(prev => ({
              ...prev,
              // Clear gesture states
              singleFingerStart: null,
              isPanning: false,
              initialDistance: null,
              initialZoomCenter: null,
              isZooming: false,
              accumulatedZoomFactor: 1.0,
              // Update tap tracking
              lastTapTime: currentTime,
              tapCount: 1,
            }));
          }
        } else {
          // Reset all gesture states
          setTouchState(prev => ({
            ...prev,
            // Two-finger zoom state
            initialDistance: null,
            initialZoomCenter: null,
            isZooming: false,
            accumulatedZoomFactor: 1.0,
            
            // Single-finger pan state
            singleFingerStart: null,
            isPanning: false,
          }));
        }
      } else if (e.touches.length === 1) {
        // Went from 2 fingers to 1 - end zoom, potentially start pan
        if (touchState.isZooming) {
          setTouchState(prev => ({
            ...prev,
            // Clear zoom state
            initialDistance: null,
            initialZoomCenter: null,
            isZooming: false,
            accumulatedZoomFactor: 1.0,
            // Prepare for potential single-finger pan if zoomed in
            singleFingerStart: zoomController.current?.isZoomedIn() && e.touches[0] ? {
              x: e.touches[0].clientX - canvas.getBoundingClientRect().left,
              y: e.touches[0].clientY - canvas.getBoundingClientRect().top,
            } : null,
            isPanning: false,
          }));
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
    touchState.initialZoomCenter,
    touchState.isZooming,
    touchState.accumulatedZoomFactor,
    touchState.singleFingerStart,
    touchState.isPanning,
    touchState.lastPanX,
    touchState.lastTapTime,
    touchState.tapCount,
    resetZoom,
    canvasRef,
    handleHorizontalScroll,
    handleZoomAtCursor,
    zoomController,
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
  }, [
    isCanvasInitialized,
    selectedVariables,
    inputProfile,
    canvasRef,
    handleHorizontalScroll,
    handleZoomAtCursor,
    zoomController,
  ]); // Re-add listener when canvas is re-initialized, selectedVariables change, or input profile changes

  return {
    touchState,
  };
};
