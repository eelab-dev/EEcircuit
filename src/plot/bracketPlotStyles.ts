/**
 * Styling constants for bracket operation plot emphasis
 * These values control the visual appearance of lines when using the slider
 * to emphasize individual parameter sweeps in bracket operations.
 */

// Line thickness constants
export const BRACKET_PLOT_STYLES = {
  // Line thickness values
  NORMAL_LINE_THICKNESS: 3,
  EMPHASIZED_LINE_THICKNESS: 8,
  
  // Transparency values (alpha channel)
  NORMAL_TRANSPARENCY: 0.3,
  EMPHASIZED_TRANSPARENCY: 1.0,
} as const;

export type BracketPlotStyles = typeof BRACKET_PLOT_STYLES;