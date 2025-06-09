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

  // Function to generate nice tick intervals
  const getNiceTickInterval = (range: number, maxTicks: number): number => {
    if (range === 0) return 1;

    const roughInterval = range / (maxTicks - 1);
    const magnitude = Math.pow(
      10,
      Math.floor(Math.log10(Math.abs(roughInterval)))
    );
    const normalizedInterval = roughInterval / magnitude;

    let niceInterval: number;
    if (normalizedInterval <= 1) {
      niceInterval = 1;
    } else if (normalizedInterval <= 2) {
      niceInterval = 2;
    } else if (normalizedInterval <= 5) {
      niceInterval = 5;
    } else {
      niceInterval = 10;
    }

    return niceInterval * magnitude;
  };

  const generateNiceTicks = (
    min: number,
    max: number,
    maxTicks: number
  ): number[] => {
    const range = Math.abs(max - min);
    if (range === 0) return [min];

    const tickInterval = getNiceTickInterval(range, maxTicks);

    // Find the first tick that covers the range properly
    const startValue = Math.min(min, max);
    const endValue = Math.max(min, max);

    // Align first tick to a nice boundary
    const firstTick = Math.floor(startValue / tickInterval) * tickInterval;

    const ticks: number[] = [];
    let tick = firstTick;

    // Generate ticks from start to end
    while (tick <= endValue + tickInterval * 0.001 && ticks.length < maxTicks) {
      // Small epsilon for floating point
      if (tick >= startValue - tickInterval * 0.001) {
        // Include ticks slightly before start
        // Round to avoid floating point precision issues
        ticks.push(Math.round(tick / tickInterval) * tickInterval);
      }
      tick += tickInterval;
    }

    // Ensure we have at least 2 ticks
    if (ticks.length < 2) {
      return [startValue, endValue];
    }

    return ticks;
  };

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

    // Calculate the value range for the visible area
    // These calculations must match exactly with the plot canvas coordinate system
    // WebGL plot uses normalized coordinates from -1 to +1
    // The transformation is: normalizedCoord = (value * scale + offset)
    // So: value = (normalizedCoord - offset) / scale
    
    const leftValue = (-1 - offset) / scale;   // Value at left edge (normalized coord = -1)
    const rightValue = (1 - offset) / scale;   // Value at right edge (normalized coord = +1)
    const minValue = Math.min(leftValue, rightValue);
    const maxValue = Math.max(leftValue, rightValue);

    // Calculate minimum spacing needed for text to avoid overlap
    const sampleText = unitConvert2string(
      Math.abs(maxValue) > Math.abs(minValue) ? maxValue : minValue,
      2
    );
    const textMetrics = ctx2d.measureText(sampleText);
    const textWidth = textMetrics.width;
    const minSpacing = textWidth + 30; // Extra padding for readability

    // Determine how many ticks we can actually fit
    const maxTicks = Math.max(2, Math.floor(width / minSpacing));

    // Generate nice tick values
    const tickValues = generateNiceTicks(minValue, maxValue, maxTicks);

    // Sort tick values to ensure proper order
    tickValues.sort((a, b) => a - b);

    for (const tickValue of tickValues) {
      // Convert tick value back to x position using the exact same transformation as the plot
      // WebGL transformation: normalizedCoord = (value * scale + offset)
      // Canvas position: x = (normalizedCoord + 1) / 2 * width
      const normalizedCoord = tickValue * scale + offset;
      const x = (normalizedCoord + 1) / 2 * width;

      // Draw ticks at exact pixel positions (no tolerance needed for exact alignment)
      if (x >= 0 && x <= width) {
        const text = unitConvert2string(tickValue, 2);
        const currentTextMetrics = ctx2d.measureText(text);
        const currentTextWidth = currentTextMetrics.width;

        // Center the text horizontally at each tick position
        const textX = Math.max(
          currentTextWidth / 2,
          Math.min(width - currentTextWidth / 2, x)
        );

        ctx2d.fillText(
          text,
          textX - currentTextWidth / 2,
          15 * (window.devicePixelRatio || 1)
        );

        // Draw tick mark at exact position
        ctx2d.moveTo(x, 0);
        ctx2d.lineTo(x, 10);
      }
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

    // Calculate the value range for the visible area
    // These calculations must match exactly with the plot canvas coordinate system
    // WebGL plot uses normalized coordinates from -1 to +1
    // The transformation is: normalizedCoord = (value * scale + offset)
    // So: value = (normalizedCoord - offset) / scale
    
    const topValue = (-1 - offset) / scale;      // Value at top edge (normalized coord = -1)
    const bottomValue = (1 - offset) / scale;   // Value at bottom edge (normalized coord = +1)
    const minValue = Math.min(topValue, bottomValue);
    const maxValue = Math.max(topValue, bottomValue);

    // Calculate minimum spacing needed for text to avoid overlap
    const textHeight =
      0.85 *
      parseFloat(getComputedStyle(document.documentElement).fontSize) *
      (window.devicePixelRatio || 1);
    const minSpacing = textHeight + 15; // Extra padding for readability

    // Determine how many ticks we can actually fit
    const maxTicks = Math.max(2, Math.floor(height / minSpacing));

    // Generate nice tick values
    const tickValues = generateNiceTicks(minValue, maxValue, maxTicks);

    // Sort tick values to ensure proper order
    tickValues.sort((a, b) => a - b);

    for (const tickValue of tickValues) {
      // Convert tick value back to y position using the exact same transformation as the plot
      // WebGL transformation: normalizedCoord = (value * scale + offset)
      // Canvas position: y = (1 - normalizedCoord) / 2 * height (inverted Y for screen coordinates)
      const normalizedCoord = tickValue * scale + offset;
      const y = (1 - normalizedCoord) / 2 * height;

      // Draw ticks at exact pixel positions (no tolerance needed for exact alignment)
      if (y >= 0 && y <= height) {
        const text = unitConvert2string(tickValue, 2);

        ctx2d.fillText(
          text,
          5 * (window.devicePixelRatio || 1),
          y + textHeight / 3 // Offset text vertically to center it on the tick
        );
        
        // Draw tick mark at exact position
        ctx2d.moveTo(width - 10, y);
        ctx2d.lineTo(width, y);
      }
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
