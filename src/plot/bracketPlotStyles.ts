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

  /**
   * Transparency values (alpha channel)
   * Light mode uses a higher base alpha so non-emphasized sweeps remain visible
   * against the bright canvas background.
   */
  NORMAL_TRANSPARENCY_DARK: 0.3,
  NORMAL_TRANSPARENCY_LIGHT: 0.65,
  EMPHASIZED_TRANSPARENCY: 1.0,
} as const;

export type BracketPlotStyles = typeof BRACKET_PLOT_STYLES;

interface BracketTransparencyOptions {
  isDarkMode: boolean;
  isEmphasized: boolean;
}

/**
 * Helper to pick the correct transparency based on theme + emphasis state.
 */
export function getBracketTransparency({
  isDarkMode,
  isEmphasized,
}: BracketTransparencyOptions): number {
  if (isEmphasized) {
    return BRACKET_PLOT_STYLES.EMPHASIZED_TRANSPARENCY;
  }

  return isDarkMode
    ? BRACKET_PLOT_STYLES.NORMAL_TRANSPARENCY_DARK
    : BRACKET_PLOT_STYLES.NORMAL_TRANSPARENCY_LIGHT;
}
