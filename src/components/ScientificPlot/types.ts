import { ResultType } from "eecircuit-engine";

export type InputProfile = "mouse" | "trackpad" | "touchscreen";

export interface PlotConfig {
  numCanvases: 1 | 2;
  isLogX: boolean;
  isLogY: boolean;
  isLogY1: boolean;
  isLogY2: boolean;
  selectedVariables: string[]; // For single canvas
  canvas1SelectedVariables: string[]; // For dual canvas
  canvas2SelectedVariables: string[]; // For dual canvas
}

import type { AggregatedResult } from "../../simulation/resultAggregator";

export interface ScientificPlotProps {
  results: ResultType[];
  initialConfig?: Partial<PlotConfig>;
  onExportCSV?: (results: ResultType[]) => void;
  inputProfile?: InputProfile;
  isDarkMode?: boolean;
  isBracketOperationPlot?: boolean;
  bracketOperationResults?: AggregatedResult;
}
