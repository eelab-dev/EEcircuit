
/**
 * Corrects units for ngspice compatibility.
 * ngspice has a bug where it doesn't accept "M" as a unit multiplier,
 * but accepts "Meg" instead. This function converts values like "1M" to "1Meg".
 * Handles both integer and fractional numbers (e.g., "2.01M" becomes "2.01Meg").
 */
export const correctNgspiceUnits = (value: string): string => {
  // Replace "M" with "Meg" only when it's at the end of the string or followed by non-letter characters
  // This regex matches numbers (including decimals) followed by "M" at word boundaries
  let correctedValue = value.replace(/(\d+(?:\.\d+)?)\s*M\b/g, "$1Meg");
  
  // Also handle bracket notation: [1:1:10]M -> [1:1:10]Meg
  correctedValue = correctedValue.replace(/\]\s*M\b/g, "]Meg");

  return correctedValue;
};
