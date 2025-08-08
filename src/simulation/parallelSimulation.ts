import { ResultType } from "eecircuit-engine";
import { expandNetlist } from "../utils/netlistExpander";

export interface SimulationWorkerResult {
  success: boolean;
  result?: ResultType;
  error?: string;
  parameterValue: string;
  parameterIndex: number;
}

export interface ParallelSimulationOptions {
  maxWorkers?: number;
  timeout?: number; // milliseconds
  onProgress?: (completed: number, total: number, results: SimulationWorkerResult[]) => void;
  onResult?: (result: SimulationWorkerResult) => void;
}

export interface ParallelSimulationResult {
  success: boolean;
  results: SimulationWorkerResult[];
  totalSimulations: number;
  successfulSimulations: number;
  failedSimulations: number;
  error?: string;
}

// Default configuration
const DEFAULT_MAX_WORKERS = 4;
const DEFAULT_TIMEOUT = 30000; // 30 seconds per simulation

/**
 * Worker pool for managing parallel simulations
 */
class SimulationWorkerPool {
  private workers: Worker[] = [];
  private availableWorkers: Worker[] = [];
  private busyWorkers: Set<Worker> = new Set();
  private maxWorkers: number;

  constructor(maxWorkers: number = DEFAULT_MAX_WORKERS) {
    this.maxWorkers = Math.min(maxWorkers, navigator.hardwareConcurrency || 4);
  }

  async initialize(): Promise<void> {
    // Create workers
    for (let i = 0; i < this.maxWorkers; i++) {
      try {
        // Create a web worker that imports and uses eecircuit-engine
        const worker = new Worker(
          new URL('../workers/simulationWorker.ts', import.meta.url),
          { type: 'module' }
        );
        
        this.workers.push(worker);
        this.availableWorkers.push(worker);
      } catch (error) {
        console.warn(`Failed to create worker ${i}:`, error);
      }
    }

    if (this.workers.length === 0) {
      throw new Error('Failed to create any simulation workers');
    }

    console.log(`Initialized ${this.workers.length} simulation workers`);
  }

  getAvailableWorker(): Worker | null {
    const worker = this.availableWorkers.pop();
    if (worker) {
      this.busyWorkers.add(worker);
    }
    return worker || null;
  }

  releaseWorker(worker: Worker): void {
    if (this.busyWorkers.has(worker)) {
      this.busyWorkers.delete(worker);
      this.availableWorkers.push(worker);
    }
  }

  terminate(): void {
    this.workers.forEach(worker => {
      worker.terminate();
    });
    this.workers = [];
    this.availableWorkers = [];
    this.busyWorkers.clear();
  }

  get availableCount(): number {
    return this.availableWorkers.length;
  }

  get totalCount(): number {
    return this.workers.length;
  }
}

/**
 * Run a single simulation in a web worker
 */
async function runSimulationInWorker(
  worker: Worker,
  netlist: string,
  parameterValue: string,
  parameterIndex: number,
  timeout: number = DEFAULT_TIMEOUT
): Promise<SimulationWorkerResult> {
  return new Promise((resolve) => {
    let timeoutId: NodeJS.Timeout;
    let resolved = false;

    const handleMessage = (event: MessageEvent) => {
      if (resolved) return;
      resolved = true;

      clearTimeout(timeoutId);
      worker.removeEventListener('message', handleMessage);
      worker.removeEventListener('error', handleError);

      const { success, result, error } = event.data;
      
      resolve({
        success,
        result,
        error,
        parameterValue,
        parameterIndex
      });
    };

    const handleError = (error: ErrorEvent) => {
      if (resolved) return;
      resolved = true;

      clearTimeout(timeoutId);
      worker.removeEventListener('message', handleMessage);
      worker.removeEventListener('error', handleError);

      resolve({
        success: false,
        error: `Worker error: ${error.message}`,
        parameterValue,
        parameterIndex
      });
    };

    const handleTimeout = () => {
      if (resolved) return;
      resolved = true;

      worker.removeEventListener('message', handleMessage);
      worker.removeEventListener('error', handleError);

      resolve({
        success: false,
        error: `Simulation timeout after ${timeout}ms`,
        parameterValue,
        parameterIndex
      });
    };

    // Set up event listeners
    worker.addEventListener('message', handleMessage);
    worker.addEventListener('error', handleError);

    // Set up timeout
    timeoutId = setTimeout(handleTimeout, timeout);

    // Send netlist to worker
    worker.postMessage({ netlist });
  });
}

