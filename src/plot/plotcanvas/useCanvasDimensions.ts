import { useEffect, RefObject } from "react";
import { UnifiedLinePlot, updateViewport } from "webgl-plot";

interface UseCanvasDimensionsProps {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  glRef: RefObject<WebGL2RenderingContext | null>;
  plotLineRef: RefObject<UnifiedLinePlot | null>;
  isCanvasInitialized: boolean;
  calculateAndApplyScaling: () => void;
}

export const useCanvasDimensions = ({
  canvasRef,
  glRef,
  plotLineRef,
  isCanvasInitialized,
  calculateAndApplyScaling,
}: UseCanvasDimensionsProps) => {
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
          if (glRef.current) {
            updateViewport(glRef.current, canvas);
          }

          // Force recalculation of scaling and redraw with new aspect ratio
          if (glRef.current && plotLineRef.current) {
            calculateAndApplyScaling();

            console.log("I am here 4 !")
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
          if (glRef.current && plotLineRef.current) {
            calculateAndApplyScaling();

            console.log("I am here 3 !")
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
};
