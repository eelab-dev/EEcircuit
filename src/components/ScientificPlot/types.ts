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
  lineThickness: number;
}

// Copied from resultAggregator.ts to make component independent
import type { BracketOperation } from "../../utils/bracketParser";

export interface AggregatedResult extends Omit<ResultType, 'data'> {
  // Extended result data for bracket operations
  data: Array<{ values: number[]; name: string }>;

  // Additional metadata for bracket operations
  bracketOperation?: BracketOperation;
  parameterValues?: string[];
  parameterCount?: number;
  successfulResults?: number;
  failedResults?: number;

  // Bracket operation specific plotting data
  bracketPlotData?: Array<{
    parameterValue: string;
    parameterIndex: number;
    data: Array<{ values: number[]; name: string }>;
  }>;
}

export interface ScientificPlotProps {
  results: ResultType[];
  config: PlotConfig; // Controlled component: config is required and source of truth
  onExportCSV?: (results: ResultType[]) => void;
  inputProfile?: InputProfile;
  isDarkMode?: boolean;
  isBracketOperationPlot?: boolean;
  bracketOperationResults?: AggregatedResult;
  
  // Customization & Control
  canvas1Title?: string;
  canvas2Title?: string;
  canvas1Filter?: (variable: string) => boolean;
  canvas2Filter?: (variable: string) => boolean;
  lockNumCanvases?: boolean;
  onConfigChange?: (config: Partial<PlotConfig>) => void;
  lineThickness?: number;
}
