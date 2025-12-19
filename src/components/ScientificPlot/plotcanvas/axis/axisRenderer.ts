import { unitConvert2string } from "./unitConverter";
import { convertLogToLinearSpace } from "../utils/coordinateUtils";

// Direct axis rendering functions - no React component needed
export interface AxisParams {
  canvas: HTMLCanvasElement;
  scale: number;
  offset: number;
  isDarkMode: boolean;
  isLogX: boolean;
  isLogY: boolean;
}

export const renderXAxis = ({ canvas, scale, offset, isDarkMode, isLogX }: AxisParams): void => {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const devicePixelRatio = window.devicePixelRatio || 1;
  canvas.width = canvas.clientWidth * devicePixelRatio;
  canvas.height = canvas.clientHeight * devicePixelRatio;

  const width = canvas.width;
  const height = canvas.height;

  updateX(ctx, width, height, scale, offset, isDarkMode, isLogX);
};

export const renderYAxis = ({ canvas, scale, offset, isDarkMode, isLogY }: AxisParams): void => {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const devicePixelRatio = window.devicePixelRatio || 1;
  canvas.width = canvas.clientWidth * devicePixelRatio;
  canvas.height = canvas.clientHeight * devicePixelRatio;

  const width = canvas.width;
  const height = canvas.height;

  updateY(ctx, width, height, scale, offset, isDarkMode, isLogY);
};

  // Function to generate nice tick intervals for linear axes
  const getNiceTickInterval = (range: number, maxTicks: number): number => {
    if (range === 0) return 1;

    // CRITICAL FIX: Ensure we never have more ticks than maxTicks
    // Use maxTicks directly to calculate a safe interval
    const roughInterval = range / Math.max(1, maxTicks - 1);
    
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

    const finalInterval = niceInterval * magnitude;
    return finalInterval;
  };

  // Function to generate log-scale tick values
  const generateLogTicks = (
    minValue: number,
    maxValue: number,
    maxTicks: number
  ): number[] => {
    // CRITICAL CRASH FIX: Return immediately if values are not finite (e.g. -Infinity from log(0))
    if (!isFinite(minValue) || !isFinite(maxValue)) {
      return [];
    }
    
    // CRITICAL HANG FIX: Prevent massive loops if range is unreasonably large
    // Limit to 50 decades (1e-25 to 1e25 is already huge for engineering)
    if (Math.abs(maxValue - minValue) > 50) {
       return []; // Too wide to render meaningful ticks
    }

    const ticks: number[] = [];

    // Convert to powers of 10 for log scale calculation
    const startPower = Math.floor(minValue);
    const endPower = Math.ceil(maxValue);

    // CRITICAL LOOP GUARD
    const MAX_LOOP_ITERATIONS = 100;

    // Generate major ticks at powers of 10
    // Added safety break to prevent infinite loops
    for (let power = startPower; power <= endPower; power++) {
      if (power >= minValue && power <= maxValue) {
        ticks.push(power);
      }
      if (ticks.length > MAX_LOOP_ITERATIONS) break; 
    }

    // Aggressive optimization for very wide frequency ranges (e.g., 1Hz to 100MHz)
    const numDecades = endPower - startPower;
    const majorTickCount = ticks.length;
    
    // For very wide ranges (>6 decades), skip major ticks logic... (existing logic)
    if (numDecades > 6) {
      // Keep only every 2nd or 3rd major tick for very wide ranges
      const keepEvery = numDecades > 8 ? 3 : 2;
      return ticks.filter((_, index) => index % keepEvery === 0);
    }
    
    // For wide ranges (4-6 decades), be very conservative with minor ticks
    if (numDecades > 3) {
      // No minor ticks for wide ranges - just major ticks
      return ticks;
    }
    
    // Only add minor ticks for narrow ranges (≤3 decades)
    if (numDecades <= 1 && majorTickCount < maxTicks / 2) {
      // Full minor ticks only for single decade
      const minorTicks: number[] = [];
      const minorMultipliers = [2, 3, 4, 5, 6, 7, 8, 9];

      for (let power = startPower; power <= endPower; power++) {
        for (const multiplier of minorMultipliers) {
          const logValue = power + Math.log10(multiplier);
          if (
            logValue >= minValue &&
            logValue <= maxValue &&
            minorTicks.length + ticks.length < maxTicks // Strict limit check
          ) {
            minorTicks.push(logValue);
          }
        }
      }

      ticks.push(...minorTicks);
      ticks.sort((a, b) => a - b);
    } else if (numDecades <= 3 && majorTickCount <= 6) {
      // Limited minor ticks for 2-3 decades
      const minorTicks: number[] = [];
      const minorMultipliers = [2, 5]; // Only 2x and 5x multipliers

      for (let power = startPower; power <= endPower; power++) {
        for (const multiplier of minorMultipliers) {
          const logValue = power + Math.log10(multiplier);
          if (
            logValue >= minValue &&
            logValue <= maxValue &&
            minorTicks.length + ticks.length < maxTicks // Strict limit check
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


  // Note: convertLogToLinearForDisplay is now imported as convertLogToLinearSpace from coordinateUtils

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

    // CRITICAL FIX: Enforce strict maxTicks limit to prevent performance issues
    // Generate ticks from start to end but NEVER exceed maxTicks
    while (tick <= endValue + tickInterval * 0.001 && ticks.length < maxTicks) {
      // Small epsilon for floating point
      if (tick >= startValue - tickInterval * 0.001) {
        // Include ticks slightly before start
        // Round to avoid floating point precision issues
        ticks.push(Math.round(tick / tickInterval) * tickInterval);
      }
      tick += tickInterval;
      
      // EMERGENCY BRAKE: If we somehow get too many ticks, stop immediately
      if (ticks.length >= maxTicks) {
        break;
      }
    }

    // Ensure we have at least 2 ticks but never more than maxTicks
    if (ticks.length < 2 && maxTicks >= 2) {
      return [startValue, endValue];
    }

    return ticks;
  };

const updateX = (
  ctx2d: CanvasRenderingContext2D,
  width: number,
  height: number,
  scale: number,
  offset: number,
  isDarkMode: boolean,
  isLogX: boolean
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

    // WRONG APPROACH: Don't reverse-calculate from scale/offset
    // This gets corrupted when switching between log/linear modes
    // 
    // RIGHT APPROACH: Use the actual data bounds that the plot is displaying
    // The plot displays correctly, so use its bounds directly
    
    // Calculate the data bounds by reverse-transforming from normalized coordinates
    const leftValue = (-1 - offset) / scale; // Value at left edge (normalized coord = -1)
    const rightValue = (1 - offset) / scale; // Value at right edge (normalized coord = +1)
    const minValue = Math.min(leftValue, rightValue);
    const maxValue = Math.max(leftValue, rightValue);
    
    // Axis calculation based on scale and offset from plot calculations
    // The scale and offset should now properly reflect the zoom bounds with pan offset

    // CRITICAL VALIDATION: Don't render axis if scale/offset are invalid or uninitialized
    // This prevents massive tick generation during axis transitions
    if (!isFinite(scale) || scale === 0 || !isFinite(offset)) {
      // Clear canvas and show minimal indication
      ctx2d.fillText("Updating...", 10, 15 * (window.devicePixelRatio || 1));
      return;
    }

    // Calculate minimum spacing needed for text to avoid overlap
    // Use display values (converted from log space if needed) for proper text width estimation
    const sampleValueForMeasurement = Math.abs(maxValue) > Math.abs(minValue) ? maxValue : minValue;
    const displayValueForMeasurement = convertLogToLinearSpace(sampleValueForMeasurement, isLogX);
    const sampleText = unitConvert2string(displayValueForMeasurement, 2);
    const textMetrics = ctx2d.measureText(sampleText);
    const textWidth = textMetrics.width;
    const minSpacing = textWidth + 30; // Extra padding for readability

    // Determine how many ticks we can actually fit
    // Add safety bounds to prevent excessive ticks (max 20 for X-axis)
    const calculatedMaxTicks = Math.floor(width / minSpacing);
    let maxTicks = Math.max(2, Math.min(20, calculatedMaxTicks));
    
    // CRITICAL FIX: For very wide ranges (like 1 to 1,000,000), drastically reduce maxTicks
    const range = Math.abs(maxValue - minValue);
    if (range > 10000) {
      maxTicks = Math.min(maxTicks, 4); // Reduce to max 4 ticks for very wide ranges
    }
    
    // Generate tick values based on whether X axis is in log scale
    let tickValues: number[];
    if (isLogX) {
      tickValues = generateLogTicks(minValue, maxValue, maxTicks);
    } else {
      // SIMPLE: Just use the same generateNiceTicks as initial linear axis
      tickValues = generateNiceTicks(minValue, maxValue, maxTicks);
    }
    
    // CRITICAL SAFEGUARD: Never allow more ticks than maxTicks regardless of what generateNiceTicks returns
    // This prevents performance issues from stale/cached tick arrays during rapid re-renders
    if (tickValues.length > maxTicks) {
      // Emergency safeguard: truncate excessive ticks to prevent performance issues
      tickValues = tickValues.slice(0, maxTicks);
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
        const displayValue = convertLogToLinearSpace(tickValue, isLogX);
        const text = unitConvert2string(displayValue, 2);

        // Use the pre-calculated textWidth for centering instead of measuring each label
        // This avoids expensive measureText() calls for every tick
        const textX = Math.max(
          textWidth / 2,
          Math.min(width - textWidth / 2, x)
        );

        ctx2d.fillText(
          text,
          textX - textWidth / 2,
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
  height: number,
  scale: number,
  offset: number,
  isDarkMode: boolean,
  isLogY: boolean
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
    // Add safety bounds to prevent excessive ticks (max 15 for Y-axis)
    const calculatedMaxTicks = Math.floor(height / minSpacing);
    const maxTicks = Math.max(2, Math.min(15, calculatedMaxTicks));

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
        const displayValue = convertLogToLinearSpace(tickValue, isLogY);
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
