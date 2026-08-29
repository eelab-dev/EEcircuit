import { Simulation } from "eecircuit-engine";
import type { ResultType } from "eecircuit-engine";

interface InitializeWorkerMessage {
  type: "initialize";
  requestId: string;
}

interface RunWorkerMessage {
  type: "run";
  netlist: string;
  sessionId: string;
  requestId: string;
}

type WorkerMessage = InitializeWorkerMessage | RunWorkerMessage;

interface WorkerResponse {
  type?: "result";
  sessionId: string;
  requestId: string;
  success: boolean;
  result?: ResultType;
  errorMessage?: string;
  errorDetails?: string[];
}

// Web worker for running individual simulations
let simulation: Simulation | null = null;

async function initializeSimulation(): Promise<void> {
  if (!simulation) {
    simulation = new Simulation();
    await simulation.start();
  }
}

async function runSimulation(netlist: string, sessionId: string, requestId: string): Promise<WorkerResponse> {
  try {
    await initializeSimulation();
    
    if (!simulation) {
      throw new Error('Failed to initialize simulation engine');
    }

    simulation.setNetList(netlist);
    const start = performance.now();
    const result = await simulation.runSim();
    const end = performance.now();
    console.log(`[Worker] Simulation execution time: ${(end - start).toFixed(2)}ms`);
    const errorMessages = simulation.getError();

    if (result) {
      // Validate result has data
      const hasData = result.data && result.data.length > 0;
      const hasVariables = result.variableNames && result.variableNames.length > 0;
      
      let hasDataPoints = false;
      if (hasData) {
        hasDataPoints = result.data.some(
          (dataSet) => dataSet.values && dataSet.values.length > 0
        );
      }

      if (!hasData || !hasVariables || !hasDataPoints) {
        return {
          sessionId,
          requestId,
          success: false,
          errorMessage: 'Simulation completed but returned empty results',
          errorDetails: errorMessages
        };
      }

      return {
        sessionId,
        requestId,
        success: true,
        result,
        errorDetails: errorMessages
      };
    } else {
      return {
        sessionId,
        requestId,
        success: false,
        errorMessage: 'Simulation failed to run',
        errorDetails: errorMessages
      };
    }
  } catch (error) {
    const errorMessages =
      (typeof simulation?.getError === "function" ? simulation?.getError() : []) ?? [];
    return {
      sessionId,
      requestId,
      success: false,
      errorMessage: error instanceof Error ? error.message : 'Unknown simulation error',
      errorDetails: errorMessages
    };
  }
}

// Handle messages from main thread
self.addEventListener('message', async (event: MessageEvent<WorkerMessage>) => {
  if (event.data.type === "initialize") {
    try {
      await initializeSimulation();
      self.postMessage({
        type: "initialized",
        requestId: event.data.requestId,
        success: true,
      });
    } catch (error) {
      self.postMessage({
        type: "initialized",
        requestId: event.data.requestId,
        success: false,
        errorMessage: error instanceof Error ? error.message : "Unknown initialization error",
      });
    }
    return;
  }

  const { netlist, sessionId, requestId } = event.data;
  
  if (!netlist || !sessionId || !requestId) {
    self.postMessage({
      sessionId,
      requestId,
      success: false,
      errorMessage: 'A netlist, sessionId, and requestId are required'
    } as WorkerResponse);
    return;
  }

  const response = await runSimulation(netlist, sessionId, requestId);
  response.type = "result";
  self.postMessage(response);
});

// Handle worker errors
self.addEventListener('error', (error) => {
  console.error('Simulation worker error:', error);
  self.postMessage({
    sessionId: "unknown",
    requestId: "unknown",
    success: false,
    errorMessage: `Worker error: ${error.message}`
  } as WorkerResponse);
});

// Handle unhandled promise rejections
self.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection in simulation worker:', event.reason);
  self.postMessage({
    sessionId: "unknown",
    requestId: "unknown",
    success: false,
    errorMessage: `Unhandled promise rejection: ${event.reason instanceof Error ? event.reason.message : String(event.reason)}`
  } as WorkerResponse);
});
