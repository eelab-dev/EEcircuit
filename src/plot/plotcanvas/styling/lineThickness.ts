/**
 * Line thickness constants for the webgl-plot plotting system.
 * 
 * These constants centralize all line thickness values used throughout the application,
 * making it easy to adjust visual appearance consistently.
 */

export const LINE_THICKNESS = {
  // Normal plot lines
  NORMAL: 2.0,
  HOVERED: 4.0,
  
  // Bracket operation lines  
  BRACKET_NORMAL: 2.0,
  BRACKET_EMPHASIZED: 3.0,
  
  // UI elements
  CROSSHAIR: 1.0,
  ZOOM_LINES: 2.0,
  
  // Snap circle stroke
  SNAP_CIRCLE_STROKE: 2.0,
} as const;

export type LineThicknessType = typeof LINE_THICKNESS[keyof typeof LINE_THICKNESS];