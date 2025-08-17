import React, { JSX, useEffect, useRef, useState } from "react";
import { unitConvert2string } from "./unitConverter";
import { useAppStore } from "../../../store/appStore";

type AxisType = {
  scale: number;
  offset: number;
  axis: "x" | "y";
};

type CanvasSize = {
  width: number;
  height: number;
};

const Axis = ({ scale, offset, axis }: AxisType): JSX.Element => {
  // Get theme and log axis state from the app store
  const isDarkMode = useAppStore((state) => state.isDarkMode);
  const isLogX = useAppStore((state) => state.isLogX);
  const isLogY = useAppStore((state) => state.isLogY);

  // Debug: Log axis state and parameters for dual plot debugging
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ctx, setCtx] = useState<CanvasRenderingContext2D>();
  const [canvasSize, setCanvasSize] = useState<CanvasSize>({
    width: 0,
    height: 0,
  });
  const [forceRedraw, setForceRedraw] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (canvas) {
      const setupCanvas = () => {
        const devicePixelRatio = window.devicePixelRatio || 1;

        // Check if canvas has proper dimensions - but don't skip if dimensions are 0
        // Instead, we'll handle zero dimensions gracefully
        if (canvas.clientWidth === 0 || canvas.clientHeight === 0) {
          // Clear the context and canvas size so drawing effects won't try to draw
          setCtx(undefined);
          setCanvasSize({ width: 0, height: 0 });
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
          const scaleFactor = window.devicePixelRatio || 1;
          const fontSize = 0.85 * rootFontSize * scaleFactor;
          ctx2d.font = `${fontSize}px Courier New`;
          ctx2d.fillStyle = isDarkMode ? "white" : "black";
          ctx2d.strokeStyle = isDarkMode ? "white" : "black";

          setCtx(ctx2d);

          // Force a redraw after theme change to apply new colors
          setForceRedraw((prev) => prev + 1);
        }
      };

      // Set up ResizeObserver to handle dimension changes
      const resizeObserver = new ResizeObserver(() => {
        // Use requestAnimationFrame to ensure proper timing
        requestAnimationFrame(() => {
          setupCanvas();
        });
      });

      resizeObserver.observe(canvas);

      // Handle page visibility changes (when switching tabs)
      const handleVisibilityChange = () => {
        if (!document.hidden) {
          // Page became visible again - redraw axes
          setForceRedraw((prev) => prev + 1);
          requestAnimationFrame(() => {
            setupCanvas();
          });
        }
      };

      document.addEventListener("visibilitychange", handleVisibilityChange);

      // Initial setup with a slight delay to ensure DOM is ready
      requestAnimationFrame(() => {
        setupCanvas();
      });

      return () => {
        resizeObserver.disconnect();
        document.removeEventListener(
          "visibilitychange",
          handleVisibilityChange
        );
      };
    }
    return () => {}; // Return empty cleanup for when canvas is not available
  }, [canvasRef, isDarkMode]); // Remove yHeight dependency

  // Add an effect to ensure we redraw when context becomes available after being lost
  useEffect(() => {
    if (ctx && canvasSize.width > 0 && canvasSize.height > 0) {
      // Force redraw when context becomes available
      setForceRedraw((prev) => prev + 1);
    }
  }, [ctx, axis]);

  // Force redraw when theme changes to ensure colors are updated
  useEffect(() => {
    if (ctx) {
      // Update context colors immediately when theme changes
      ctx.fillStyle = isDarkMode ? "white" : "black";
      ctx.strokeStyle = isDarkMode ? "white" : "black";
      // Force a redraw to apply the new colors
      setForceRedraw((prev) => prev + 1);
    }
  }, [isDarkMode, ctx]);

  useEffect(() => {
    if (ctx && axis == "x" && canvasSize.width > 0 && canvasSize.height > 0) {
      updateX(ctx, canvasSize.width, canvasSize.height);
    }
  }, [
    ctx,
    scale,
    offset,
    canvasSize.width,
    canvasSize.height,
    isDarkMode,
    forceRedraw,
    isLogX,
  ]);

  useEffect(() => {
    if (ctx && axis == "y" && canvasSize.width > 0 && canvasSize.height > 0) {
      updateY(ctx, canvasSize.width, canvasSize.height);
    }
  }, [
    ctx,
    scale,
    offset,
    canvasSize.width,
    canvasSize.height,
    isDarkMode,
    forceRedraw,
    isLogY,
  ]);

  // Function to generate nice tick intervals for linear axes
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

  // Function to generate log-scale tick values
  const generateLogTicks = (
    minValue: number,
    maxValue: number,
    maxTicks: number
  ): number[] => {
    const ticks: number[] = [];

    // Convert to powers of 10 for log scale calculation
    const startPower = Math.floor(minValue);
    const endPower = Math.ceil(maxValue);

    // Generate major ticks at powers of 10
    for (let power = startPower; power <= endPower; power++) {
      if (power >= minValue && power <= maxValue) {
        ticks.push(power);
      }
    }

    // If we have room for more ticks and not too many decades, add minor ticks
    const numDecades = endPower - startPower;
    if (ticks.length < maxTicks / 2 && numDecades <= 3) {
      // Add minor ticks at 2, 3, 4, 5, 6, 7, 8, 9 * 10^n
      const minorMultipliers = [2, 3, 4, 5, 6, 7, 8, 9];
      const minorTicks: number[] = [];

      for (let power = startPower; power <= endPower; power++) {
        for (const multiplier of minorMultipliers) {
          const logValue = power + Math.log10(multiplier);
          if (
            logValue >= minValue &&
            logValue <= maxValue &&
            minorTicks.length + ticks.length < maxTicks
          ) {
            minorTicks.push(logValue);
          }
        }
      }

      ticks.push(...minorTicks);
      ticks.sort((a, b) => a - b);
    }

    return ticks;
  };

  // Function to convert log space value back to linear for display
  const convertLogToLinearForDisplay = (logValue: number): number => {
    return Math.pow(10, logValue);
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
    ctx2d.fillStyle = isDarkMode ? "white" : "black";
    ctx2d.strokeStyle = isDarkMode ? "white" : "black";

    ctx2d.beginPath();

    // Calculate the value range for the visible area
    // These calculations must match exactly with the plot canvas coordinate system
    // WebGL plot uses normalized coordinates from -1 to +1
    // The transformation is: normalizedCoord = (value * scale + offset)
    // So: value = (normalizedCoord - offset) / scale

    const leftValue = (-1 - offset) / scale; // Value at left edge (normalized coord = -1)
    const rightValue = (1 - offset) / scale; // Value at right edge (normalized coord = +1)
    const minValue = Math.min(leftValue, rightValue);
    const maxValue = Math.max(leftValue, rightValue);

    // Axis calculation based on scale and offset from plot calculations
    // The scale and offset should now properly reflect the zoom bounds with pan offset

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

    // Generate tick values based on whether X axis is in log scale
    let tickValues: number[];
    if (isLogX) {
      tickValues = generateLogTicks(minValue, maxValue, maxTicks);
    } else {
      tickValues = generateNiceTicks(minValue, maxValue, maxTicks);
    }

    // Sort tick values to ensure proper order
    tickValues.sort((a, b) => a - b);

    for (const tickValue of tickValues) {
      // Convert tick value back to x position using the exact same transformation as the plot
      // WebGL transformation: normalizedCoord = (value * scale + offset)
      // Canvas position: x = (normalizedCoord + 1) / 2 * width
      const normalizedCoord = tickValue * scale + offset;
      const x = ((normalizedCoord + 1) / 2) * width;

      // Draw ticks at exact pixel positions (no tolerance needed for exact alignment)
      if (x >= 0 && x <= width) {
        // For log scale, convert back to linear for display
        const displayValue = isLogX
          ? convertLogToLinearForDisplay(tickValue)
          : tickValue;
        const text = unitConvert2string(displayValue, 2);
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
    ctx2d.fillStyle = isDarkMode ? "white" : "black";
    ctx2d.strokeStyle = isDarkMode ? "white" : "black";

    ctx2d.beginPath();

    // Calculate the value range for the visible area
    // These calculations must match exactly with the plot canvas coordinate system
    // WebGL plot uses normalized coordinates from -1 to +1
    // The transformation is: normalizedCoord = (value * scale + offset)
    // So: value = (normalizedCoord - offset) / scale

    const topValue = (-1 - offset) / scale; // Value at top edge (normalized coord = -1)
    const bottomValue = (1 - offset) / scale; // Value at bottom edge (normalized coord = +1)
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

    // Generate tick values based on whether Y axis is in log scale
    let tickValues: number[];
    if (isLogY) {
      tickValues = generateLogTicks(minValue, maxValue, maxTicks);
    } else {
      tickValues = generateNiceTicks(minValue, maxValue, maxTicks);
    }

    // Sort tick values to ensure proper order
    tickValues.sort((a, b) => a - b);

    for (const tickValue of tickValues) {
      // Convert tick value back to y position using the exact same transformation as the plot
      // WebGL transformation: normalizedCoord = (value * scale + offset)
      // Canvas position: y = (1 - normalizedCoord) / 2 * height (inverted Y for screen coordinates)
      const normalizedCoord = tickValue * scale + offset;
      const y = ((1 - normalizedCoord) / 2) * height;

      // Draw ticks at exact pixel positions (no tolerance needed for exact alignment)
      if (y >= 0 && y <= height) {
        // For log scale, convert back to linear for display
        const displayValue = isLogY
          ? convertLogToLinearForDisplay(tickValue)
          : tickValue;
        const text = unitConvert2string(displayValue, 2);

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
        height: axis === "x" ? "1.5em" : "100%",
        backgroundColor: "transparent",
      }}
      ref={canvasRef}
    />
  );
};

export default Axis;
