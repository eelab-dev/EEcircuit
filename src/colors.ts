/**
 * https://www.w3.org/TR/WCAG20/#relativeluminancedef
 */

import { ColorRGBA } from "webgl-plot";

export type ColorType = {
  r: number;
  g: number;
  b: number;
};

export function calcLuminance(
  BsRGB: number,
  GsRGB: number,
  RsRGB: number
): number {
  const R =
    RsRGB <= 0.03928 ? RsRGB / 12.92 : Math.pow((RsRGB + 0.055) / 1.055, 2.4);
  const G =
    GsRGB <= 0.03928 ? GsRGB / 12.92 : Math.pow((GsRGB + 0.055) / 1.055, 2.4);
  const B =
    BsRGB <= 0.03928 ? BsRGB / 12.92 : Math.pow((BsRGB + 0.055) / 1.055, 2.4);

  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

export function calcContrast(L1: number, L2: number): number {
  return L1 > L2 ? (L1 + 0.05) / (L2 + 0.05) : (L2 + 0.05) / (L1 + 0.05);
}

/**
 * Converts HSL color values to RGB.
 * h: 0-360, s: 0-1, l: 0-1
 */
function hslToRgb(h: number, s: number, l: number): ColorType {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return { r: f(0), g: f(8), b: f(4) };
}

/**
 * Generates a color by index using evenly-spaced hues in HSL space.
 * Guarantees maximum perceptual separation between curves regardless of count.
 * Uses golden angle spacing to avoid clustering when total count is unknown.
 *
 * @param index - 0-based signal index
 * @param total - total number of signals (used for even spacing)
 * @param mode  - "light" or "dark" (adjusts lightness for contrast)
 */
export const getColorByIndex = (
  index: number,
  total: number,
  mode: "light" | "dark"
): ColorType => {
  const hue = (index / Math.max(total, 1)) * 360;
  const saturation = 0.85;
  const lightness = mode === "light" ? 0.38 : 0.62;
  return hslToRgb(hue, saturation, lightness);
};

/**
 * Generates a random color with at least 4:1 contrast against the background.
 * Kept for the colorize (🌈) button.
 */
export const getColor = (mode: "light" | "dark"): ColorType => {
  const bgColor =
    mode === "light"
      ? { r: 250 / 255, g: 250 / 255, b: 250 / 255 }
      : { r: 5 / 255, g: 5 / 255, b: 5 / 255 };

  const bgLuminance = calcLuminance(bgColor.b, bgColor.g, bgColor.r);

  let contrast = 0;
  let r = 0, g = 0, b = 0;

  while (contrast < 4) {
    r = Math.random();
    g = Math.random();
    b = Math.random();
    const colorLuminance = calcLuminance(b, g, r);
    contrast = calcContrast(colorLuminance, bgLuminance);
  }
  return { r, g, b };
};

/**
 * Adjusts the color intensity.
 */
export const changeIntensity = (
  color: ColorType,
  factor: number,
  alpha: number
): ColorRGBA => {
  return new ColorRGBA(
    color.r * factor,
    color.g * factor,
    color.b * factor,
    alpha
  );
};
