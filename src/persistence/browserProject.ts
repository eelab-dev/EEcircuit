import type { AppStore } from "../store/appStoreTypes";
import type { EEcircuitFile } from "../types/commonTypes";
import { validateEEcircuitFile } from "../utils/eeCircuitFileValidator";

export const BROWSER_PROJECT_KEY = "eecircuit-browser-project";
export const SESSION_KEYS = [
  "selectedSimType", "simulationConfig", "selectedSimulationConfigIndex", "simulationConfigDrafts",
  "lastSelectedSimulationConfigNames", "manualNetlistDirty", "mainTabValue", "toBePlotted",
  "numCanvases", "selectedVariables", "canvas1SelectedVariables", "canvas2SelectedVariables",
  "isLogX", "isLogY", "isLogY1", "isLogY2", "canvas1IsLogY", "canvas2IsLogY",
  "lineThickness", "showInternalSignals", "resetVariableSelectionsOnNewSim",
  "resetPlotStateOnNewSim", "maxWebWorkers",
] as const satisfies readonly (keyof AppStore)[];
export type BrowserSessionSetup = Pick<AppStore, typeof SESSION_KEYS[number]> & { manualNetlist?: string };
export interface BrowserProjectSnapshotV1 {
  version: 1;
  project: EEcircuitFile;
  session: BrowserSessionSetup;
}
export const PERSISTED_APP_KEYS: ReadonlySet<string> = new Set([
  ...SESSION_KEYS, "currentSchematic", "hasSchematicDocument", "allSimulationConfigs",
  "projectMetadata", "netList",
]);

export function captureBrowserProject(state: AppStore): BrowserProjectSnapshotV1 {
  const session = Object.fromEntries(SESSION_KEYS.map((key) => [key, state[key]])) as BrowserSessionSetup;
  if (state.manualNetlistDirty || state.selectedSimType === "None") session.manualNetlist = state.netList;
  return {
    version: 1,
    project: {
      schema: "EEcircuitV2", ...state.projectMetadata,
      ...(state.hasSchematicDocument ? { schematic: state.currentSchematic } : {}),
      simulations: state.allSimulationConfigs,
    },
    session,
  };
}

const record = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const strings = (value: unknown) => Array.isArray(value) && value.every((item) => typeof item === "string");

