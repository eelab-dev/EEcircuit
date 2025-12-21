import { ResultType } from "eecircuit-engine";
import { expandNetlist } from "../utils/netlistExpander";

export interface SimulationWorkerResult {
  success: boolean;
  result?: ResultType;
  errorMessage?: string;
  errorDetails?: string[];
  parameterValue: string;
  parameterIndex: number;
}

export interface ParallelSimulationOptions {
  maxWorkers?: number;
  timeout?: number; // milliseconds
  onProgress?: (
    completed: number,
    total: number,
    results: SimulationWorkerResult[]
  ) => void;
  onResult?: (result: SimulationWorkerResult) => void;
  onThreadUpdate?: (
    threadId: number,
    status: "start" | "complete",
    currentSim?: { parameterValue: string; parameterIndex: number }
  ) => void;
}

export interface ParallelSimulationResult {
  success: boolean;
  results: SimulationWorkerResult[];
  totalSimulations: number;
  successfulSimulations: number;
  failedSimulations: number;
  errorMessage?: string;
}

// Default configuration
const DEFAULT_MAX_WORKERS = 4;
const DEFAULT_TIMEOUT = 30000; // 30 seconds per simulation

/**
 * Global worker pool for managing persistent parallel simulation workers
 */
class GlobalSimulationWorkerPool {
  private static instance: GlobalSimulationWorkerPool | null = null;
  private workers: Worker[] = [];
  private availableWorkers: Worker[] = [];
  private busyWorkers: Set<Worker> = new Set();
  private workerToThreadId: Map<Worker, number> = new Map();
  private isInitialized: boolean = false;
  private maxWorkers: number;

  private constructor(maxWorkers: number = DEFAULT_MAX_WORKERS) {
    this.maxWorkers = Math.min(maxWorkers, navigator.hardwareConcurrency || 4);
  }

  static getInstance(maxWorkers?: number): GlobalSimulationWorkerPool {
    if (!GlobalSimulationWorkerPool.instance) {
      GlobalSimulationWorkerPool.instance = new GlobalSimulationWorkerPool(maxWorkers);
    }
    return GlobalSimulationWorkerPool.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log(`✓ Reusing ${this.workers.length} persistent simulation workers (startup overhead avoided)`);
      return;
    }

    // Create workers
    for (let i = 0; i < this.maxWorkers; i++) {
      try {
        // Create a web worker that imports and uses eecircuit-engine
        const worker = new Worker(
          new URL("../workers/simulationWorker.ts", import.meta.url),
          { type: "module" }
        );

        this.workers.push(worker);
        this.availableWorkers.push(worker);
        this.workerToThreadId.set(worker, i); // Map worker to thread ID
      } catch (error) {
        console.warn(`Failed to create worker ${i}:`, error);
      }
    }

    if (this.workers.length === 0) {
      throw new Error("Failed to create any simulation workers");
    }

    this.isInitialized = true;
    console.log(`🚀 Initialized ${this.workers.length} persistent simulation workers (first-time setup)`);
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

  resetForNewSession(): void {
    // Move all busy workers back to available (in case of interruption)
    this.busyWorkers.forEach(worker => {
      this.availableWorkers.push(worker);
    });
    this.busyWorkers.clear();
  }

  terminate(): void {
    this.workers.forEach((worker) => {
      worker.terminate();
    });
    this.workers = [];
    this.availableWorkers = [];
    this.busyWorkers.clear();
    this.workerToThreadId.clear();
    this.isInitialized = false;
    GlobalSimulationWorkerPool.instance = null;
  }

  getThreadId(worker: Worker): number {
    return this.workerToThreadId.get(worker) ?? -1;
  }

  get availableCount(): number {
    return this.availableWorkers.length;
  }

  get totalCount(): number {
    return this.workers.length;
  }

  get initialized(): boolean {
    return this.isInitialized;
  }
}

