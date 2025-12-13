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
