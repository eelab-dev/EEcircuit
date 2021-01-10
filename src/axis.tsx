import type { ReactJSXElement } from "@emotion/react/types/jsx-namespace";
import React, { useState, useEffect, useRef } from "react";

type AxisType = {
  scale: number;
  offset: number;
  axis: "x" | "y";
};

type CanvasSize = {
  width: number;
  height: number;
};

//let ctx: CanvasRenderingContext2D | null;

const Axis = ({ scale, offset, axis }: AxisType): JSX.Element => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ctx, setCtx] = useState<CanvasRenderingContext2D>();
  const [canvasSize, setCanvasSize] = useState<CanvasSize>({ width: 0, height: 0 });

  //console.log("axis->", axis == "y");
  //console.log("axis->", midpoint);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (canvas) {
      const devicePixelRatio = window.devicePixelRatio || 1;
      canvas.width = canvas.clientWidth * devicePixelRatio;
      canvas.height = canvas.clientHeight * devicePixelRatio;

      setCanvasSize({ width: canvas.width, height: canvas.height });

      const ctx2d = canvas.getContext("2d");
      if (ctx2d) {
        setCtx(ctx2d);
      }

      const rect = canvas?.getBoundingClientRect();
      console.log("axis->", rect);
    }
  }, [canvasRef]);

  useEffect(() => {
    if (ctx && axis == "x") {
      ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);
      for (let i = 0; i < 6; i++) {
        const midpoint = -(offset - i / 3 + 1) / scale;
        const x = (i / 6) * canvasSize.width;

        ctx.font = "16px serif";
        ctx.fillText(midpoint.toExponential(2), x, 15);
        //ctx.fillRect(10, 10, 100, 100);
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 10);
        ctx.stroke();
      }
    }
  }, [scale, offset]);

  useEffect(() => {
    if (ctx && axis == "y") {
      console.log("yaxis->", canvasSize);
      ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);
      for (let i = 0; i < 6; i++) {
        const midpoint = -(offset + i / 3 - 1) / scale;
        const y = (i / 6) * canvasSize.height;

        ctx.font = "16px serif";
        ctx.fillText(midpoint.toExponential(2), 5, y);
        //ctx.fillRect(10, 10, 100, 100);
        ctx.moveTo(canvasSize.width - 10, y);
        ctx.lineTo(canvasSize.width, y);
        ctx.stroke();
      }
    }
  }, [scale, offset]);

  return (
    <canvas
      style={{
        width: `${axis == "x" ? "100%" : "4em"}`,
        height: `${axis == "x" ? "1.5em" : "60vh"}`,
      }}
      ref={canvasRef}
    />
  );
};

export default Axis;