/**
 * Run parallel simulations using bracket operation
 */
export async function runParallelSimulation(
  netlist: string,
  options: ParallelSimulationOptions = {}
): Promise<ParallelSimulationResult> {
  const {
    maxWorkers = DEFAULT_MAX_WORKERS,
    timeout = DEFAULT_TIMEOUT,
    onProgress,
    onResult
  } = options;

  try {
    // First, expand the netlist
    const expansionResult = expandNetlist(netlist);
    
    if (!expansionResult.hasExpansion || !expansionResult.expandedNetlists) {
      return {
        success: false,
        results: [],
        totalSimulations: 0,
        successfulSimulations: 0,
        failedSimulations: 0,
        error: 'No bracket operations found in netlist or expansion failed'
      };
    }

    const { expandedNetlists } = expansionResult;
    const totalSimulations = expandedNetlists.length;

    // Initialize worker pool
    const workerPool = new SimulationWorkerPool(maxWorkers);
    await workerPool.initialize();

    console.log(`Starting ${totalSimulations} parallel simulations with ${workerPool.totalCount} workers`);

    const results: SimulationWorkerResult[] = [];
    const pendingSimulations = [...expandedNetlists];
    const runningSimulations = new Map<Worker, Promise<SimulationWorkerResult>>();

    // Process simulations
    const processNext = async (): Promise<void> => {
      while (pendingSimulations.length > 0 || runningSimulations.size > 0) {
        // Start new simulations if workers are available
        while (pendingSimulations.length > 0 && workerPool.availableCount > 0) {
          const expandedNetlist = pendingSimulations.shift()!;
          const worker = workerPool.getAvailableWorker()!;

          const simulationPromise = runSimulationInWorker(
            worker,
            expandedNetlist.netlist,
            expandedNetlist.parameterValue,
            expandedNetlist.parameterIndex,
            timeout
          );

          runningSimulations.set(worker, simulationPromise);
        }

        // Wait for at least one simulation to complete
        if (runningSimulations.size > 0) {
          // Create array of promises with their corresponding workers
          const promiseWorkerPairs = Array.from(runningSimulations.entries()).map(([worker, promise]) => ({
            worker,
            promise: promise.then(result => ({ worker, result }))
          }));
          
          // Wait for the first one to complete
          const { worker, result } = await Promise.race(promiseWorkerPairs.map(pair => pair.promise));
          
          // Remove the completed simulation
          runningSimulations.delete(worker);
          workerPool.releaseWorker(worker);
          results.push(result);
          
          // Call progress and result callbacks
          if (onResult) {
            onResult(result);
          }
          if (onProgress) {
            onProgress(results.length, totalSimulations, results);
          }
          
          console.log(`Completed simulation ${results.length}/${totalSimulations}: ${result.parameterValue} (${result.success ? 'success' : 'failed'})`);
        }
      }
    };

    await processNext();

    // Clean up worker pool
    workerPool.terminate();

    const successfulSimulations = results.filter(r => r.success).length;
    const failedSimulations = results.length - successfulSimulations;

    console.log(`Parallel simulation completed: ${successfulSimulations} successful, ${failedSimulations} failed`);
    console.log("Successful parameter values:", results.filter(r => r.success).map(r => r.parameterValue));
    console.log("Failed parameter values:", results.filter(r => !r.success).map(r => r.parameterValue));

    return {
      success: successfulSimulations > 0,
      results: results.sort((a, b) => a.parameterIndex - b.parameterIndex), // Sort by parameter index
      totalSimulations,
      successfulSimulations,
      failedSimulations
    };

  } catch (error) {
    console.error('Parallel simulation failed:', error);
    return {
      success: false,
      results: [],
      totalSimulations: 0,
      successfulSimulations: 0,
      failedSimulations: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Check if parallel simulation is supported in the current environment
 */
export function isParallelSimulationSupported(): boolean {
  return typeof Worker !== 'undefined' && typeof navigator !== 'undefined';
}