import type { ReactJSXElement } from "@emotion/react/types/jsx-namespace";
import React, { useState, useEffect, useRef } from "react";

const Axis = (): JSX.Element => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const devicePixelRatio = window.devicePixelRatio || 1;
    if (canvas) {
      const devicePixelRatio = window.devicePixelRatio || 1;
      canvas.width = canvas.clientWidth * devicePixelRatio;
      canvas.height = canvas.clientHeight * devicePixelRatio;

      const ctx = canvas?.getContext("2d");

      const rect = canvas?.getBoundingClientRect();
      console.log("axis->", rect);
      if (ctx) {
        ctx.font = "16px serif";
        ctx.fillText("1234", 60, 15);
        //ctx.fillRect(10, 10, 100, 100);
        ctx.moveTo(60, 0);
        ctx.lineTo(60, 10);
        ctx.stroke();
      }
    }
  }, [canvasRef]);

  return <canvas style={{ height: "1.5em", width: "100%" }} ref={canvasRef} />;
};

export default Axis;
