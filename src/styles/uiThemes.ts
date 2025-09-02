export const dialogTheme = {
  // Background colors - these semantic tokens automatically adapt to light/dark mode
  bg: "gray.subtle/70",
  inputBg: "gray.emphasized/80",
  keyBoxBg: "gray.focusRing/90",
  buttonIconBg: "gray.solid/90",

  // Border colors - semantic tokens automatically adapt
  borderColor: "gray.muted/50",
  inputBorderColor: "gray.focusRing/60",
  itemBorderColor: "gray.emphasized/40",
  keyBoxBorderColor: "gray.fg/80",
  dividerBg: "gray.emphasized/60",

  // Text colors - semantic tokens automatically adapt
  primaryText: "gray.fg/95",
  secondaryText: "gray.fg/90",
  categoryText: "gray.focusRing/90",
  keyBoxText: "white/95",

  // Interactive states - semantic tokens automatically adapt
  hoverBg: "gray.muted/80",
  focusBg: "gray.emphasized/70",

  // Effects
  backdropFilter: "blur(12px)",
  toggleButtonBackdropFilter: "blur(8px)",
  borderWidth: "1px",
} as const;

export type DialogTheme = typeof dialogTheme;

export const bottomBarTheme = {
  bg: "gray.subtle/40",
  borderColor: "gray.muted/50",
  borderRadius: "xl",
  backdropFilter: "blur(3px)",
  primaryText: "gray.fg/95",
}


export const actionBarTheme = {
  buttonIconBg: "gray.solid/90",
  buttonIconBgSelected: "gray.focusRing/90",
  backdropFilter: "blur(8px)",
  border: "0px solid",
} 