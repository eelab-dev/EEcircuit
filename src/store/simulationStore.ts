import type { SliceCreator } from "./storeTypes";
import type { ResultType } from "eecircuit-engine";
import { SimulationType, ToBePlotted } from "../types/commonTypes";
import type { BracketOperation } from "../utils/bracketParser";
import type {
  ParallelSimulationResult,
  SimulationWorkerResult,
} from "../simulation/parallelSimulation";
import { saveSimulationConfigs, loadSimulationConfigs } from "../utils/localStorageUtils";
import { notifySimulationErrors } from "../utils/simulationErrorNotifier";
import { addAcParameterToSource } from "../utils/sourceDetection";
import { correctNgspiceUnits } from "../utils/unitCorrection";
import { buildToBePlottedCommands } from "../utils/toBePlotted";
import { extractValidNetsAndComponents } from "../utils/netlistUtils";
import { isSubcircuitEnd, isSubcircuitStart, parseSpiceLine } from "../utils/spiceLineParser";
import type { Schematic } from "eecircuit-schematic";
import { modelCardsFor, type Gf180Corner, type ProcessId } from "../pdk/processCatalog";
import { currentProbeExpression, isEngineProvidedSubcircuit, resolvePdkNetlist } from "../pdk/netlistResolver";
import { builtinSubcircuitDefinition } from "../pdk/opampRegistry";
import {
  areSimulationConfigsEqual,
  createEmptySimulationConfig,
  generateSimulationConfigName,
  isSimulationConfigComplete,
  isSimulationConfigNameAvailable,
  normalizeSimulationConfigs,
  simulationCommandFor,
  type SimulationConfig,
  type SimulationConfigType,
} from "../simulation/simulationProfiles";

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

