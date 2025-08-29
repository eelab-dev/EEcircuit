import { StateCreator } from "zustand";
import { ResultType } from "eecircuit-engine";
import { SimulationType } from "../types/commonTypes";
import type { BracketOperation } from "../utils/bracketParser";
import type { ParallelSimulationResult } from "../simulation/parallelSimulation";
import { saveSimulationConfigs, loadSimulationConfigs } from "../utils/localStorageUtils";

// Define the store interface that includes both simulation and tab slices
interface StoreWithTab {
  // Tab management
  isSimulateTabEnabled: boolean;
  isPlotTabEnabled: boolean;
  mainTabValue: "schematic" | "simulate" | "plot";
  setIsSimulateTabEnabled: (enabled: boolean) => void;
  setIsPlotTabEnabled: (enabled: boolean) => void;
  setMainTabValue: (tab: "schematic" | "simulate" | "plot") => void;
}

// Thread state tracking
export interface ThreadState {
  threadId: number;
  isRunning: boolean;
  isCompleted: boolean;
  currentSimulation?: {
    parameterValue: string;
    parameterIndex: number;
  };
  completedSimulations: number;
  totalAssignedSimulations: number;
}

// Simulation state and actions
export interface SimulationState {
  // Netlist and simulation results
  netList: string;
  results: ResultType[];

  // Simulation configuration
  selectedSimType: SimulationType["type"];
  simulationConfig?: SimulationType;
  allSimulationConfigs: SimulationType[];

  // Bracket operation state
  bracketOperation?: BracketOperation;
  isParallelSimulationRunning: boolean;
  parallelSimulationProgress: {
    total: number;
    completed: number;
    successful: number;
    failed: number;
    threads: ThreadState[];
  };
  parallelSimulationResults?: ParallelSimulationResult;
}

export interface SimulationActions {
  // Netlist and simulation actions
  setNetList: (netList: string) => void;
  setResults: (results: ResultType[]) => void;

  // Simulation configuration actions
  setSelectedSimType: (type: SimulationType["type"]) => void;
  setSimulationConfig: (config?: SimulationType) => void;
  setAllSimulationConfigs: (configs: SimulationType[]) => void;
  addSimulationConfig: (config: SimulationType) => void;
  updateSimulationConfig: (index: number, config: SimulationType) => void;
  deleteSimulationConfig: (index: number) => void;

  // Bracket operation actions
  setBracketOperation: (bracketOp?: BracketOperation) => void;
  setParallelSimulationRunning: (running: boolean) => void;
  updateParallelSimulationProgress: (progress: {
    total: number;
    completed: number;
    successful: number;
    failed: number;
  }) => void;
  updateThreadProgress: (
    threadId: number,
    updates: Partial<ThreadState>
  ) => void;
  initializeThreads: (numThreads: number, totalSimulations: number) => void;
  setParallelSimulationResults: (results?: ParallelSimulationResult) => void;
  resetParallelSimulation: () => void;

  // Combined actions for common operations
  exportNetlist: (netlist: string) => void;
  runParallelSimulation: (netlist: string) => Promise<void>;
}

export type SimulationSlice = SimulationState & SimulationActions;

export const createSimulationSlice: StateCreator<
  SimulationSlice & StoreWithTab,
  [],
  [],
  SimulationSlice
