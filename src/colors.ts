/**
 * https://www.w3.org/TR/WCAG20/#relativeluminancedef
 */

import { ColorRGBA } from "webgl-plot";

export type ColorType = {
  r: number;
  g: number;
  b: number;
};

export function calcLuminance(BsRGB: number, GsRGB: number, RsRGB: number): number {
  const R = RsRGB <= 0.03928 ? RsRGB / 12.92 : Math.pow((RsRGB + 0.055) / 1.055, 2.4);
  const G = GsRGB <= 0.03928 ? GsRGB / 12.92 : Math.pow((RsRGB + 0.055) / 1.055, 2.4);
  const B = BsRGB <= 0.03928 ? BsRGB / 12.92 : Math.pow((RsRGB + 0.055) / 1.055, 2.4);

  const L = 0.2126 * R + 0.7152 * G + 0.0722 * B;

  return L;
}

export function calcContrast(L1: number, L2: number): number {
  return (L1 + 0.05) / (L2 + 0.05);
}

export const getColor = (): ColorType => {
  let contrast = 0;
  let r = 0,
    g = 0,
    b = 0;
  while (contrast < 4) {
    r = Math.random();
    g = Math.random();
    b = Math.random();

    //change the color versus background be careful of infinite loops

    contrast = calcContrast(calcLuminance(b, g, r), calcLuminance(23 / 255, 25 / 255, 35 / 255));
  }
  return { r: r, g: g, b: b } as ColorType;
};

export const changeIntensity = (color: ColorType, factor: number, alpha: number): ColorRGBA => {
  return new ColorRGBA(color.r * factor, color.g * factor, color.b * factor, alpha);
};
