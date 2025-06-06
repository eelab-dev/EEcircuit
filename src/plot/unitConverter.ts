/**
 * Author: Danial Chitnis
 */

export const unitConvert2string = (n: number, fractDigits?: number): string => {
  const nLog10 = Math.log10(Math.abs(n));

  let nLog10Near = 0;
  //const nLog10Rem3 = nLog10 % 3;
  if (nLog10 < -1) {
    nLog10Near = Math.floor(nLog10 / 3) * 3;
  } else if (nLog10 > -1 || nLog10 < 1) {
    nLog10Near = 0;
  } else if (nLog10 > 1) {
    nLog10Near = Math.floor(nLog10 / 3 - 1) * 3;
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

  let final = "";

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
  const num = parseFloat(input.trim());
  const unit = input.trim().slice(-1);

  let factor = 1;
  switch (unit) {
    case "G":
      factor = 1e9;
      break;
    case "M":
      factor = 1e6;
      break;
    case "k":
      factor = 1e3;
      break;
    case "m":
      factor = 1e-3;
      break;
    case "u":
      factor = 1e-6;
      break;
    case "n":
      factor = 1e-9;
      break;
    case "p":
      factor = 1e-12;
      break;
    case "f":
      factor = 1e-15;
      break;
    default:
      factor = 1;
      break;
  }

  const numOut = num * factor;

  return numOut;
};
