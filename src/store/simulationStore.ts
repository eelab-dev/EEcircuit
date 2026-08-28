import { StateCreator } from "zustand";
import type { ResultType } from "eecircuit-engine";
import { SimulationType, ToBePlotted } from "../types/commonTypes";
import type { BracketOperation } from "../utils/bracketParser";
import type {
  ParallelSimulationResult,
  SimulationWorkerResult,
} from "../simulation/parallelSimulation";
import { saveSimulationConfigs, loadSimulationConfigs } from "../utils/localStorageUtils";
import { notifySimulationErrors } from "../utils/simulationErrorNotifier";
import { chang90 } from "../Simulate/subcircuits/chang90";
import { addAcParameterToSource } from "../utils/sourceDetection";
import { correctNgspiceUnits } from "../utils/unitCorrection";
import { buildToBePlottedCommands } from "../utils/toBePlotted";
import { extractValidNetsAndComponents } from "../utils/netlistUtils";
import { isSubcircuitEnd, isSubcircuitStart, parseSpiceLine } from "../utils/spiceLineParser";

let latestParallelRunId = 0;

// Define the store interface that includes both simulation and tab slices
interface StoreWithTab {
  // Tab management
  isSimulationTabEnabled: boolean;
  isPlottingTabEnabled: boolean;
  mainTabValue: "schematic" | "simulate" | "plot";
  setIsSimulationTabEnabled: (enabled: boolean) => void;
  setIsPlottingTabEnabled: (enabled: boolean) => void;
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
  rawNetlist: string; // The base netlist from schematic without sim commands
  netList: string;    // The full netlist for simulation/display
  netListNeedsRefresh: boolean;
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
  simulationCommandString: string;
}

export interface SimulationActions {
  // Netlist and simulation actions
  setNetList: (netList: string) => void;
  setResults: (results: ResultType[]) => void;
  acknowledgeNetListRefresh: () => void;
  setSimulationCommandString: (command: string) => void;
  setRawNetlist: (netlist: string) => Promise<void>;
  generateDisplayNetlist: () => Promise<void>;

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
  exportNetlist: (netlist: string) => Promise<void>;
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
  rawNetlist: "",
  netList: "",
  netListNeedsRefresh: false,
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
  simulationCommandString: "",

  // Netlist and simulation actions
  setRawNetlist: async (netlist: string) => {
    set({ rawNetlist: netlist });
    await (get() as SimulationSlice).generateDisplayNetlist();
  },
  setNetList: (netList) => set({ netList }),
  setResults: (results) => set({ results }),
  acknowledgeNetListRefresh: () => set({ netListNeedsRefresh: false }),
  setSimulationCommandString: (command: string) => {
    set({ simulationCommandString: command });
    const currentSimType = (get() as SimulationSlice).selectedSimType;
    if (currentSimType !== "None") {
        void (get() as SimulationSlice).generateDisplayNetlist();
    }
  },

  // Simulation configuration actions
  setSelectedSimType: (type) => {
    set({ selectedSimType: type });
    if (type !== "None") {
        void (get() as SimulationSlice).generateDisplayNetlist();
    }
  },
  setSimulationConfig: (config) => {
    set((state: SimulationSlice) => ({ 
      simulationConfig: config,
      selectedSimType: config?.type && config.type !== "None" ? config.type : state.selectedSimType
    }));
    const currentSimType = (get() as SimulationSlice).selectedSimType;
    if (currentSimType !== "None") {
        void (get() as SimulationSlice).generateDisplayNetlist();
    }
  },
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

