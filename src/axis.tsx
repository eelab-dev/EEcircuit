import React, { useState, useEffect, useRef } from "react";
import { unitConvert2string } from "./sim/unitConverter";

type AxisType = {
  scale: number;
  offset: number;
  yHeight: string;
  axis: "x" | "y";
};

type CanvasSize = {
  width: number;
  height: number;
};

//let ctx: CanvasRenderingContext2D | null;

const Axis = ({ scale, offset, yHeight, axis }: AxisType): JSX.Element => {
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
        ctx2d.font = "16px Courier New";
        ctx2d.fillStyle = "white";
        ctx2d.strokeStyle = "white";
        axis == "x"
          ? updateX(ctx2d, canvas.width, canvas.height)
          : updateY(ctx2d, canvas.width, canvas.height);
      }

      //const rect = canvas?.getBoundingClientRect();
      //console.log("axis->", rect);
    }
  }, [canvasRef]);

  useEffect(() => {
    if (ctx && axis == "x") {
      updateX(ctx, canvasSize.width, canvasSize.height);
    }
  }, [scale, offset]);

  useEffect(() => {
    if (ctx && axis == "y") {
      updateY(ctx, canvasSize.width, canvasSize.height);
    }
  }, [scale, offset]);

  const updateX = (ctx2d: CanvasRenderingContext2D, width: number, height: number) => {
    ctx2d.clearRect(0, 0, width, height);

    for (let i = 0; i < 6; i++) {
      const midpoint = -(offset - i / 3 + 1) / scale;
      const x = (i / 6) * width;

      ctx2d.fillText(unitConvert2string(midpoint, 2), x, 15);
      //ctx.fillRect(10, 10, 100, 100);
      ctx2d.moveTo(x, 0);
      ctx2d.lineTo(x, 10);
      ctx2d.stroke();
    }
  };

  const updateY = (ctx2d: CanvasRenderingContext2D, width: number, height: number) => {
    //console.log("yaxis->", canvasSize);
    ctx2d.clearRect(0, 0, width, height);
    for (let i = 0; i < 6; i++) {
      const midpoint = -(offset + i / 3 - 1) / scale;
      const y = (i / 6) * height;

      ctx2d.fillText(unitConvert2string(midpoint, 2), 5, y);
      //ctx.fillRect(10, 10, 100, 100);
      ctx2d.moveTo(width - 10, y);
      ctx2d.lineTo(width, y);
      ctx2d.stroke();
    }
  };

  return (
    <canvas
      style={{
        width: `${axis == "x" ? "100%" : "5em"}`,
        height: `${axis == "x" ? "1.5em" : yHeight}`,
      }}
      ref={canvasRef}
    />
  );
};

export default Axis;