// Add cleanup on page unload to properly terminate workers
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    const pool = GlobalSimulationWorkerPool.getInstance();
    if (pool.initialized) {
      pool.terminate();
    }
  });

  // Make debugging functions available globally for testing
  (window as unknown as { _workerPoolDebug: { 
    getStatus: () => { initialized: boolean; totalWorkers: number; availableWorkers: number; busyWorkers: number }; 
    cleanup: () => void 
  } })._workerPoolDebug = {
    getStatus: getWorkerPoolStatus,
    cleanup: cleanupPersistentWorkers
  };
}

/**
 * Run a single simulation in a web worker (internal use)
 */
export async function runSimulationInWorker(
  worker: Worker,
  netlist: string,
  parameterValue: string,
  parameterIndex: number,
  timeout: number = DEFAULT_TIMEOUT
): Promise<SimulationWorkerResult> {
  return new Promise((resolve) => {
    let resolved = false;

    const handleMessage = (event: MessageEvent) => {
      if (resolved) return;
      resolved = true;

      clearTimeout(timeoutId);
      worker.removeEventListener("message", handleMessage);
      worker.removeEventListener("error", handleError);

      const {
        success,
        result,
        errorMessage,
        errorDetails,
      } = event.data as {
        success: boolean;
        result?: ResultType;
        errorMessage?: string;
        errorDetails?: string[];
      };

      resolve({
        success,
        result,
        errorMessage,
        errorDetails,
        parameterValue,
        parameterIndex,
      });
    };

    const handleError = (error: ErrorEvent) => {
      if (resolved) return;
      resolved = true;

      clearTimeout(timeoutId);
      worker.removeEventListener("message", handleMessage);
      worker.removeEventListener("error", handleError);

      resolve({
        success: false,
        errorMessage: `Worker error: ${error.message}`,
        parameterValue,
        parameterIndex,
      });
    };

    const handleTimeout = () => {
      if (resolved) return;
      resolved = true;

      worker.removeEventListener("message", handleMessage);
      worker.removeEventListener("error", handleError);

      resolve({
        success: false,
        errorMessage: `Simulation timeout after ${timeout}ms`,
        parameterValue,
        parameterIndex,
      });
    };

    // Set up event listeners
    worker.addEventListener("message", handleMessage);
    worker.addEventListener("error", handleError);

    // Set up timeout
    const timeoutId = setTimeout(handleTimeout, timeout) as unknown as number;

    // Send netlist to worker
    worker.postMessage({ netlist });
  });
}

/**
 * Run a single simulation using the worker pool
 */