  generateDisplayNetlist: async () => {
    const { rawNetlist, selectedSimType, simulationConfig, simulationCommandString } = get() as SimulationSlice;
    if (!rawNetlist) {
        set({ netList: "", netListNeedsRefresh: true });
        return;
    }

    // 0. Pre-process netlist with unit correction
    let processedNetlist = correctNgspiceUnits(rawNetlist);
    
    // 1. Add AC parameter if needed
    if ((selectedSimType === "Noise" || selectedSimType === "AC") && simulationConfig && "source" in simulationConfig && simulationConfig.source) {
      processedNetlist = addAcParameterToSource(processedNetlist, simulationConfig.source);
    }

    // 2. Resolve models
    const availableModels: Record<string, string> = {
      chang90: chang90,
    };

    const lines = processedNetlist.split("\n");
    const requiredModels = new Set<string>();
    const definedSubckts = new Set<string>();
    let inSubcircuit = false;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (isSubcircuitStart(trimmed)) {
        inSubcircuit = true;
        const parts = trimmed.split(/\s+/);
        const subcktName = parts[1];
        if (subcktName) definedSubckts.add(subcktName);
        continue;
      }
      if (isSubcircuitEnd(trimmed)) { inSubcircuit = false; continue; }
      if (inSubcircuit) continue;
      const parsed = parseSpiceLine(trimmed);
      if (parsed?.type === "X" && parsed.subcircuitName) requiredModels.add(parsed.subcircuitName);
    }

    const modelsToAppend: string[] = [];
    const missingModels: string[] = [];
    requiredModels.forEach((modelName) => {
      if (definedSubckts.has(modelName)) return;
      const modelContent = availableModels[modelName];
      if (modelContent) {
        modelsToAppend.push(modelContent);
      } else {
        missingModels.push(modelName);
      }
    });

    if (missingModels.length > 0) {
      notifySimulationErrors(missingModels.map((m) => `Missing subcircuit model: ${m}`));
    }

    // 3. Construct segments
    const netListPreamble = `* Netlist generated by EEcircuit
.include modelcard.ptm`;
    
    // Append models before .end if exists
    const endLineIndex = lines.findIndex(l => l.trim().toUpperCase() === ".END");
    let baseNetlistWithModels = processedNetlist;
    const additionalModelsStr = modelsToAppend.join("\n");

    if (additionalModelsStr) {
      if (endLineIndex !== -1) {
        // We use lines here because it's a split array
        const tempLines = [...lines];
        tempLines.splice(endLineIndex, 0, additionalModelsStr);
        baseNetlistWithModels = tempLines.join("\n");
      } else {
        baseNetlistWithModels += "\n" + additionalModelsStr;
      }
    }

    // 4. Create the final multi-section netlist
    const netlistSections = [netListPreamble + "\n" + baseNetlistWithModels];

    if (selectedSimType !== "None" && simulationCommandString?.trim()) {
      netlistSections.push(simulationCommandString);
    }

    // Add plot commands (.save) if any
    const { toBePlotted, setToBePlotted } = get() as unknown as { toBePlotted: ToBePlotted[], setToBePlotted: (items: ToBePlotted[]) => void }; 
    let currentToBePlotted = toBePlotted || [];

    if (currentToBePlotted.length > 0) {
      const { nets: validNets, components: validComponents } = extractValidNetsAndComponents(processedNetlist);
      
      const filteredToBePlotted = currentToBePlotted.filter((item) => {
        if (item.type === "voltage") {
          return validNets.has(item.netName);
        } else if (item.type === "current") {
          return validComponents.has(item.componentName);
        }
        return false;
      });

      if (filteredToBePlotted.length !== currentToBePlotted.length) {
        setToBePlotted(filteredToBePlotted);
        currentToBePlotted = filteredToBePlotted;
      }
    }

    const plotCommands = buildToBePlottedCommands(currentToBePlotted);
    if (plotCommands && plotCommands.trim()) {
      netlistSections.push(plotCommands);
    }

    if (!processedNetlist.toUpperCase().includes(".END")) {
        netlistSections.push(".end");
    }

