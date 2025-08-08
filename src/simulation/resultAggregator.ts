import { ResultType, ComplexNumber } from "eecircuit-engine";
import type { SimulationWorkerResult } from "./parallelSimulation";
import type { BracketOperation } from "../utils/bracketParser";

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
  // Each element represents one parameter sweep as a separate line
  bracketPlotData?: Array<{
    parameterValue: string;
    parameterIndex: number;
    data: Array<{ values: number[]; name: string }>;
  }>;
}

export interface AggregationOptions {
  preserveParameterInfo?: boolean;
  sortByParameter?: boolean;
}

/**
 * Aggregate results from parallel simulations into a single result structure
 * All successful results are combined while preserving parameter sweep information
 */
export function aggregateParallelResults(
  results: SimulationWorkerResult[],
  bracketOperation?: BracketOperation,
  options: AggregationOptions = {}
): AggregatedResult | null {
  const {
    preserveParameterInfo = true,
    sortByParameter = true
  } = options;

  // Filter successful results
  const successfulResults = results.filter(r => r.success && r.result);
  
  if (successfulResults.length === 0) {
    console.warn('No successful results to aggregate');
    return null;
  }

  // Sort by parameter index if requested
  if (sortByParameter) {
    successfulResults.sort((a, b) => a.parameterIndex - b.parameterIndex);
  }

  // Debug: Log which parameter values we received
  console.log("Parameter values received for aggregation:", successfulResults.map(r => r.parameterValue));
  console.log("Parameter indices received:", successfulResults.map(r => r.parameterIndex));
  console.log(`Total results: ${results.length}, Successful: ${successfulResults.length}, Failed: ${results.length - successfulResults.length}`);

  // Use the first result as the base structure
  const baseResult = successfulResults[0].result!;
  const aggregated: AggregatedResult = {
    header: baseResult.header,
    numVariables: baseResult.numVariables,
    variableNames: baseResult.variableNames,
    numPoints: 0, // Will be calculated after aggregation
    dataType: baseResult.dataType,
    data: [],
    // Add bracket operation metadata
    bracketOperation,
    parameterValues: preserveParameterInfo ? successfulResults.map(r => r.parameterValue) : undefined,
    parameterCount: successfulResults.length,
    successfulResults: successfulResults.length,
    failedResults: results.length - successfulResults.length
  };

  // Aggregate data from all successful results
  // Each variable will have data from all parameter sweeps concatenated
  const numberOfVariables = baseResult.variableNames.length;
  
  // Initialize data arrays for each variable
  for (let varIndex = 0; varIndex < numberOfVariables; varIndex++) {
    aggregated.data[varIndex] = {
      values: [],
      name: baseResult.variableNames[varIndex]
    };
  }

  // Initialize bracket plot data for separate lines
  aggregated.bracketPlotData = [];

  // Combine data from all results
  for (const workerResult of successfulResults) {
    const result = workerResult.result!;
    
    // Verify structure compatibility
    if (result.variableNames.length !== numberOfVariables) {
      console.warn(`Result structure mismatch for parameter ${workerResult.parameterValue}`);
      continue;
    }

    // Create separate plot data for this parameter sweep
    const parameterPlotData = {
      parameterValue: workerResult.parameterValue,
      parameterIndex: workerResult.parameterIndex,
      data: [] as Array<{ values: number[]; name: string }>
    };

    // Process each variable
    for (let varIndex = 0; varIndex < numberOfVariables; varIndex++) {
      if (result.data[varIndex] && result.data[varIndex].values) {
        // Handle both real and complex data types
        const values = result.data[varIndex].values;
        let processedValues: number[];
        
        if (typeof values[0] === 'number') {
          // Real data
          processedValues = values as number[];
        } else {
          // Complex data - convert to real (magnitude) for now
          // TODO: Proper complex number handling
          processedValues = values.map(v => {
            if (typeof v === 'number') {
              return v;
            } else {
              const complexV = v as ComplexNumber;
              return Math.sqrt(complexV.real ** 2 + complexV.img ** 2);
            }
          });
        }

        // Add to concatenated data (for backward compatibility)
        aggregated.data[varIndex].values.push(...processedValues);

        // Add to separate parameter plot data
        parameterPlotData.data[varIndex] = {
          values: [...processedValues],
          name: baseResult.variableNames[varIndex]
        };
      }
    }

    // Add this parameter's plot data to the collection
    aggregated.bracketPlotData.push(parameterPlotData);
  }

  // Calculate total number of points
  aggregated.numPoints = aggregated.data[0]?.values?.length || 0;

  // Log aggregation summary
  console.log(`Aggregated ${successfulResults.length} results with ${aggregated.numPoints} total data points`);
  console.log(`Created ${aggregated.bracketPlotData?.length || 0} bracket plot data entries`);
  
  return aggregated;
}

