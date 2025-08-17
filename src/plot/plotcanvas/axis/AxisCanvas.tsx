import React, { useRef, useImperativeHandle, forwardRef } from "react";
import { renderXAxis, renderYAxis, type AxisParams } from "./axisRenderer";

interface AxisCanvasProps {
  axis: "x" | "y";
}

export interface AxisCanvasRef {
  renderAxis: (params: Omit<AxisParams, "canvas">) => void;
}

const AxisCanvas = forwardRef<AxisCanvasRef, AxisCanvasProps>(({ axis }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useImperativeHandle(ref, () => ({
    renderAxis: (params: Omit<AxisParams, "canvas">) => {
      const canvas = canvasRef.current;
      if (!canvas || canvas.clientWidth === 0 || canvas.clientHeight === 0) return;

      const fullParams: AxisParams = { ...params, canvas };

      if (axis === "x") {
        renderXAxis(fullParams);
      } else {
        renderYAxis(fullParams);
      }
    },
  }));

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: axis === "x" ? "100%" : "5em",
        height: axis === "x" ? "1.5em" : "100%",
        backgroundColor: "transparent",
      }}
    />
  );
});

AxisCanvas.displayName = "AxisCanvas";

export default AxisCanvas;