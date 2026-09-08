import type { AppStore } from "../store/appStoreTypes";
import { notifySimulationErrors } from "../utils/simulationErrorNotifier";
import { circuitCompatibilityErrors } from "../pdk/circuitCompatibility";

let latestSingleRunId = 0;

/** Runs a simulation without depending on the UI framework or component lifecycle. */
export async function executeSimulation(
  getStore: () => AppStore,
  editorNetlist: string,
): Promise<void> {
  const store = getStore();
  let activeNetlist = editorNetlist;
  const compatibilityErrors = circuitCompatibilityErrors(
    store.currentSchematic,
    store.processId,
    store.selectedSimType === "None" ? editorNetlist : "",
  );
  if (compatibilityErrors.length) {
    notifySimulationErrors(compatibilityErrors);
    return;
  }

  if (store.selectedSimType === "None") {
    store.setNetList(activeNetlist);
  } else {
    await store.generateDisplayNetlist();
    activeNetlist = getStore().netList;
  }

  if (store.resetVariableSelectionsOnNewSim) store.resetVariableSelections();
  if (store.resetPlotStateOnNewSim) store.resetPlotState();
  store.clearResults();

  const { findFirstBracketOperation } = await import("../utils/bracketParser");
  if (findFirstBracketOperation(activeNetlist)) {
    await getStore().runParallelSimulation(activeNetlist);
    return;
  }

  const runId = ++latestSingleRunId;
  const { runSingleSimulation } = await import("../simulation/parallelSimulation");
  const result = await runSingleSimulation(activeNetlist);
  if (runId !== latestSingleRunId) return;

  if (!result.success) {
    notifySimulationErrors(
      result.errorDetails ?? [],
      result.errorMessage ?? "Simulation failed to run. Check the netlist for errors.",
    );
    return;
  }

  if (result.result) getStore().handleNewResults([result.result]);
  if (result.errorDetails?.length) notifySimulationErrors(result.errorDetails);
}
