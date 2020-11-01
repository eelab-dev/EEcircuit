/**
 * https://www.w3.org/TR/WCAG20/#relativeluminancedef
 */

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