interface StoreWithPdk {
  processId: ProcessId;
  gf180Corner: Gf180Corner;
  currentSchematic?: Schematic;
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
  selectedSimulationConfigIndex: number;
  simulationConfigDrafts: Record<string, SimulationConfig>;
  lastSelectedSimulationConfigNames: Partial<Record<SimulationConfigType, string>>;

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
  selectSimulationConfig: (index: number) => void;
  selectSimulationType: (type: SimulationType["type"]) => void;
  updateActiveSimulationConfig: (config: SimulationConfig) => void;
  commitActiveSimulationConfig: () => boolean;
  saveActiveSimulationConfigAsNew: () => boolean;
  renameSelectedSimulationConfig: (name: string) => boolean;
  deleteSelectedSimulationConfig: () => void;

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

export const createSimulationSlice: SliceCreator<
  SimulationSlice & StoreWithTab,
  SimulationSlice
> = (set, get) => {
  const initialConfigs = normalizeSimulationConfigs(loadSimulationConfigs());
  const initialConfig = initialConfigs[0];
  const configKey = (name: string): string => name.trim().toLowerCase();
  const newDraftKey = (type: SimulationConfigType): string => `@new:${type}`;
  const refreshDisplayNetlist = (): void => {
    if ((get() as SimulationSlice).selectedSimType !== "None") {
      void (get() as SimulationSlice).generateDisplayNetlist();
    }
  };

  return ({
  // Initial state
  rawNetlist: "",
  netList: "",
  netListNeedsRefresh: false,
  results: [],
  selectedSimType: initialConfig?.type ?? "None",
  simulationConfig: initialConfig,
  allSimulationConfigs: initialConfigs,
  selectedSimulationConfigIndex: initialConfig ? 0 : -1,
  simulationConfigDrafts: {},
  lastSelectedSimulationConfigNames: initialConfig ? { [initialConfig.type]: initialConfig.name } : {},
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
  simulationCommandString: correctNgspiceUnits(initialConfig ? simulationCommandFor(initialConfig) : ""),

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
    const normalized = normalizeSimulationConfigs(configs);
    const first = normalized[0];
    set({
      allSimulationConfigs: normalized,
      selectedSimulationConfigIndex: first ? 0 : -1,
      selectedSimType: first?.type ?? "None",
      simulationConfig: first ?? { type: "None" },
      simulationCommandString: correctNgspiceUnits(first ? simulationCommandFor(first) : ""),
      simulationConfigDrafts: {},
      lastSelectedSimulationConfigNames: first ? { [first.type]: first.name } : {},
    });
    saveSimulationConfigs(normalized);
    refreshDisplayNetlist();
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

  selectSimulationConfig: (index) => {
    const state = get() as SimulationSlice;
    const saved = state.allSimulationConfigs[index];
    if (!saved || saved.type === "None") return;
    const active = state.simulationConfigDrafts[configKey(saved.name ?? "")] ?? saved;
    set({
      selectedSimulationConfigIndex: index,
      selectedSimType: active.type,
      simulationConfig: active,
      simulationCommandString: correctNgspiceUnits(simulationCommandFor(active)),
      lastSelectedSimulationConfigNames: {
        ...state.lastSelectedSimulationConfigNames,
        [active.type]: active.name,
      },
    });
    refreshDisplayNetlist();
  },

  selectSimulationType: (type) => {
    const state = get() as SimulationSlice;
    if (type === "None") {
      set({
        selectedSimulationConfigIndex: -1,
        selectedSimType: "None",
        simulationConfig: { type: "None" },
        simulationCommandString: "",
      });
      return;
    }

    const lastName = state.lastSelectedSimulationConfigNames[type];
    const pending = state.simulationConfigDrafts[newDraftKey(type)];
    if (pending && pending.name === lastName) {
      set({
        selectedSimulationConfigIndex: -1,
        selectedSimType: type,
        simulationConfig: pending,
        simulationCommandString: correctNgspiceUnits(simulationCommandFor(pending)),
      });
      refreshDisplayNetlist();
      return;
    }

    let index = lastName
      ? state.allSimulationConfigs.findIndex((config) => config.type === type && configKey(config.name ?? "") === configKey(lastName))
      : -1;
    if (index < 0) index = state.allSimulationConfigs.findIndex((config) => config.type === type);
    if (index >= 0) {
      state.selectSimulationConfig(index);
      return;
    }

    const reservedConfigs = [...state.allSimulationConfigs, ...Object.values(state.simulationConfigDrafts)];
    const draft = pending ?? createEmptySimulationConfig(type, reservedConfigs);
    set({
      selectedSimulationConfigIndex: -1,
      selectedSimType: type,
      simulationConfig: draft,
      simulationCommandString: correctNgspiceUnits(simulationCommandFor(draft)),
      simulationConfigDrafts: { ...state.simulationConfigDrafts, [newDraftKey(type)]: draft },
      lastSelectedSimulationConfigNames: { ...state.lastSelectedSimulationConfigNames, [type]: draft.name },
    });
    refreshDisplayNetlist();
  },

  updateActiveSimulationConfig: (config) => {
    const state = get() as SimulationSlice;
    const selected = state.allSimulationConfigs[state.selectedSimulationConfigIndex];
    const draftKey = selected && selected.type !== "None"
      ? configKey(selected.name ?? "")
      : newDraftKey(config.type);
    const drafts = { ...state.simulationConfigDrafts };
    if (selected && areSimulationConfigsEqual(config, selected)) delete drafts[draftKey];
    else drafts[draftKey] = config;
    set({
      selectedSimType: config.type,
      simulationConfig: config,
      simulationCommandString: correctNgspiceUnits(simulationCommandFor(config)),
      simulationConfigDrafts: drafts,
    });
    refreshDisplayNetlist();
  },

  commitActiveSimulationConfig: () => {
    const state = get() as SimulationSlice;
    const active = state.simulationConfig;
    if (!active || !isSimulationConfigComplete(active)) return false;
    const index = state.selectedSimulationConfigIndex;
    const pendingDrafts = Object.entries(state.simulationConfigDrafts)
      .filter(([key]) => key.startsWith("@new:") && key !== newDraftKey(active.type))
      .map(([, config]) => config);
    if (
      !isSimulationConfigNameAvailable(active.name ?? "", state.allSimulationConfigs, index) ||
      !isSimulationConfigNameAvailable(active.name ?? "", pendingDrafts)
    ) return false;

    const configs = index >= 0
      ? state.allSimulationConfigs.map((config, candidateIndex) => candidateIndex === index ? active : config)
      : [...state.allSimulationConfigs, active];
    const committedIndex = index >= 0 ? index : configs.length - 1;
    const oldConfig = index >= 0 ? state.allSimulationConfigs[index] : undefined;
    const drafts = { ...state.simulationConfigDrafts };
    delete drafts[index >= 0 ? configKey(oldConfig?.type === "None" ? "" : oldConfig?.name ?? "") : newDraftKey(active.type)];
    set({
      allSimulationConfigs: configs,
      selectedSimulationConfigIndex: committedIndex,
      simulationConfig: active,
      simulationConfigDrafts: drafts,
      lastSelectedSimulationConfigNames: { ...state.lastSelectedSimulationConfigNames, [active.type]: active.name },
    });
    saveSimulationConfigs(configs);
    return true;
  },

  saveActiveSimulationConfigAsNew: () => {
    const state = get() as SimulationSlice;
    const active = state.simulationConfig;
    if (!active || !isSimulationConfigComplete(active)) return false;

    const reservedConfigs = [...state.allSimulationConfigs, ...Object.values(state.simulationConfigDrafts)];
    const copy: SimulationConfig = {
      ...active,
      name: generateSimulationConfigName(active.type, reservedConfigs),
    };
    const configs = [...state.allSimulationConfigs, copy];
    const drafts = { ...state.simulationConfigDrafts };
    const selected = state.allSimulationConfigs[state.selectedSimulationConfigIndex];
    if (selected?.type !== "None") delete drafts[configKey(selected?.name ?? "")];
    else delete drafts[newDraftKey(active.type)];

    set({
      allSimulationConfigs: configs,
      selectedSimulationConfigIndex: configs.length - 1,
      selectedSimType: copy.type,
      simulationConfig: copy,
      simulationCommandString: correctNgspiceUnits(simulationCommandFor(copy)),
      simulationConfigDrafts: drafts,
      lastSelectedSimulationConfigNames: { ...state.lastSelectedSimulationConfigNames, [copy.type]: copy.name },
    });
    saveSimulationConfigs(configs);
    refreshDisplayNetlist();
    return true;
  },

  renameSelectedSimulationConfig: (name) => {
    const state = get() as SimulationSlice;
    const index = state.selectedSimulationConfigIndex;
    const saved = state.allSimulationConfigs[index];
    const trimmed = name.trim();
    const pendingDrafts = Object.entries(state.simulationConfigDrafts)
      .filter(([key]) => key.startsWith("@new:"))
      .map(([, config]) => config);
    if (
      !saved || saved.type === "None" ||
      !isSimulationConfigNameAvailable(trimmed, state.allSimulationConfigs, index) ||
      !isSimulationConfigNameAvailable(trimmed, pendingDrafts)
    ) return false;
    const oldKey = configKey(saved.name ?? "");
    const active = state.simulationConfig?.type === "None" || !state.simulationConfig
      ? saved
      : state.simulationConfig;
    const renamed = { ...active, name: trimmed } as SimulationConfig;
    const configs = state.allSimulationConfigs.map((config, candidateIndex) => candidateIndex === index
      ? { ...saved, name: trimmed } as SimulationConfig
      : config);
    const drafts = { ...state.simulationConfigDrafts };
    if (drafts[oldKey]) {
      delete drafts[oldKey];
      drafts[configKey(trimmed)] = renamed;
    }
    set({
      allSimulationConfigs: configs,
      simulationConfig: renamed,
      simulationConfigDrafts: drafts,
      lastSelectedSimulationConfigNames: { ...state.lastSelectedSimulationConfigNames, [renamed.type]: trimmed },
    });
    saveSimulationConfigs(configs);
    return true;
  },

  deleteSelectedSimulationConfig: () => {
    const state = get() as SimulationSlice;
    const index = state.selectedSimulationConfigIndex;
    if (index < 0) return;
    const deleted = state.allSimulationConfigs[index];
    const configs = state.allSimulationConfigs.filter((_, candidateIndex) => candidateIndex !== index);
    const drafts = { ...state.simulationConfigDrafts };
    if (deleted?.type !== "None") delete drafts[configKey(deleted?.name ?? "")];
    const nextIndex = configs.length ? (index > 0 ? index - 1 : 0) : -1;
    const nextSaved = nextIndex >= 0 ? configs[nextIndex] : undefined;
    const next = nextSaved?.type !== "None"
      ? drafts[configKey(nextSaved?.name ?? "")] ?? nextSaved
      : undefined;
    set({
      allSimulationConfigs: configs,
      selectedSimulationConfigIndex: nextIndex,
      selectedSimType: next?.type ?? "None",
      simulationConfig: next ?? { type: "None" },
      simulationCommandString: correctNgspiceUnits(next ? simulationCommandFor(next) : ""),
      simulationConfigDrafts: drafts,
      lastSelectedSimulationConfigNames: next
        ? { ...state.lastSelectedSimulationConfigNames, [next.type]: next.name }
        : state.lastSelectedSimulationConfigNames,
    });
    saveSimulationConfigs(configs);
    refreshDisplayNetlist();
  },

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

  initializeThreads: (numThreads) =>
    set((state: SimulationSlice) => {
      const threads: ThreadState[] = Array.from(
        { length: numThreads },
        (_, index) => ({
          threadId: index,
          isRunning: false,
          isCompleted: false,
          currentSimulation: undefined,
          completedSimulations: 0,
          // The worker pool schedules dynamically. Count assignments when
          // they actually happen instead of predicting an even distribution.
          totalAssignedSimulations: 0,
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
    const pdkState = get() as unknown as Partial<StoreWithPdk>;
    const processId = pdkState.processId ?? "gf180";
    const gf180Corner = pdkState.gf180Corner ?? "typical";
    const currentSchematic = pdkState.currentSchematic;
    if (!rawNetlist) {
        set({ netList: "", netListNeedsRefresh: true });
        return;
    }

    // 0. Pre-process netlist with unit correction
    let processedNetlist = correctNgspiceUnits(rawNetlist);
    const { toBePlotted, setToBePlotted } = get() as unknown as {
      toBePlotted: ToBePlotted[];
      setToBePlotted: (items: ToBePlotted[]) => void;
    };
    let currentToBePlotted = toBePlotted || [];
    const pdkResolution = resolvePdkNetlist(
      processedNetlist,
      currentSchematic,
      processId,
      currentToBePlotted.filter((item) => item.type === "current"),
    );
    processedNetlist = pdkResolution.netlist;
    // Compatibility and geometry problems are presented persistently beside
    // the Run control and enforced again by the simulation controller.
    
    // 1. Add AC parameter if needed
    if ((selectedSimType === "Noise" || selectedSimType === "AC") && simulationConfig && "source" in simulationConfig && simulationConfig.source) {
      processedNetlist = addAcParameterToSource(processedNetlist, simulationConfig.source);
    }

    // 2. Resolve models
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
        if (subcktName) definedSubckts.add(subcktName.toLowerCase());
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
      const normalizedModelName = modelName.toLowerCase();
      if (definedSubckts.has(normalizedModelName)) return;
      const modelContent = builtinSubcircuitDefinition(normalizedModelName);
      if (modelContent) {
        modelsToAppend.push(modelContent);
      } else if (isEngineProvidedSubcircuit(modelName)) {
        return;
      } else {
        missingModels.push(modelName);
      }
    });

    if (missingModels.length > 0) {
      notifySimulationErrors(missingModels.map((m) => `Missing subcircuit model: ${m}`));
    }

    // 3. Construct segments
    const includeFiles = modelCardsFor(processId, gf180Corner);
    const netListPreamble = `* Netlist generated by EEcircuit
${includeFiles.map((file) => `.include ${file}`).join("\n")}`;
    
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
    if (currentToBePlotted.length > 0) {
      const { nets: validNets, components: validComponents } = extractValidNetsAndComponents(processedNetlist);
      
      const generatedComponentName = (componentName: string) =>
        pdkResolution.componentNameMap.get(componentName.toUpperCase()) ?? componentName;
      const filteredToBePlotted = currentToBePlotted.filter((item) => {
        if (item.type === "voltage") {
          return validNets.has(item.netName);
        } else if (item.type === "current") {
          return validComponents.has(generatedComponentName(item.componentName).toUpperCase());
        }
        return false;
      });

      if (filteredToBePlotted.length !== currentToBePlotted.length) {
        setToBePlotted(filteredToBePlotted);
        currentToBePlotted = filteredToBePlotted;
      }
    }

    const plotCommands = buildToBePlottedCommands(
      currentToBePlotted,
      (componentName, terminalName) => currentProbeExpression(pdkResolution, componentName, terminalName),
    );
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
      const appActions = get() as unknown as {
        handleNewResults: (
          res: ResultType[],
          options?: { switchToPlot?: boolean },
        ) => void;
      };
      const progressiveResults: SimulationWorkerResult[] = [];
      const publishProgressiveAggregation = (simulationResult: SimulationWorkerResult): void => {
        progressiveResults.push(simulationResult);
        const aggregated = aggregateParallelResults(
          progressiveResults,
          bracketOp,
          { preserveParameterInfo: true, sortByParameter: true },
        );
        if (aggregated && isCurrentRun()) {
          appActions.handleNewResults(
            [aggregated as ResultType],
            { switchToPlot: progressiveResults.length === 1 },
          );
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
            const currentState = get() as SimulationSlice;
            const thread = currentState.parallelSimulationProgress.threads.find(
              (candidate) => candidate.threadId === threadId
            );
            actions.updateThreadProgress(threadId, {
              isRunning: true,
              isCompleted: false,
              currentSimulation: currentSim,
              totalAssignedSimulations:
                (thread?.totalAssignedSimulations || 0) + 1,
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
          appActions.handleNewResults(
            [aggregated as ResultType],
            { switchToPlot: false },
          );
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
};
