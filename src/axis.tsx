import type { ReactJSXElement } from "@emotion/react/types/jsx-namespace";
import React, { useState, useEffect, useRef } from "react";

type AxisType = {
  scale: number;
  offset: number;
};

type CanvasSize = {
  width: number;
  height: number;
};

let ctx: CanvasRenderingContext2D | null;

const Axis = ({ scale, offset }: AxisType): JSX.Element => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [canvasSize, setCanvasSize] = useState<CanvasSize>({ width: 0, height: 0 });

  console.log("axis->", scale, ", ", offset);
  //console.log("axis->", midpoint);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (canvas) {
      const devicePixelRatio = window.devicePixelRatio || 1;
      canvas.width = canvas.clientWidth * devicePixelRatio;
      canvas.height = canvas.clientHeight * devicePixelRatio;

      setCanvasSize({ width: canvas.width, height: canvas.height });

      ctx = canvas?.getContext("2d");

      const rect = canvas?.getBoundingClientRect();
      console.log("axis->", rect);
    }
  }, [canvasRef]);

  useEffect(() => {
    if (ctx) {
      const midpoint = -offset / scale;
      ctx.clearRect(0, 0, canvasSize.width, canvasSize.height);
      ctx.font = "16px serif";
      ctx.fillText(midpoint.toExponential(2), canvasSize.width / 2, 15);
      //ctx.fillRect(10, 10, 100, 100);
      ctx.moveTo(canvasSize.width / 2, 0);
      ctx.lineTo(canvasSize.width / 2, 10);
      ctx.stroke();
    }
  }, [scale, offset]);

  return <canvas style={{ height: "1.5em", width: "100%" }} ref={canvasRef} />;
};

export default Axis;
