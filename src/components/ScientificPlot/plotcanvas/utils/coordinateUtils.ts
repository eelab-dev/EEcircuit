/**
 * COORDINATE SPACE CONVERSION UTILITIES
 * 
 * This module provides common functions for converting between linear and log coordinate spaces
 * across plot components like crosshair, zoom controller, axes, and plot calculations.
 * 
 * Centralizes the linear ↔ log space conversion logic that was previously duplicated
 * across multiple plot components.
 */

/**
 * Convert a value from linear space to log space
 * @param value Linear space value
 * @param isLog Whether log conversion should be applied
 * @returns Log space value (Math.log10(value)) or original value
 */
export const convertLinearToLogSpace = (value: number, isLog: boolean): number => {
  if (isLog && value > 0) {
    return Math.log10(value);
  }
  return value;
};

/**
 * Convert a value from log space to linear space
 * @param value Log space value
 * @param isLog Whether log conversion should be applied
 * @returns Linear space value (Math.pow(10, value)) or original value
 */
export const convertLogToLinearSpace = (value: number, isLog: boolean): number => {
  if (isLog && value !== undefined && isFinite(value)) {
    return Math.pow(10, value);
  }
  return value;
};

/**
 * Convert coordinates from data space to display space
 * Handles conversion from log space back to linear space for display purposes
 * @param dataX X coordinate in data space (may be log space)
 * @param dataY Y coordinate in data space (may be log space)
 * @param isLogX Whether X axis is in log scale
 * @param isLogY Whether Y axis is in log scale
 * @returns Display coordinates in linear space
 */
export const convertDataToDisplayCoordinates = (
  dataX: number, 
  dataY: number, 
  isLogX: boolean, 
  isLogY: boolean
): { displayX: number; displayY: number } => {
  let displayX = dataX;
  let displayY = dataY;

  // Convert from log space back to linear space for display
  if (isLogX && dataX !== undefined && isFinite(dataX)) {
    displayX = Math.pow(10, dataX);
  }
  if (isLogY && dataY !== undefined && isFinite(dataY)) {
    displayY = Math.pow(10, dataY);
  }

  return { displayX, displayY };
};

/**
 * Convert coordinates from display space to data space
 * Handles conversion from linear space to log space for internal calculations
 * @param displayX X coordinate in display space (linear)
 * @param displayY Y coordinate in display space (linear)
 * @param isLogX Whether X axis is in log scale
 * @param isLogY Whether Y axis is in log scale
 * @returns Data coordinates (log space if log axes enabled)
 */
export const convertDisplayToDataCoordinates = (
  displayX: number, 
  displayY: number, 
  isLogX: boolean, 
  isLogY: boolean
): { dataX: number; dataY: number } => {
  let dataX = displayX;
  let dataY = displayY;

  // Convert from linear space to log space
  if (isLogX && displayX > 0) {
    dataX = Math.log10(displayX);
  }
  if (isLogY && displayY > 0) {
    dataY = Math.log10(displayY);
  }

  return { dataX, dataY };
};

/**
 * Convert a single X coordinate from linear to log space
 * @param x X coordinate value
 * @param isLogX Whether X axis is in log scale
 * @returns Converted X coordinate
 */
export const convertXToLogSpace = (x: number, isLogX: boolean): number => {
  if (isLogX && x > 0) {
    return Math.log10(x);
  }
  return x;
};

/**
 * Convert a single Y coordinate from linear to log space
 * @param y Y coordinate value
 * @param isLogY Whether Y axis is in log scale
 * @returns Converted Y coordinate
 */
export const convertYToLogSpace = (y: number, isLogY: boolean): number => {
  if (isLogY && y > 0) {
    return Math.log10(y);
  }
  return y;
};

/**
 * Convert a single X coordinate from log to linear space
 * @param x X coordinate value (may be in log space)
 * @param isLogX Whether X axis is in log scale
 * @returns Converted X coordinate in linear space
 */
export const convertXToLinearSpace = (x: number, isLogX: boolean): number => {
  if (isLogX && x !== undefined && isFinite(x)) {
    return Math.pow(10, x);
  }
  return x;
};

/**
 * Convert a single Y coordinate from log to linear space
 * @param y Y coordinate value (may be in log space)
 * @param isLogY Whether Y axis is in log scale
 * @returns Converted Y coordinate in linear space
 */
export const convertYToLinearSpace = (y: number, isLogY: boolean): number => {
  if (isLogY && y !== undefined && isFinite(y)) {
    return Math.pow(10, y);
  }
  return y;
};