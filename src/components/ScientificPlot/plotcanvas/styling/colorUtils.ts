/**
 * Color generation utilities for plot lines with theme awareness
 */

export type ColorMode = "light" | "dark";
export type PlotColor = [number, number, number, number]; // RGBA

/**
 * Calculate relative luminance according to WCAG guidelines
 * https://www.w3.org/TR/WCAG20/#relativeluminancedef
 */
function calcLuminance(r: number, g: number, b: number): number {
  const R = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
  const G = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
  const B = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);

  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

/**
 * Calculate contrast ratio between two colors
 */
function calcContrast(L1: number, L2: number): number {
  return L1 > L2 ? (L1 + 0.05) / (L2 + 0.05) : (L2 + 0.05) / (L1 + 0.05);
}

/**
 * Convert HSL to RGB
 */
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let r: number, g: number, b: number;

  if (h >= 0 && h < 60) {
    [r, g, b] = [c, x, 0];
  } else if (h >= 60 && h < 120) {
    [r, g, b] = [x, c, 0];
  } else if (h >= 120 && h < 180) {
    [r, g, b] = [0, c, x];
  } else if (h >= 180 && h < 240) {
    [r, g, b] = [0, x, c];
  } else if (h >= 240 && h < 300) {
    [r, g, b] = [x, 0, c];
  } else {
    [r, g, b] = [c, 0, x];
  }

  return [r + m, g + m, b + m];
}

/**
 * Generate a deterministic hash from a string
 */
function stringToHash(str: string): number {
  // Add defensive check for undefined/null strings
  if (!str || typeof str !== "string") {
    return 0; // Return default hash for invalid input
  }

  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

/**
 * Get background color based on theme mode
 */
function getBackgroundColor(mode: ColorMode): [number, number, number] {
  // Balanced semantic palette for light and dark themes.
  return mode === "light"
    ? [250 / 255, 250 / 255, 250 / 255] // Light background
    : [20 / 255, 20 / 255, 20 / 255]; // Dark background
}

/**
 * Generate a color with good contrast against the background
 */
function generateContrastColor(
  hue: number,
  backgroundLuminance: number,
  mode: ColorMode
): [number, number, number] {
  const minContrast = 4.5; // WCAG AA standard
  const maxAttempts = 50;

  // Adjust saturation and lightness based on theme
  const baseSaturation = mode === "light" ? 0.7 : 0.8;
  const baseLightness = mode === "light" ? 0.4 : 0.6;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Vary saturation and lightness slightly for each attempt
    const saturation = Math.max(
      0.3,
      Math.min(1.0, baseSaturation + (Math.random() - 0.5) * 0.4)
    );
    const lightness = Math.max(
      0.2,
      Math.min(0.8, baseLightness + (Math.random() - 0.5) * 0.4)
    );

    const [r, g, b] = hslToRgb(hue, saturation, lightness);
    const colorLuminance = calcLuminance(r, g, b);
    const contrast = calcContrast(colorLuminance, backgroundLuminance);

    if (contrast >= minContrast) {
      return [r, g, b];
    }
  }

  // Fallback: use a high contrast color
  return mode === "light"
    ? [0.1, 0.1, 0.1] // Dark color for light background
    : [0.9, 0.9, 0.9]; // Light color for dark background
}

/**
 * Generate a consistent, theme-aware color for a variable name
 */
export function generatePlotColor(
  variableName: string,
  isDarkMode: boolean,
  colorCache: Map<string, PlotColor>
): PlotColor {
  // Add defensive check for invalid variable names
  if (!variableName || typeof variableName !== "string") {
    // Return a default gray color as fallback [R, G, B, A]
    return [128, 128, 128, 1.0];
  }

  // Check if color is already cached
  const cacheKey = `${variableName}-${isDarkMode}`;
  if (colorCache.has(cacheKey)) {
    return colorCache.get(cacheKey)!;
  }

  // Generate deterministic hue from variable name
  const hash = stringToHash(variableName);
  const hue = hash % 360;

  // Get background color and luminance
  const [bgR, bgG, bgB] = getBackgroundColor(isDarkMode ? "dark" : "light");
  const backgroundLuminance = calcLuminance(bgR, bgG, bgB);

  // Generate color with good contrast
  const [r, g, b] = generateContrastColor(hue, backgroundLuminance, isDarkMode ? "dark" : "light");

  const color: PlotColor = [r, g, b, 1];
  colorCache.set(cacheKey, color);

  return color;
}

/**
 * Clear color cache (useful when theme changes)
 */
export function clearColorCache(colorCache: Map<string, PlotColor>): void {
  colorCache.clear();
}