export async function validateBrowserProject(value: unknown): Promise<BrowserProjectSnapshotV1> {
  if (!record(value) || value.version !== 1 || !record(value.session)) throw new Error("Unsupported browser project snapshot.");
  const validation = validateEEcircuitFile(value.project);
  if (!validation.valid) throw new Error(validation.error);
  const project = validation.file;
  const session = value.session;
  const booleanKeys = ["manualNetlistDirty", "isLogX", "isLogY", "isLogY1", "isLogY2", "canvas1IsLogY", "canvas2IsLogY",
    "showInternalSignals", "resetVariableSelectionsOnNewSim", "resetPlotStateOnNewSim"];
  if (booleanKeys.some((key) => typeof session[key] !== "boolean") ||
      ["selectedVariables", "canvas1SelectedVariables", "canvas2SelectedVariables"].some((key) => !strings(session[key])) ||
      typeof session.mainTabValue !== "string" || !["schematic", "simulate", "plot"].includes(session.mainTabValue) ||
      typeof session.selectedSimType !== "string" || !["None", "DC", "AC", "Transient", "Noise"].includes(session.selectedSimType) ||
      typeof session.numCanvases !== "number" || ![1, 2].includes(session.numCanvases) ||
      !Number.isInteger(session.selectedSimulationConfigIndex) || Number(session.selectedSimulationConfigIndex) < -1 ||
      typeof session.lineThickness !== "number" || !Number.isFinite(session.lineThickness) || session.lineThickness <= 0 ||
      !Number.isInteger(session.maxWebWorkers) || Number(session.maxWebWorkers) < 1 ||
      (session.manualNetlist !== undefined && typeof session.manualNetlist !== "string") ||
      ((session.manualNetlistDirty || session.selectedSimType === "None") && typeof session.manualNetlist !== "string") ||
      !record(session.simulationConfigDrafts) || !record(session.lastSelectedSimulationConfigNames) ||
      !Object.values(session.lastSelectedSimulationConfigNames).every((name) => typeof name === "string") ||
      !Array.isArray(session.toBePlotted) || !session.toBePlotted.every((item) => record(item) &&
        (item.type === "voltage" ? typeof item.netName === "string" : item.type === "current" &&
          typeof item.componentName === "string" && typeof item.terminalName === "string"))) {
    throw new Error("The browser project setup is malformed.");
  }
  const configs = [...Object.values(session.simulationConfigDrafts), ...(session.simulationConfig ? [session.simulationConfig] : [])];
  if (!configs.every((config) => record(config) && (config.name === undefined || typeof config.name === "string")) ||
      Number(session.selectedSimulationConfigIndex) >= (project.simulations?.length ?? 0)) {
    throw new Error("The browser simulation selection is malformed.");
  }
  const checkedConfigs = validateEEcircuitFile({ schema: "EEcircuitV2", simulations: configs });
  if (!checkedConfigs.valid) throw new Error(checkedConfigs.error);
  if (session.simulationConfig && (!record(session.simulationConfig) || session.simulationConfig.type !== session.selectedSimType)) {
    throw new Error("The browser simulation selection is inconsistent.");
  }
  return { version: 1, project, session: { ...Object.fromEntries(SESSION_KEYS.map((key) => [key, session[key]])),
    ...(session.manualNetlist !== undefined ? { manualNetlist: session.manualNetlist } : {}) } as BrowserSessionSetup };
}

/** Writes only committed snapshots. Transactions never replace the last good value on failure. */
export class BrowserProjectPersistence {
  private enabled = false;
  private blocked = false;
  private depth = 0;
  private lastSaved?: string;
  private notified = false;
  constructor(
    private readonly storage: () => Pick<Storage, "getItem" | "setItem">,
    private readonly capture: () => BrowserProjectSnapshotV1,
    private readonly report: (text: string) => void,
    private readonly isolated = false,
  ) {}
  async load(): Promise<BrowserProjectSnapshotV1 | undefined> {
    if (this.isolated) return undefined;
    try {
      const raw = this.storage().getItem(BROWSER_PROJECT_KEY);
      if (raw === null) return undefined;
      const snapshot = await validateBrowserProject(JSON.parse(raw));
      this.lastSaved = raw;
      return snapshot;
    } catch (error) {
      this.recover(error);
      return undefined;
    }
  }
  get recovering() { return this.blocked; }
  recover(error: unknown) {
    this.blocked = true;
    this.warn(`The browser project could not be restored. Its saved data was retained. Open or create a project to resume autosave. ${error instanceof Error ? error.message : String(error)}`);
  }
  private warn(text: string) {
    if (this.notified) return;
    this.notified = true;
    this.report(text);
  }
  start() { this.enabled = true; this.save(); }
  stop() { this.enabled = false; }
  save() {
    if (!this.enabled || this.blocked || this.depth || this.isolated) return;
    try {
      const serialized = JSON.stringify(this.capture());
      if (serialized === this.lastSaved) return;
      this.storage().setItem(BROWSER_PROJECT_KEY, serialized);
      this.lastSaved = serialized;
    } catch (error) {
      this.warn(`Browser autosave failed; the previous saved project was retained. ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  async transaction<T>(operation: () => Promise<T>, resumeRecovery = false): Promise<T> {
    this.depth++;
    let completed = false;
    try {
      const result = await operation();
      completed = true;
      if (resumeRecovery) this.blocked = false;
      return result;
    } finally {
      this.depth--;
      if (completed) this.save();
    }
  }
}
