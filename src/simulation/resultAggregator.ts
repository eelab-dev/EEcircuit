import { ResultType } from "eecircuit-engine";
import type { SimulationWorkerResult } from "./parallelSimulation";
import type { BracketOperation } from "../utils/bracketParser";

export interface AggregatedResult {
  // Base result data compatible with ResultType
  header: string;
  numVariables: number;
  variableNames: string[];
  numPoints: number;
  dataType: "real" | "complex";
  data: Array<{ values: number[]; name: string }>;
  
  // Additional metadata for bracket operations
  bracketOperation?: BracketOperation;
  parameterValues?: string[];
  parameterCount?: number;
  successfulResults?: number;
  failedResults?: number;
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

  // Combine data from all results
  for (const workerResult of successfulResults) {
    const result = workerResult.result!;
    
    // Verify structure compatibility
    if (result.variableNames.length !== numberOfVariables) {
      console.warn(`Result structure mismatch for parameter ${workerResult.parameterValue}`);
      continue;
    }

    // Add data from this result to the aggregated data
    for (let varIndex = 0; varIndex < numberOfVariables; varIndex++) {
      if (result.data[varIndex] && result.data[varIndex].values) {
        // Handle both real and complex data types
        const values = result.data[varIndex].values;
        if (typeof values[0] === 'number') {
          // Real data
          aggregated.data[varIndex].values.push(...(values as number[]));
        } else {
          // Complex data - convert to real (magnitude) for now
          // TODO: Proper complex number handling
          const realValues = values.map(v => 
            typeof v === 'number' ? v : Math.sqrt((v as any).real ** 2 + (v as any).imag ** 2)
          );
          aggregated.data[varIndex].values.push(...realValues);
        }
      }
    }
  }

  // Calculate total number of points
  aggregated.numPoints = aggregated.data[0]?.values?.length || 0;

  // Log aggregation summary
  console.log(`Aggregated ${successfulResults.length} results with ${aggregated.numPoints} total data points`);
  
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

  // Add metadata about partial status
  return {
    ...aggregated,
    parameterCount: results.filter(r => r.success).length,
    successfulResults: results.filter(r => r.success).length,
    failedResults: results.filter(r => !r.success).length,
    // Could add progress indicators here
  };
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