import { ResultType } from "eecircuit-engine";

/**
 * Export simulation results to CSV format
 * @param results - Array of simulation results
 * @param filename - Optional filename for the downloaded file
 */
export const exportResultsToCSV = (
  results: ResultType[],
  filename = "simulation_results.csv"
): void => {
  if (!results || results.length === 0) {
    console.warn("No results to export");
    return;
  }

  const result = results[0]!; // Use first result
  if (!result.data || !result.variableNames) {
    console.warn("Invalid result data");
    return;
  }

  // Create CSV header
  const headers = result.variableNames.join(",");
  
  // Create CSV rows
  const rows: string[] = [];
  const numDataPoints = result.data[0]?.values?.length || 0;
  
  for (let i = 0; i < numDataPoints; i++) {
    const row: string[] = [];
    result.data.forEach((dataSet) => {
      if (dataSet.values && i < dataSet.values.length) {
        row.push(dataSet.values[i]!.toString());
      } else {
        row.push("");
      }
    });
    rows.push(row.join(","));
  }

  // Combine header and rows
  const csvContent = [headers, ...rows].join("\n");

  // Create and download file
  downloadCSV(csvContent, filename);
};

/**
 * Download CSV content as a file
 * @param csvContent - The CSV content as a string
 * @param filename - The filename for the download
 */
const downloadCSV = (csvContent: string, filename: string): void => {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up the object URL
  URL.revokeObjectURL(url);
};
