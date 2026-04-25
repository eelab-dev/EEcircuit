/**
 * Author: Danial Chitnis
 */

export const unitConvert2string = (n: number, fractDigits?: number): string => {
  // Handle zero case
  if (n === 0) {
    return "0";
  }

  const nLog10 = Math.log10(Math.abs(n));

  let nLog10Near: number;
  if (nLog10 >= 3) {
    nLog10Near = Math.floor(nLog10 / 3) * 3;
  } else if (nLog10 >= 0) {
    nLog10Near = 0;
  } else {
    nLog10Near = Math.floor(nLog10 / 3) * 3;
  }

  let unit: string;
  switch (nLog10Near) {
    case 9:
      unit = "G";
      break;
    case 6:
      unit = "M";
      break;
    case 3:
      unit = "k";
      break;
    case 0:
      unit = " ";
      break;
    case -3:
      unit = "m";
      break;
    case -6:
      unit = "u";
      break;
    case -9:
      unit = "n";
      break;
    case -12:
      unit = "p";
      break;
    case -15:
      unit = "f";
      break;
    default:
      unit = "";
      break;
  }

  const reminder = n / Math.pow(10, nLog10Near);

  let final: string;

  if (unit == "") {
    final = n.toExponential(fractDigits);
  } else {
    if (fractDigits) {
      final = `${reminder.toFixed(fractDigits)}${unit}`;
    } else {
      final = `${reminder}${unit}`;
    }
  }

  return final;
};

export const unitConvert2float = (input: string): number => {
  const trimmed = input.trim();
  if (!trimmed) return 0;

  // Handle "Meg" explicitly (since it's 3 chars, unlike single-char suffixes)
  if (trimmed.endsWith("Meg")) {
    const num = parseFloat(trimmed.slice(0, -3));
    return num * 1e6;
  }

  // Handle single-char suffixes
  const unit = trimmed.slice(-1);
  const isSuffix = ["G", "M", "k", "m", "u", "n", "p", "f"].includes(unit);
  
  if (isSuffix) {
    const num = parseFloat(trimmed.slice(0, -1));
    let factor = 1;
    switch (unit) {
      case "G": factor = 1e9; break;
      case "M": factor = 1e6; break;
      case "k": factor = 1e3; break;
      case "m": factor = 1e-3; break;
      case "u": factor = 1e-6; break;
      case "n": factor = 1e-9; break;
      case "p": factor = 1e-12; break;
      case "f": factor = 1e-15; break;
    }
    return num * factor;
  }

  // No suffix
  return parseFloat(trimmed);
};

