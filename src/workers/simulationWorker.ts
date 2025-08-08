import { Simulation } from "eecircuit-engine";

interface WorkerMessage {
  netlist: string;
}

interface WorkerResponse {
  success: boolean;
  result?: any;
  error?: string;
}

// Web worker for running individual simulations
let simulation: Simulation | null = null;

async function initializeSimulation(): Promise<void> {
  if (!simulation) {
    simulation = new Simulation();
    await simulation.start();
  }
}

async function runSimulation(netlist: string): Promise<WorkerResponse> {
  try {
    await initializeSimulation();
    
    if (!simulation) {
      throw new Error('Failed to initialize simulation engine');
    }

    simulation.setNetList(netlist);
    const result = await simulation.runSim();

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
          success: false,
          error: 'Simulation completed but returned empty results'
        };
      }

      return {
        success: true,
        result
      };
    } else {
      return {
        success: false,
        error: 'Simulation failed to run'
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown simulation error'
    };
  }
}

// Handle messages from main thread
self.addEventListener('message', async (event: MessageEvent<WorkerMessage>) => {
  const { netlist } = event.data;
  
  if (!netlist) {
    self.postMessage({
      success: false,
      error: 'No netlist provided'
    } as WorkerResponse);
    return;
  }

  const response = await runSimulation(netlist);
  self.postMessage(response);
});

// Handle worker errors
self.addEventListener('error', (error) => {
  console.error('Simulation worker error:', error);
  self.postMessage({
    success: false,
    error: `Worker error: ${error.message}`
  } as WorkerResponse);
});

// Handle unhandled promise rejections
self.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection in simulation worker:', event.reason);
  self.postMessage({
    success: false,
    error: `Unhandled promise rejection: ${event.reason}`
  } as WorkerResponse);
});