/**
 * PyodideRunner - manages the Pyodide Web Worker for executing
 * analogpy Python code in the browser.
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

  async init(): Promise<string> {
    if (this._isReady) return "already initialized";
    if (this._isLoading) return "loading in progress";

    this._isLoading = true;

    const rawWorker = new Worker(
      new URL("./pyodideWorker.ts", import.meta.url),
      { type: "module" }
    );
    this.worker = ComLink.wrap<PyodideWorkerType>(rawWorker);

    // Call init without any complex baseUrl detection
    const msg = await this.worker.init();
    this._isReady = true;
    this._isLoading = false;
    return msg;
  }

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