import { ResultType, ComplexNumber } from "eecircuit-engine";
import type { SimulationWorkerResult } from "./parallelSimulation";
import type { BracketOperation } from "../utils/bracketParser";
import { 
  processComplexArray, 
  isComplexDataType
} from "../utils/complexUtils";

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

  // Log aggregation info only for complete results to reduce console spam
  if (successfulResults.length > 5) {
    console.log(`Aggregating ${successfulResults.length} results (${results.length - successfulResults.length} failed)`);
  }

  // Use the first result as the base structure
  const baseResult = successfulResults[0]!.result!;
  
  // For bracket operations, keep original variable names (transformation happens elsewhere)
  const expandedVariableNames = baseResult.variableNames;
  
  const aggregated: AggregatedResult = {
    header: baseResult.header,
    numVariables: expandedVariableNames.length,
    variableNames: expandedVariableNames,
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
  const originalNumberOfVariables = baseResult.variableNames.length;
  const isComplex = isComplexDataType(baseResult.dataType);
  
  // Initialize data arrays for each expanded variable (includes mag/phase for complex data)
  for (let varIndex = 0; varIndex < expandedVariableNames.length; varIndex++) {
    aggregated.data[varIndex] = {
      values: [],
      name: expandedVariableNames[varIndex]!
    };
  }

  // Initialize bracket plot data for separate lines
  aggregated.bracketPlotData = [];

  // Combine data from all results
  for (const workerResult of successfulResults) {
    const result = workerResult.result!;
    
    // Verify structure compatibility
    if (result.variableNames.length !== originalNumberOfVariables) {
      console.warn(`Result structure mismatch for parameter ${workerResult.parameterValue}`);
      continue;
    }

    // Create separate plot data for this parameter sweep
    const parameterPlotData = {
      parameterValue: workerResult.parameterValue,
      parameterIndex: workerResult.parameterIndex,
      data: [] as Array<{ values: number[]; name: string }>
    };

    // Process each original variable
    let expandedVarIndex = 0;
    
    for (let originalVarIndex = 0; originalVarIndex < originalNumberOfVariables; originalVarIndex++) {
      if (result.data[originalVarIndex] && result.data[originalVarIndex]!.values) {
        const values = result.data[originalVarIndex]!.values;
        
        if (originalVarIndex === 0) {
          // First variable (frequency/time) - keep as is, no expansion
          const processedValues = values as number[];
          
          // Add to concatenated data
          aggregated.data[expandedVarIndex]!.values.push(...processedValues);
          
          // Add to separate parameter plot data
          parameterPlotData.data[expandedVarIndex] = {
            values: [...processedValues],
            name: expandedVariableNames[expandedVarIndex]!
          };
          expandedVarIndex++;
          
        } else if (isComplex && typeof values[0] !== 'number') {
          // Complex data - expand to magnitude and phase
          const { magnitudes, phases } = processComplexArray(
            values as (number | ComplexNumber)[]
          );
          
          // Add magnitude data
          aggregated.data[expandedVarIndex]!.values.push(...magnitudes);
          parameterPlotData.data[expandedVarIndex] = {
            values: [...magnitudes],
            name: expandedVariableNames[expandedVarIndex]!
          };
          expandedVarIndex++;
          
          // Add phase data  
          aggregated.data[expandedVarIndex]!.values.push(...phases);
          parameterPlotData.data[expandedVarIndex] = {
            values: [...phases],
            name: expandedVariableNames[expandedVarIndex]!
          };
          expandedVarIndex++;
          
        } else {
          // Real data or complex data that's already been processed as numbers
          let processedValues: number[];
          
          if (typeof values[0] === 'number') {
            processedValues = values as number[];
          } else {
            // This shouldn't happen with proper complex detection, but handle gracefully
            const { magnitudes } = processComplexArray(
              values as (number | ComplexNumber)[]
            );
            processedValues = magnitudes;
          }
          
          // Add to concatenated data
          aggregated.data[expandedVarIndex]!.values.push(...processedValues);
          
          // Add to separate parameter plot data
          parameterPlotData.data[expandedVarIndex] = {
            values: [...processedValues],
            name: expandedVariableNames[expandedVarIndex]!
          };
          expandedVarIndex++;
        }
      }
    }

    // Add this parameter's plot data to the collection
    aggregated.bracketPlotData.push(parameterPlotData);
  }

  // Calculate total number of points
  aggregated.numPoints = aggregated.data[0]?.values?.length || 0;

  // Log aggregation summary only for final results
  if (successfulResults.length > 10) {
    console.log(`Aggregated ${successfulResults.length} results with ${aggregated.numPoints} total data points`);
  }
  
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
  const baseVariableNames = successfulResults[0]!.result!.variableNames;
  const baseVariableCount = baseVariableNames.length;

  for (let i = 1; i < successfulResults.length; i++) {
    const result = successfulResults[i]!.result!;
    
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