    const finalNetlist = netlistSections.join("\n\n");
    set({ netList: finalNetlist, netListNeedsRefresh: true });
  },

  // Combined actions for common operations
  exportNetlist: async (netlist) => {
    await (get() as SimulationSlice).setRawNetlist(netlist);
    
    // Proceed to enable and navigate to simulate tab (validation handled by caller)
    const { setIsSimulationTabEnabled, setMainTabValue } = get() as unknown as StoreWithTab;
    if (setIsSimulationTabEnabled) setIsSimulationTabEnabled(true);
    if (setMainTabValue) setMainTabValue("simulate");
  },

  runParallelSimulation: async (netlist: string) => {
    const runId = ++latestParallelRunId;
    const isCurrentRun = () => runId === latestParallelRunId;
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
      const actions = get() as SimulationSlice;
      actions.resetParallelSimulation();
      
      // Always clear previous results, optionally reset selections and plot state
      const allActions = get() as unknown as { 
        resetVariableSelectionsOnNewSim?: boolean;
        resetVariableSelections: () => void;
        resetPlotStateOnNewSim?: boolean;
        resetPlotState: () => void;
        clearResults: () => void;
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
      const appActions = get() as unknown as { handleNewResults: (res: ResultType[]) => void };
      const progressiveResults: SimulationWorkerResult[] = [];
      const publishProgressiveAggregation = (simulationResult: SimulationWorkerResult): void => {
        progressiveResults.push(simulationResult);
        const aggregated = aggregateParallelResults(
          progressiveResults,
          bracketOp,
          { preserveParameterInfo: true, sortByParameter: true },
        );
        if (aggregated && isCurrentRun()) {
          appActions.handleNewResults([aggregated as ResultType]);
        }
      };

      // Initialize threads first to get the worker count
      const maxWorkers = (get() as unknown as { maxWebWorkers?: number }).maxWebWorkers || 4;
      const { expandNetlist } = await import("../utils/netlistExpander");
      const expansionResult = expandNetlist(netlist);
      const totalSims = expansionResult.parameterValues?.length || 0;

      actions.initializeThreads(
        Math.min(maxWorkers, navigator.hardwareConcurrency || 4),
        totalSims
      );

      // Run parallel simulation
      const result = await runParallelSimulation(netlist, {
        maxWorkers: maxWorkers,
        onProgress: (completed, total, results) => {
          if (!isCurrentRun()) return;
          const successful = results.filter((r) => r.success).length;
          const failed = results.length - successful;
          actions.updateParallelSimulationProgress({
            total,
            completed,
            successful,
            failed,
          });
        },
        onResult: (simulationResult) => {
          if (!isCurrentRun()) return;
          publishProgressiveAggregation(simulationResult);
        },
        onThreadUpdate: (threadId, status, currentSim) => {
          if (!isCurrentRun()) return;
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

      if (!isCurrentRun() || result.errorMessage === "Simulation superseded or cancelled") return;

      actions.setParallelSimulationResults(result);

      const errorMessages: string[] = [];

      result.results.forEach((simulationResult) => {
        const parameterLabel = simulationResult.parameterValue
          ? `Parameter ${simulationResult.parameterValue}`
          : `Simulation #${simulationResult.parameterIndex + 1}`;

        if (!simulationResult.success) {
          if (simulationResult.errorMessage) {
            errorMessages.push(`${parameterLabel}: ${simulationResult.errorMessage}`);
          }
        }

        simulationResult.errorDetails?.forEach((message) => {
          errorMessages.push(`${parameterLabel}: ${message}`);
        });
      });

      if (result.errorMessage) {
        errorMessages.push(result.errorMessage);
      }

      if (errorMessages.length > 0) {
        notifySimulationErrors(errorMessages);
      }

      if (result.success && result.results.length > 0) {
        // Reconcile the final ordered aggregate after all callbacks have run.
        const aggregated = aggregateParallelResults(result.results, bracketOp);
        if (aggregated) {
          appActions.handleNewResults([aggregated as ResultType]);
        }
      }
    } catch (error) {
      console.error("Parallel simulation failed:", error);
      notifySimulationErrors(
        error instanceof Error
          ? error.message
          : "Parallel simulation failed with an unknown error"
      );
    } finally {
      const actions = get() as SimulationSlice;
      if (isCurrentRun()) actions.setParallelSimulationRunning(false);
    }
  },
});
