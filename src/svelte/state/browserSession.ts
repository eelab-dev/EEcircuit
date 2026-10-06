import { BrowserProjectPersistence, captureBrowserProject, PERSISTED_APP_KEYS, type BrowserProjectSnapshotV1 } from "../../persistence/browserProject";
import { appState, observeAppChanges } from "./appState.svelte";
import { simulationCommandFor } from "../../simulation/simulationProfiles";
import { correctNgspiceUnits } from "../../utils/unitCorrection";

const clean = typeof location !== "undefined" && new URLSearchParams(location.search).get("clean") === "true";
export const browserProject = new BrowserProjectPersistence(
  () => localStorage,
  () => captureBrowserProject(appState),
  (text) => appState.addMessage({ text, type: "warning", category: "Schematic", mLevel: "user" }),
  clean,
);
let restored: BrowserProjectSnapshotV1 | undefined;
export const hasBrowserProject = () => restored !== undefined || browserProject.recovering;
export const restoredWorkspace = () => restored?.session.mainTabValue;

export async function initializeBrowserProject() {
  restored = await browserProject.load();
  if (restored) {
    const { project, session } = restored;
    appState.setCurrentSchematic(project.schematic ?? { componentInstances: [], wires: [] });
    appState.hasSchematicDocument = project.schematic !== undefined;
    appState.projectMetadata = { title: project.title, description: project.description, date: project.date };
    // Hydration is intentionally one assignment, without actions that reset drafts or regenerate decks.
    const { manualNetlist, ...setup } = session;
    Object.assign(appState, setup, {
      mainTabValue: "schematic",
      allSimulationConfigs: project.simulations ?? [],
      netList: manualNetlist ?? "",
      simulationCommandString: correctNgspiceUnits(simulationCommandFor(session.simulationConfig ?? { type: "None" })),
    });
  } else if (browserProject.recovering || clean) {
    resetBrowserRecovery();
  }
  observeAppChanges((keys) => {
    if (keys.some((key) => PERSISTED_APP_KEYS.has(key))) browserProject.save();
  });
}

export function resetBrowserRecovery(error?: unknown) {
  if (error !== undefined) browserProject.recover(error);
  restored = undefined;
  appState.setCurrentSchematic({ componentInstances: [], wires: [] });
  appState.hasSchematicDocument = false;
  appState.projectMetadata = {};
  Object.assign(appState, { allSimulationConfigs: [], selectedSimulationConfigIndex: -1, selectedSimType: "None",
    simulationConfig: { type: "None" }, simulationConfigDrafts: {}, lastSelectedSimulationConfigNames: {}, simulationCommandString: "" });
  appState.rawNetlist = "";
  appState.netList = "";
  appState.manualNetlistDirty = false;
  appState.toBePlotted = [];
  appState.mainTabValue = "schematic";
}
