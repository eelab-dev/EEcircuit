export const dialogTheme = {
  // Background colors
  bg: "gray.subtle/70",
  inputBg: "gray.emphasized/80",
  keyBoxBg: "gray.focusRing/90",
  buttonIconBg: "gray.solid/90",

  // Border colors
  borderColor: "gray.muted/50",
  inputBorderColor: "gray.focusRing/60",
  itemBorderColor: "gray.emphasized/40",
  keyBoxBorderColor: "gray.fg/80",
  dividerBg: "gray.emphasized/60",

  // Text colors
  primaryText: "gray.fg/95",
  secondaryText: "gray.fg/90",
  categoryText: "gray.focusRing/90",
  keyBoxText: "white/95",

  // Interactive states
  hoverBg: "gray.muted/80",
  focusBg: "gray.emphasized/70",

  // Effects
  backdropFilter: "blur(12px)",
  toggleButtonBackdropFilter: "blur(8px)",
  borderWidth: "1px",
} as const;

export type DialogTheme = typeof dialogTheme;
