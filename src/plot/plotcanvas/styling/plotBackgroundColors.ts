// Single source of truth for plot background colors
// These colors correspond to the bg.subtle semantic token in light/dark modes
// Used for both canvas CSS and webgl-plot initialization (webgl-plot now accepts CSS strings)

export const PLOT_BACKGROUND_COLORS = {
  light: "rgb(249, 250, 251)", // bg.subtle in light mode
  dark: "rgb(3, 7, 18)", // bg.subtle in dark mode
} as const;

// Helper function for consistent usage across canvas CSS and webgl-plot
export const getPlotBackgroundColor = (isDarkMode: boolean): string => {
  return isDarkMode ? PLOT_BACKGROUND_COLORS.dark : PLOT_BACKGROUND_COLORS.light;
};
