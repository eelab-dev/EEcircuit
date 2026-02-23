/**
 * PyodideRunner - manages the Pyodide Web Worker for executing
 * analogpy Python code in the browser.
 *
 * Usage:
 *   const runner = new PyodideRunner();
 *   await runner.init();
 *   const result = await runner.runPython(code);
 *   // result.ngspice  - generated ngspice netlist
 *   // result.spectre  - generated Spectre netlist
 *   // result.error    - error message if any
 */

import * as ComLink from "comlink";
import type { PyodideWorkerType, PythonResult } from "./pyodideWorker.ts";

export type { PythonResult };

export class PyodideRunner {
  private worker: ComLink.Remote<PyodideWorkerType> | null = null;
  private _isReady = false;
  private _isLoading = false;

  get isReady(): boolean {
    return this._isReady;
  }

  get isLoading(): boolean {
    return this._isLoading;
  }

  /**
   * Initialize Pyodide worker and install analogpy.
   * This downloads ~15MB of WASM, so it's deferred until first use.
   */
  async init(): Promise<string> {
    if (this._isReady) return "already initialized";
    if (this._isLoading) return "loading in progress";

    this._isLoading = true;

    const rawWorker = new Worker(
      new URL("./pyodideWorker.ts", import.meta.url),
      { type: "module" }
    );
    this.worker = ComLink.wrap<PyodideWorkerType>(rawWorker);

    // Get the base URL (including potential sub-directories like /gaofeng-fan/EEcircuit/)
    // In Vite, import.meta.env.BASE_URL is the most reliable way.
    // If not available, we fall back to manual detection.
    const baseUrl = (import.meta as any).env?.BASE_URL || "/";
    const fullBaseUrl = window.location.origin + (baseUrl.endsWith("/") ? baseUrl : baseUrl + "/");

    const msg = await this.worker.init(fullBaseUrl);
    this._isReady = true;
    this._isLoading = false;
    return msg;
  }

  /**
   * Execute Python code and return generated netlists.
   */
  async runPython(code: string): Promise<PythonResult> {
    if (!this.worker || !this._isReady) {
      return {
        ngspice: "",
        spectre: "",
        schematicSvg: "",
        error: "PyodideRunner not initialized. Call init() first.",
      };
    }
    return await this.worker.runPython(code);
  }
}
