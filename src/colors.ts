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
  // Ensure L1 is the lighter luminance
  return L1 > L2 ? (L1 + 0.05) / (L2 + 0.05) : (L2 + 0.05) / (L1 + 0.05);
}

/**
 * Generates a random color that maintains at least a contrast ratio of 4 against the chosen mode background.
 *
 * @param mode - "light" or "dark". Default is "light".
 * @returns a ColorType with r,g,b values between 0 and 1.
 */
export const getColor = (mode: "light" | "dark"): ColorType => {
  // Set background color depending on mode.
  // For "light" mode we use a very light background and for "dark" mode a dark one.
  const bgColor =
    mode === "light"
      ? { r: 250 / 255, g: 250 / 255, b: 250 / 255 }
      : { r: 5 / 255, g: 5 / 255, b: 5 / 255 };

  const bgLuminance = calcLuminance(bgColor.b, bgColor.g, bgColor.r);

  let contrast = 0;
  let r = 0,
    g = 0,
    b = 0;

  // change the color versus background; be careful of infinite loops
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
 *
 * @param color - ColorType object containing r, g, b values.
 * @param factor - factor to scale the color intensity.
 * @param alpha - alpha value for transparency.
 * @returns new ColorRGBA with the modified intensity.
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