export async function runSingleSimulation(
  netlist: string,
  timeout: number = DEFAULT_TIMEOUT
): Promise<SimulationWorkerResult> {
  const workerPool = GlobalSimulationWorkerPool.getInstance();
  await workerPool.initialize();
  
  workerPool.resetForNewSession();
  
  const worker = workerPool.getAvailableWorker();
  if (!worker) {
    throw new Error("No simulation workers available");
  }

  try {
    return await runSimulationInWorker(
      worker,
      netlist,
      "", // No parameter value
      0,  // Parameter index 0
      timeout
    );
  } finally {
    workerPool.releaseWorker(worker);
  }
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
    onResult,
    onThreadUpdate,
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
        errorMessage: "No bracket operations found in netlist or expansion failed",
      };
    }

    const { expandedNetlists } = expansionResult;
    const totalSimulations = expandedNetlists.length;

    // [DEBUG][ParallelSimulation] Print all expanded netlist configs for verification
    // This helps verify the bracket expansion produced the correct set of netlists
    console.log(
      "[DEBUG][ParallelSimulation] Expanded netlist configs:",
      expandedNetlists.map((e) => e.netlist)
    );

    // Get global worker pool instance
    const workerPool = GlobalSimulationWorkerPool.getInstance(maxWorkers);
    await workerPool.initialize();
    
    // Reset pool state for new simulation session
    workerPool.resetForNewSession();

    console.log(
      `Starting ${totalSimulations} parallel simulations with ${workerPool.totalCount} workers`
    );

    const results: SimulationWorkerResult[] = [];
    const pendingSimulations = [...expandedNetlists];
    const runningSimulations = new Map<
      Worker,
      Promise<SimulationWorkerResult>
    >();

    // Process simulations
    const processNext = async (): Promise<void> => {
      while (pendingSimulations.length > 0 || runningSimulations.size > 0) {
        // Start new simulations if workers are available
        while (pendingSimulations.length > 0 && workerPool.availableCount > 0) {
          const expandedNetlist = pendingSimulations.shift()!;
          const worker = workerPool.getAvailableWorker()!;
          const threadId = workerPool.getThreadId(worker);

          // Notify thread started working on this simulation
          if (onThreadUpdate) {
            onThreadUpdate(threadId, "start", {
              parameterValue: expandedNetlist.parameterValue,
              parameterIndex: expandedNetlist.parameterIndex,
            });
          }

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
          const promiseWorkerPairs = Array.from(
            runningSimulations.entries()
          ).map(([worker, promise]) => ({
            worker,
            promise: promise.then((result) => ({ worker, result })),
          }));

          // Wait for the first one to complete
          const { worker, result } = await Promise.race(
            promiseWorkerPairs.map((pair) => pair.promise)
          );
          const threadId = workerPool.getThreadId(worker);

          // Remove the completed simulation
          runningSimulations.delete(worker);
          workerPool.releaseWorker(worker);
          results.push(result);

          // Notify thread completed this simulation
          if (onThreadUpdate) {
            onThreadUpdate(threadId, "complete", {
              parameterValue: result.parameterValue,
              parameterIndex: result.parameterIndex,
            });
          }

          // Call progress and result callbacks
          if (onResult) {
            onResult(result);
          }
          if (onProgress) {
            onProgress(results.length, totalSimulations, results);
          }
        }
      }
    };

    await processNext();

    // Workers remain persistent - do not terminate

    const successfulSimulations = results.filter((r) => r.success).length;
    const failedSimulations = results.length - successfulSimulations;

    console.log(
      `Parallel simulation completed: ${successfulSimulations} successful, ${failedSimulations} failed`
    );
    console.log(
      "Successful parameter values:",
      results.filter((r) => r.success).map((r) => r.parameterValue)
    );
    console.log(
      "Failed parameter values:",
      results.filter((r) => !r.success).map((r) => r.parameterValue)
    );

    return {
      success: successfulSimulations > 0,
      results: results.sort((a, b) => a.parameterIndex - b.parameterIndex), // Sort by parameter index
      totalSimulations,
      successfulSimulations,
      failedSimulations,
    };
  } catch (error) {
    console.error("Parallel simulation failed:", error);
    return {
      success: false,
      results: [],
      totalSimulations: 0,
      successfulSimulations: 0,
      failedSimulations: 0,
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Check if parallel simulation is supported in the current environment
 */
export function isParallelSimulationSupported(): boolean {
  return typeof Worker !== "undefined" && typeof navigator !== "undefined";
}

/**
 * Manually cleanup all persistent workers (for testing or forced cleanup)
 */
export function cleanupPersistentWorkers(): void {
  const pool = GlobalSimulationWorkerPool.getInstance();
  if (pool.initialized) {
    console.log('Manually terminating persistent simulation workers');
    pool.terminate();
  }
}

/**
 * Get information about the persistent worker pool status (for debugging)
 */
export function getWorkerPoolStatus(): {
  initialized: boolean;
  totalWorkers: number;
  availableWorkers: number;
  busyWorkers: number;
} {
  const pool = GlobalSimulationWorkerPool.getInstance();
  return {
    initialized: pool.initialized,
    totalWorkers: pool.totalCount,
    availableWorkers: pool.availableCount,
    busyWorkers: pool.totalCount - pool.availableCount,
  };
}
