import React, { JSX, useEffect, useRef, useState } from "react";
import { initCanvas, MessageToMain } from "eecircuit-schematic";

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
