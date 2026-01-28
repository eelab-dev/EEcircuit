/**
 * Formats a number using engineering notation with appropriate unit prefixes
 * @param value - The number to format
 * @param decimals - Number of decimal places to show (default: 3)
 * @returns Formatted string with engineering notation (e.g., "1.23k", "456.7m", "2.34μ")
 */
export const formatEngineering = (
  value: number,
  decimals: number = 3
): string => {
  if (value === 0) return "0";

  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";

  // Engineering notation prefixes (powers of 1000)
  const prefixes = [
    { threshold: 1e12, symbol: "T" }, // Tera
    { threshold: 1e9, symbol: "G" }, // Giga
    { threshold: 1e6, symbol: "M" }, // Mega
    { threshold: 1e3, symbol: "k" }, // Kilo
    { threshold: 1, symbol: "" }, // Base unit
    { threshold: 1e-3, symbol: "m" }, // Milli
    { threshold: 1e-6, symbol: "μ" }, // Micro
    { threshold: 1e-9, symbol: "n" }, // Nano
    { threshold: 1e-12, symbol: "p" }, // Pico
    { threshold: 1e-15, symbol: "f" }, // Femto
  ];

  for (const prefix of prefixes) {
    if (abs >= prefix.threshold) {
      const scaledValue = abs / prefix.threshold;
      return `${sign}${scaledValue.toFixed(decimals)}${prefix.symbol}`;
    }
  }

  // For very small numbers, use scientific notation
  return value.toExponential(decimals);
};

/**
 * Parses a SPICE number string (e.g. "10k", "1Meg", "1u") into a number.
 * Handles standard SPICE suffixes.
 */
export const parseSpiceNumber = (valueStr: string): number => {
  if (!valueStr) return 0;
  
  // Remove any surrounding whitespace
  const trimmed = valueStr.trim();
  
  // Extract number and suffix
  // RegEx looks for number (int or float) followed efficiently by optional suffix
  const match = trimmed.match(/^(-?\d+(?:\.\d+)?)([a-zA-Z]+)?$/);
  
  if (!match) {
    // Try simple float parse if regex fails (though regex covers most cases)
    return parseFloat(trimmed);
  }
  
  const numberPart = parseFloat(match[1]!);
  const suffix = match[2];
  
  if (!suffix) {
    return numberPart;
  }
  
  // Multipliers map
  // Note: SPICE is generally case-insensitive, but we look for specific forms common in this app
  // 'Meg' is 1e6, 'M' usually treated as Meg by some SPICE variants but 'm' is milli. 
  // BracketParser regex suggests: Meg, u, m, M, k, G, T, p, n, f, a
  // In `unitCorrection.ts`, 'M' -> 'Meg'. 
  // Let's implement standard multipliers.
  
  switch (suffix) {
    case 'T': return numberPart * 1e12;
    case 'G': return numberPart * 1e9;
    case 'Meg': return numberPart * 1e6;
    case 'M': return numberPart * 1e6; // Often 'M' is Meg in SPICE context if distinct from 'm', but careful if case matters.
                                       // In previous conversation context: M -> Meg, m -> milli.
    case 'k': return numberPart * 1e3;
    case 'm': return numberPart * 1e-3;
    case 'u': return numberPart * 1e-6;
    case 'n': return numberPart * 1e-9;
    case 'p': return numberPart * 1e-12;
    case 'f': return numberPart * 1e-15;
    case 'a': return numberPart * 1e-18;
    default: return numberPart;
  }
};