> = (set, get) => ({
  // Initial state
  netList: "",
  results: [],
  selectedSimType: "None",
  simulationConfig: undefined,
  allSimulationConfigs: loadSimulationConfigs(),
  bracketOperation: undefined,
  isParallelSimulationRunning: false,
  parallelSimulationProgress: {
    total: 0,
    completed: 0,
    successful: 0,
    failed: 0,
    threads: [],
  },
  parallelSimulationResults: undefined,

  // Netlist and simulation actions
  setNetList: (netList) => set({ netList }),
  setResults: (results) => set({ results }),

  // Simulation configuration actions
  setSelectedSimType: (type) => set({ selectedSimType: type }),
  setSimulationConfig: (config) => set({ simulationConfig: config }),
  setAllSimulationConfigs: (configs) => {
    set({ allSimulationConfigs: configs });
    saveSimulationConfigs(configs);
  },

  addSimulationConfig: (config) =>
    set((state: SimulationSlice) => {
      const newConfigs = [...state.allSimulationConfigs, config];
      saveSimulationConfigs(newConfigs);
      return { allSimulationConfigs: newConfigs };
    }),

  updateSimulationConfig: (index, config) =>
    set((state: SimulationSlice) => {
      const newConfigs = state.allSimulationConfigs.map((c, i) =>
        i === index ? config : c
      );
      saveSimulationConfigs(newConfigs);
      return { allSimulationConfigs: newConfigs };
    }),

  deleteSimulationConfig: (index) =>
    set((state: SimulationSlice) => {
      const newConfigs = state.allSimulationConfigs.filter(
        (_, i) => i !== index
      );
      saveSimulationConfigs(newConfigs);
      return { allSimulationConfigs: newConfigs };
    }),

  // Bracket operation actions
  setBracketOperation: (bracketOp) => set({ bracketOperation: bracketOp }),
  setParallelSimulationRunning: (running) =>
    set({ isParallelSimulationRunning: running }),
  updateParallelSimulationProgress: (progress) =>
    set((state: SimulationSlice) => ({
      parallelSimulationProgress: {
        ...progress,
        threads: state.parallelSimulationProgress.threads,
      },
    })),

  updateThreadProgress: (threadId, updates) =>
    set((state: SimulationSlice) => ({
      parallelSimulationProgress: {
        ...state.parallelSimulationProgress,
        threads: state.parallelSimulationProgress.threads.map((thread) =>
          thread.threadId === threadId ? { ...thread, ...updates } : thread
        ),
      },
    })),

  initializeThreads: (numThreads, totalSimulations) =>
    set((state: SimulationSlice) => {
      const simulationsPerThread = Math.floor(totalSimulations / numThreads);
      const remainingSimulations = totalSimulations % numThreads;

      const threads: ThreadState[] = Array.from(
        { length: numThreads },
        (_, index) => ({
          threadId: index,
          isRunning: false,
          isCompleted: false,
          currentSimulation: undefined,
          completedSimulations: 0,
          totalAssignedSimulations:
            simulationsPerThread + (index < remainingSimulations ? 1 : 0),
        })
      );

      return {
        parallelSimulationProgress: {
          ...state.parallelSimulationProgress,
          threads,
        },
      };
    }),
  setParallelSimulationResults: (results) =>
    set({ parallelSimulationResults: results }),
  resetParallelSimulation: () =>
    set({
      bracketOperation: undefined,
      isParallelSimulationRunning: false,
      parallelSimulationProgress: {
        total: 0,
        completed: 0,
        successful: 0,
        failed: 0,
        threads: [],
      },
      parallelSimulationResults: undefined,
    }),

  // Combined actions for common operations
  exportNetlist: (netlist) => {
    const netListPreamble = `
* Netlist generated by EEcircuit
.include modelcard.CMOS90
`;
    const netlistWithPreamble = netListPreamble + netlist;

    set({
      netList: netlistWithPreamble,
      isSimulateTabEnabled: true,
      mainTabValue: "simulate",
    });
  },

  runParallelSimulation: async (netlist: string) => {
    const { findFirstBracketOperation } = await import(
      "../utils/bracketParser"
    );
    const { runParallelSimulation } = await import(
      "../simulation/parallelSimulation"
    );
    const { aggregateParallelResults } = await import(
      "../simulation/resultAggregator"
    );

    try {
      // Reset previous state
      const actions = get() as SimulationSlice & StoreWithTab;
      actions.resetParallelSimulation();
      
      // Always clear previous results, optionally reset selections and plot state
      const allActions = get() as SimulationSlice & 
        StoreWithTab & {
          clearResults: () => void;
          resetVariableSelections: () => void;
          resetPlotState: () => void;
          resetVariableSelectionsOnNewSim: boolean;
          resetPlotStateOnNewSim: boolean;
        };
      
      allActions.clearResults(); // Always clear previous results
      
      if (allActions.resetVariableSelectionsOnNewSim) {
        allActions.resetVariableSelections();
      }
      
      if (allActions.resetPlotStateOnNewSim) {
        allActions.resetPlotState();
      }

      // Find bracket operation
      const bracketOp = findFirstBracketOperation(netlist);
      if (!bracketOp) {
        throw new Error("No bracket operation found in netlist");
      }

      actions.setBracketOperation(bracketOp);
      actions.setParallelSimulationRunning(true);

      // Initialize threads first to get the worker count
      const maxWorkers = (get() as SimulationSlice & StoreWithTab & { maxWebWorkers: number }).maxWebWorkers || 4;
      const { expandNetlist } = await import("../utils/netlistExpander");
      const expansionResult = expandNetlist(netlist);
      const totalSims = expansionResult.expandedNetlists?.length || 0;

      actions.initializeThreads(
        Math.min(maxWorkers, navigator.hardwareConcurrency || 4),
        totalSims
      );


      // Run parallel simulation
      const result = await runParallelSimulation(netlist, {
        maxWorkers: maxWorkers,
        onProgress: (completed, total, results) => {
          const successful = results.filter((r) => r.success).length;
          const failed = results.length - successful;
          actions.updateParallelSimulationProgress({
            total,
            completed,
            successful,
            failed,
          });
        },
        onResult: () => {
          // Individual results are handled for progress tracking only
          // Plotting happens only when all simulations are complete
        },
        onThreadUpdate: (threadId, status, currentSim) => {
          if (status === "start") {
            actions.updateThreadProgress(threadId, {
              isRunning: true,
              currentSimulation: currentSim,
            });
          } else if (status === "complete") {
            const currentState = get() as SimulationSlice;
            const thread = currentState.parallelSimulationProgress.threads.find(
              (t) => t.threadId === threadId
            );
            const newCompleted = (thread?.completedSimulations || 0) + 1;
            const totalAssigned = thread?.totalAssignedSimulations || 0;

            actions.updateThreadProgress(threadId, {
              isRunning: newCompleted < totalAssigned,
              isCompleted: newCompleted >= totalAssigned,
              currentSimulation:
                newCompleted < totalAssigned
                  ? undefined
                  : thread?.currentSimulation,
              completedSimulations: newCompleted,
            });
          }
        },
      });

      actions.setParallelSimulationResults(result);

      if (result.success && result.results.length > 0) {
        // Aggregate results for plotting - show all results at once when complete
        const aggregated = aggregateParallelResults(result.results, bracketOp);
        if (aggregated) {
          // Update results and trigger plot tab using handleNewResults for bracket operation detection
          // Type assertion needed because AggregatedResult extends ResultType but with additional properties
          const appActions = get() as SimulationSlice &
            StoreWithTab & {
              handleNewResults: (results: ResultType[]) => void;
            };
          appActions.handleNewResults([aggregated as ResultType]);
        }
      }
    } catch (error) {
      console.error("Parallel simulation failed:", error);
    } finally {
      const actions = get() as SimulationSlice & StoreWithTab;
      actions.setParallelSimulationRunning(false);
    }
  },
});
