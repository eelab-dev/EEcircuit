import { ResultType } from "eecircuit-engine";
import { expandNetlist } from "../utils/netlistExpander";

export interface SimulationWorkerResult {
  success: boolean;
  result?: ResultType;
  errorMessage?: string;
  errorDetails?: string[];
  parameterValue: string;
  parameterIndex: number;
  timedOut?: boolean;
  cancelled?: boolean;
}

export interface ParallelSimulationOptions {
  maxWorkers?: number;
  timeout?: number; // milliseconds
  signal?: AbortSignal;
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
  private initializationPromise: Promise<void> | null = null;
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
      return;
    }
    if (this.initializationPromise) return this.initializationPromise;

    this.initializationPromise = (async () => {
      for (let i = 0; i < this.maxWorkers; i++) {
        try {
          const worker = new Worker(new URL("../workers/simulationWorker.ts", import.meta.url), { type: "module" });
          this.workers.push(worker);
          this.availableWorkers.push(worker);
          this.workerToThreadId.set(worker, i);
        } catch (error) {
          console.warn(`Failed to create worker ${i}:`, error);
        }
      }
      if (this.workers.length === 0) throw new Error("Failed to create any simulation workers");
      this.isInitialized = true;
    })();
    try {
      await this.initializationPromise;
    } finally {
      this.initializationPromise = null;
    }
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

  async reconfigure(maxWorkers: number): Promise<void> {
    const requested = Math.max(1, Math.floor(maxWorkers));
    const desired = Math.min(requested, navigator.hardwareConcurrency || 4);
    if (desired === this.maxWorkers && this.isInitialized) return;
    this.maxWorkers = desired;
    if (this.busyWorkers.size > 0) return;
    if (this.isInitialized) this.terminate(false);
    await this.initialize();
  }

  replaceWorker(worker: Worker): void {
    const threadId = this.workerToThreadId.get(worker) ?? -1;
    this.workers = this.workers.filter((candidate) => candidate !== worker);
    this.availableWorkers = this.availableWorkers.filter((candidate) => candidate !== worker);
    this.busyWorkers.delete(worker);
    this.workerToThreadId.delete(worker);
    worker.terminate();
    try {
      const replacement = new Worker(new URL("../workers/simulationWorker.ts", import.meta.url), { type: "module" });
      this.workers.push(replacement);
      this.availableWorkers.push(replacement);
      this.workerToThreadId.set(replacement, threadId >= 0 ? threadId : this.workers.length - 1);
    } catch (error) {
      console.warn("Failed to replace simulation worker:", error);
    }
  }

  terminate(resetSingleton = true): void {
    this.workers.forEach((worker) => {
      worker.terminate();
    });
    this.workers = [];
    this.availableWorkers = [];
    this.busyWorkers.clear();
    this.workerToThreadId.clear();
    this.isInitialized = false;
    this.initializationPromise = null;
    if (resetSingleton) GlobalSimulationWorkerPool.instance = null;
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

interface ActiveSimulationSession {
  id: string;
  controller: AbortController;
  done: Promise<void>;
  resolveDone: () => void;
}

let activeSession: ActiveSimulationSession | null = null;

async function runLatestSession<T>(
  operation: (session: ActiveSimulationSession) => Promise<T>,
  signal?: AbortSignal,
): Promise<T> {
  if (activeSession) {
    activeSession.controller.abort();
    await activeSession.done;
  }

  const controller = new AbortController();
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener("abort", () => controller.abort(), { once: true });
  }
  let resolveDone: () => void = () => undefined;
  const done = new Promise<void>((resolve) => { resolveDone = resolve; });
  const session: ActiveSimulationSession = {
    id: crypto.randomUUID(),
    controller,
    done,
    resolveDone,
  };
  activeSession = session;

  try {
    return await operation(session);
  } finally {
    session.resolveDone();
    if (activeSession === session) activeSession = null;
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
  timeout: number = DEFAULT_TIMEOUT,
  sessionId: string = crypto.randomUUID(),
  requestId: string = crypto.randomUUID(),
  signal?: AbortSignal,
): Promise<SimulationWorkerResult> {
  return new Promise((resolve) => {
    let resolved = false;

    const finish = (result: SimulationWorkerResult) => {
      if (resolved) return;
      resolved = true;
      clearTimeout(timeoutId);
      worker.removeEventListener("message", handleMessage);
      worker.removeEventListener("error", handleError);
      signal?.removeEventListener("abort", handleAbort);
      resolve(result);
    };

    const handleMessage = (event: MessageEvent) => {
      if (resolved) return;
      const message = event.data as {
        sessionId?: string;
        requestId?: string;
        success: boolean;
        result?: ResultType;
        errorMessage?: string;
        errorDetails?: string[];
      };
      if (message.sessionId !== sessionId || message.requestId !== requestId) return;
      finish({
        success: message.success,
        result: message.result,
        errorMessage: message.errorMessage,
        errorDetails: message.errorDetails,
        parameterValue,
        parameterIndex,
      });
    };

    const handleError = (error: ErrorEvent) => {
      if (resolved) return;
      finish({
        success: false,
        errorMessage: `Worker error: ${error.message}`,
        parameterValue,
        parameterIndex,
        timedOut: false,
      });
    };

    const handleTimeout = () => {
      if (resolved) return;
      finish({
        success: false,
        errorMessage: `Simulation timeout after ${timeout}ms`,
        parameterValue,
        parameterIndex,
        timedOut: true,
      });
    };

    const handleAbort = () => {
      if (resolved) return;
      finish({
        success: false,
        errorMessage: "Simulation cancelled",
        parameterValue,
        parameterIndex,
        cancelled: true,
      });
    };

    // Set up event listeners
    worker.addEventListener("message", handleMessage);
    worker.addEventListener("error", handleError);
    signal?.addEventListener("abort", handleAbort, { once: true });

    // Set up timeout
    const timeoutId = setTimeout(handleTimeout, timeout) as unknown as number;

    if (signal?.aborted) {
      handleAbort();
      return;
    }

    // Send netlist to worker
    worker.postMessage({ netlist, sessionId, requestId });
  });
}

/**
 * Run a single simulation using the worker pool
 */
export async function runSingleSimulation(
  netlist: string,
  timeout: number = DEFAULT_TIMEOUT,
  signal?: AbortSignal,
): Promise<SimulationWorkerResult> {
  return runLatestSession(async (session) => {
    const workerPool = GlobalSimulationWorkerPool.getInstance(1);
    await workerPool.reconfigure(1);
    await workerPool.initialize();
    const worker = workerPool.getAvailableWorker();
    if (!worker) throw new Error("No simulation workers available");
    try {
      const result = await runSimulationInWorker(worker, netlist, "", 0, timeout, session.id, crypto.randomUUID(), session.controller.signal);
      if (result.timedOut || result.cancelled) workerPool.replaceWorker(worker);
      else workerPool.releaseWorker(worker);
      return result;
    } catch (error) {
      workerPool.replaceWorker(worker);
      throw error;
    }
  }, signal);
}

/**
 * Run parallel simulations using bracket operation
 */
export async function runParallelSimulation(
  netlist: string,
  options: ParallelSimulationOptions = {}
): Promise<ParallelSimulationResult> {
  return runLatestSession(
    (session) => runParallelSimulationInternal(netlist, { ...options, signal: session.controller.signal }, session),
    options.signal,
  );
}

async function runParallelSimulationInternal(
  netlist: string,
  options: ParallelSimulationOptions = {},
  session: ActiveSimulationSession,
): Promise<ParallelSimulationResult> {
  const {
    maxWorkers = DEFAULT_MAX_WORKERS,
    timeout = DEFAULT_TIMEOUT,
    onProgress,
    onResult,
    onThreadUpdate,
    signal,
  } = options;

  try {
    // First, expand the netlist
    const expansionResult = expandNetlist(netlist);

    if (!expansionResult.hasExpansion || !expansionResult.parameterValues || !expansionResult.expandAt) {
      return {
        success: false,
        results: [],
        totalSimulations: 0,
        successfulSimulations: 0,
        failedSimulations: 0,
        errorMessage: "No bracket operations found in netlist or expansion failed",
      };
    }

    const { parameterValues, expandAt } = expansionResult;
    const totalSimulations = parameterValues.length;

    // Get global worker pool instance
    const workerPool = GlobalSimulationWorkerPool.getInstance(maxWorkers);
    await workerPool.reconfigure(maxWorkers);
    await workerPool.initialize();
    
    const results: SimulationWorkerResult[] = [];
    const pendingIndexes = parameterValues.map((_, index) => index);
    const runningSimulations = new Map<
      Worker,
      Promise<SimulationWorkerResult>
    >();

    // Process simulations
    const processNext = async (): Promise<void> => {
      while (pendingIndexes.length > 0 || runningSimulations.size > 0) {
        if (signal?.aborted || session.controller.signal.aborted) {
          pendingIndexes.length = 0;
        }
        // Start new simulations if workers are available
        while (pendingIndexes.length > 0 && workerPool.availableCount > 0 && !session.controller.signal.aborted) {
          const expandedNetlist = expandAt(pendingIndexes.shift()!);
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
            timeout,
            session.id,
            crypto.randomUUID(),
            session.controller.signal,
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
          if (result.timedOut || result.cancelled) workerPool.replaceWorker(worker);
          else workerPool.releaseWorker(worker);
          results.push(result);

          if (result.cancelled && session.controller.signal.aborted) continue;

          // Notify thread completed this simulation
          if (onThreadUpdate && !session.controller.signal.aborted) {
            onThreadUpdate(threadId, "complete", {
              parameterValue: result.parameterValue,
              parameterIndex: result.parameterIndex,
            });
          }

          // Call progress and result callbacks
          if (onResult && !session.controller.signal.aborted) {
            onResult(result);
          }
          if (onProgress && !session.controller.signal.aborted) {
            onProgress(results.length, totalSimulations, results);
          }
        }
      }
    };

    await processNext();

    // Workers remain persistent - do not terminate

    const successfulSimulations = results.filter((r) => r.success).length;
    const failedSimulations = results.length - successfulSimulations;

    return {
      success: successfulSimulations > 0,
      results: results.sort((a, b) => a.parameterIndex - b.parameterIndex), // Sort by parameter index
      totalSimulations,
      successfulSimulations,
      failedSimulations,
      errorMessage: session.controller.signal.aborted ? "Simulation superseded or cancelled" : undefined,
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
