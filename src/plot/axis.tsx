import React, { JSX, useEffect, useRef, useState } from "react";
import { unitConvert2string } from "./unitConverter.ts";

type AxisType = {
  scale: number;
  offset: number;
  yHeight: string;
  axis: "x" | "y";
  theme?: "light" | "dark";
};

type CanvasSize = {
  width: number;
  height: number;
};

const Axis = ({
  scale,
  offset,
  yHeight,
  axis,
  theme = "dark",
}: AxisType): JSX.Element => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ctx, setCtx] = useState<CanvasRenderingContext2D>();
  const [canvasSize, setCanvasSize] = useState<CanvasSize>({
    width: 0,
    height: 0,
  });

  useEffect(() => {
    const canvas = canvasRef.current;

    if (canvas) {
      const setupCanvas = () => {
        const devicePixelRatio = window.devicePixelRatio || 1;

        // Check if canvas has proper dimensions
        if (canvas.clientWidth === 0 || canvas.clientHeight === 0) {
          console.log("Canvas dimensions not ready, skipping setup");
          return;
        }

        canvas.width = canvas.clientWidth * devicePixelRatio;
        canvas.height = canvas.clientHeight * devicePixelRatio;

        setCanvasSize({ width: canvas.width, height: canvas.height });

        const ctx2d = canvas.getContext("2d");
        if (ctx2d) {
          const rootFontSize = parseFloat(
            getComputedStyle(document.documentElement).fontSize
          );
          console.log("rootFontSize->", rootFontSize);
          const scaleFactor = window.devicePixelRatio || 1;
          const fontSize = 0.85 * rootFontSize * scaleFactor;
          ctx2d.font = `${fontSize}px Courier New`;
          ctx2d.fillStyle = theme === "light" ? "black" : "white";
          ctx2d.strokeStyle = theme === "light" ? "black" : "white";

          setCtx(ctx2d);

          // Draw after context is fully configured
          if (axis === "x") {
            updateX(ctx2d, canvas.width, canvas.height);
          } else {
            updateY(ctx2d, canvas.width, canvas.height);
          }
        }
        console.log("Visual size:", {
          width: canvas.clientWidth,
          height: canvas.clientHeight,
        });
        console.log("Buffer size:", {
          width: canvas.width,
          height: canvas.height,
        });
      };

      // Set up ResizeObserver to handle dimension changes
      const resizeObserver = new ResizeObserver(() => {
        setupCanvas();
      });

      resizeObserver.observe(canvas);

      // Initial setup
      setupCanvas();

      return () => {
        resizeObserver.disconnect();
      };
    }
  }, [canvasRef, theme, yHeight]);

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

  // Handle canvas resize when yHeight changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas && ctx) {
      const devicePixelRatio = window.devicePixelRatio || 1;
      const newWidth = canvas.clientWidth * devicePixelRatio;
      const newHeight = canvas.clientHeight * devicePixelRatio;

      // Only update if dimensions actually changed
      if (newWidth !== canvasSize.width || newHeight !== canvasSize.height) {
        canvas.width = newWidth;
        canvas.height = newHeight;
        setCanvasSize({ width: newWidth, height: newHeight });

        // Redraw with new dimensions
        if (axis === "x") {
          updateX(ctx, newWidth, newHeight);
        } else {
          updateY(ctx, newWidth, newHeight);
        }
      }
    }
  }, [yHeight, ctx, axis, canvasSize.width, canvasSize.height]);

  const updateX = (
    ctx2d: CanvasRenderingContext2D,
    width: number,
    height: number
  ) => {
    // Clear the canvas
    ctx2d.clearRect(0, 0, width, height);

    // Ensure context styling is set
    const rootFontSize = parseFloat(
      getComputedStyle(document.documentElement).fontSize
    );
    const scaleFactor = window.devicePixelRatio || 1;
    const fontSize = 0.85 * rootFontSize * scaleFactor;
    ctx2d.font = `${fontSize}px Courier New`;
    ctx2d.fillStyle = theme === "light" ? "black" : "white";
    ctx2d.strokeStyle = theme === "light" ? "black" : "white";

    ctx2d.beginPath();

    // Calculate minimum spacing needed for text to avoid overlap
    const sampleText = unitConvert2string(0, 2);
    const textMetrics = ctx2d.measureText(sampleText);
    const textWidth = textMetrics.width;
    const minSpacing = textWidth + 10;

    // Determine how many ticks we can actually fit
    const maxTicks = Math.max(2, Math.floor(width / minSpacing));
    const actualTicks = Math.min(6, maxTicks);

    for (let i = 0; i < actualTicks; i++) {
      const midpoint = -(offset - (i / (actualTicks - 1)) * 2 + 1) / scale;
      const x = (i / (actualTicks - 1)) * width;

      // Center the text horizontally at each tick position
      const textX = Math.max(textWidth / 2, Math.min(width - textWidth / 2, x));

      ctx2d.fillText(
        unitConvert2string(midpoint, 2),
        textX - textWidth / 2,
        15 * (window.devicePixelRatio || 1)
      );

      ctx2d.moveTo(x, 0);
      ctx2d.lineTo(x, 10);
    }
    ctx2d.stroke();
  };

  const updateY = (
    ctx2d: CanvasRenderingContext2D,
    width: number,
    height: number
  ) => {
    // Clear the canvas
    ctx2d.clearRect(0, 0, width, height);

    // Ensure context styling is set
    const rootFontSize = parseFloat(
      getComputedStyle(document.documentElement).fontSize
    );
    const scaleFactor = window.devicePixelRatio || 1;
    const fontSize = 0.85 * rootFontSize * scaleFactor;
    ctx2d.font = `${fontSize}px Courier New`;
    ctx2d.fillStyle = theme === "light" ? "black" : "white";
    ctx2d.strokeStyle = theme === "light" ? "black" : "white";

    ctx2d.beginPath();
    for (let i = 0; i < 6; i++) {
      const midpoint = -(offset + i / 3 - 1) / scale;
      const y = (i / 6) * height;

      ctx2d.fillText(
        unitConvert2string(midpoint, 2),
        5 * (window.devicePixelRatio || 1),
        y
      );
      ctx2d.moveTo(width - 10, y);
      ctx2d.lineTo(width, y);
    }
    ctx2d.stroke();
  };

  return (
    <canvas
      style={{
        width: axis === "x" ? "100%" : "5em",
        height: axis === "x" ? "1.5em" : yHeight,
        backgroundColor: "transparent",
      }}
      ref={canvasRef}
    />
  );
};

export default Axis;
