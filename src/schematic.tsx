"use client";
import React, { JSX, useEffect, useRef } from "react";
import { initCanvas } from "eecircuit-schematic";

function Schematic(): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      console.log("Canvas ref is set:", canvasRef.current);
      initCanvas(canvasRef.current);
    }
  }, [canvasRef]);

  return <canvas ref={canvasRef} width={850} height={650} />;
}

export default Schematic;