/**
 * Aggregate results progressively as they become available
 * This allows for real-time plotting of results as simulations complete
 */
export class ProgressiveResultAggregator {
  private currentResults: SimulationWorkerResult[] = [];
  private bracketOperation?: BracketOperation;
  private onUpdate?: (aggregatedResult: AggregatedResult | null) => void;
  
  constructor(
    bracketOperation?: BracketOperation,
    onUpdate?: (aggregatedResult: AggregatedResult | null) => void
  ) {
    this.bracketOperation = bracketOperation;
    this.onUpdate = onUpdate;
  }

  /**
   * Add a new result and trigger aggregation
   */
  addResult(result: SimulationWorkerResult): void {
    this.currentResults.push(result);
    
    // Aggregate current results and notify
    const aggregated = aggregateParallelResults(
      this.currentResults,
      this.bracketOperation,
      { preserveParameterInfo: true, sortByParameter: true }
    );
    
    if (this.onUpdate) {
      this.onUpdate(aggregated);
    }
  }

  /**
   * Get the current aggregated result
   */
  getCurrentAggregation(): AggregatedResult | null {
    return aggregateParallelResults(
      this.currentResults,
      this.bracketOperation,
      { preserveParameterInfo: true, sortByParameter: true }
    );
  }

  /**
   * Reset the aggregator
   */
  reset(): void {
    this.currentResults = [];
  }

  /**
   * Get statistics about current results
   */
  getStats(): {
    total: number;
    successful: number;
    failed: number;
    completionPercentage: number;
  } {
    const total = this.currentResults.length;
    const successful = this.currentResults.filter(r => r.success).length;
    const failed = total - successful;
    
    return {
      total,
      successful,
      failed,
      completionPercentage: total > 0 ? (successful / total) * 100 : 0
    };
  }
}

/**
 * Create a result that represents a partial aggregation
 * Used for progressive plotting when not all simulations have completed
 */
export function createPartialAggregation(
  results: SimulationWorkerResult[],
  expectedTotal: number,
  bracketOperation?: BracketOperation
): AggregatedResult | null {
  const aggregated = aggregateParallelResults(results, bracketOperation);
  
  if (!aggregated) {
    return null;
  }

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const total = results.length;

  // Add metadata about partial status including progress
  return {
    ...aggregated,
    parameterCount: successful,
    successfulResults: successful,
    failedResults: failed,
    // Add progress calculation using expectedTotal
    completionPercentage: expectedTotal > 0 ? (total / expectedTotal) * 100 : 0,
  } as AggregatedResult & { completionPercentage: number };
}

/**
 * Validate that results can be aggregated together
 */
export function canAggregateResults(results: SimulationWorkerResult[]): {
  canAggregate: boolean;
  reason?: string;
} {
  const successfulResults = results.filter(r => r.success && r.result);
  
  if (successfulResults.length === 0) {
    return {
      canAggregate: false,
      reason: 'No successful results to aggregate'
    };
  }

  // Check that all results have compatible structure
  const baseVariableNames = successfulResults[0].result!.variableNames;
  const baseVariableCount = baseVariableNames.length;

  for (let i = 1; i < successfulResults.length; i++) {
    const result = successfulResults[i].result!;
    
    if (result.variableNames.length !== baseVariableCount) {
      return {
        canAggregate: false,
        reason: `Variable count mismatch: expected ${baseVariableCount}, got ${result.variableNames.length} in result ${i}`
      };
    }

    // Check variable name compatibility
    for (let j = 0; j < baseVariableCount; j++) {
      if (result.variableNames[j] !== baseVariableNames[j]) {
        return {
          canAggregate: false,
          reason: `Variable name mismatch at index ${j}: expected '${baseVariableNames[j]}', got '${result.variableNames[j]}' in result ${i}`
        };
      }
    }
  }

  return { canAggregate: true };
}