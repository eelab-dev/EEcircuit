import { formatEngineering } from "../components/ScientificPlot/utils/formatUtils";

/** Phase suffixes override the engine's original voltage/current type. */
export function plotUnit(name: string, type?: string): string {
  const lower = name.toLowerCase();
  if (lower.endsWith("[phase]")) return "°";
  if (lower === "frequency" || type === "frequency") return "Hz";
  if (lower === "time" || type === "time") return "s";
  if (/^v\(/.test(lower) || type === "voltage") return "V";
  if (/^i\(/.test(lower) || lower.replace(/\[mag\]$/, "").endsWith("#branch") || type === "current") return "A";
  return "";
}

export function formatPlotValue(value: number, unit: string, decimals = 3): string {
  if (unit.includes(", ")) return unit.split(", ").map((item) => formatPlotValue(value, item, decimals)).join(" / ");
  const text = unit === "°" ? value.toFixed(decimals) : formatEngineering(value, decimals);
  if (!unit) return text;
  const prefix = unit === "°" ? undefined : text.match(/([TGMkμmnpf])$/)?.[1];
  return prefix ? `${text.slice(0, -prefix.length)} ${prefix}${unit}` : `${text} ${unit}`;
}

export function plotAxisLabel(name: string, units: string[]): string {
  const unique = [...new Set(units.filter(Boolean))];
  return unique.length ? `${name} (${unique.join(", ")})` : name;
}
