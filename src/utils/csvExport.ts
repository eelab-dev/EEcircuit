import { ResultType } from "eecircuit-engine";

export function escapeCsvField(value: unknown): string {
  const text = String(value ?? "");
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export const resultsToCSVString = (results: ResultType[]): string | null => {
  const result = results[0];
  if (!result?.data || !result.variableNames) return null;
  const rows = [result.variableNames.map(escapeCsvField).join(",")];
  const pointCount = Math.max(0, ...result.data.map((dataSet) => dataSet.values?.length ?? 0));
  for (let index = 0; index < pointCount; index++) {
    rows.push(result.data.map((dataSet) => escapeCsvField(dataSet.values?.[index])).join(","));
  }
  return `${rows.join("\r\n")}\r\n`;
};

export const exportResultsToCSV = (results: ResultType[], filename = "simulation_results.csv"): void => {
  const csvContent = resultsToCSVString(results);
  if (!csvContent) return;
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = filename;
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};
