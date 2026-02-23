/**
 * Pyodide Web Worker
 *
 * Loads Pyodide (Python WASM runtime) and executes analogpy Python code.
 * Returns the generated ngspice and Spectre netlists.
 *
 * Communication via Comlink RPC.
 */

import * as ComLink from "comlink";

// Pyodide types (loaded dynamically from CDN)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pyodide: any = null;
let isReady = false;

export type PythonResult = {
  ngspice: string;
  spectre: string;
  schematicSvg: string;
  error: string;
};

const pyodideWorker = {
  /**
   * Initialize Pyodide and install analogpy.
   */
  async init(): Promise<string> {
    if (isReady) return "already initialized";

    // Load Pyodide from CDN using dynamic import (module workers can't use importScripts)
    const pyodideModule = await import(
      /* @vite-ignore */
      "https://cdn.jsdelivr.net/pyodide/v0.27.5/full/pyodide.mjs"
    );
    pyodide = await pyodideModule.loadPyodide();

    // Install analogpy and its dependencies from PyPI via micropip
    await pyodide.loadPackage("micropip");
    const micropip = pyodide.pyimport("micropip");
    await micropip.install("pyyaml");
    await micropip.install("analogpy", {keep_going: true});

    // Install visualization deps for schematic SVG generation
    try {
      await pyodide.loadPackage("matplotlib");
      await micropip.install("schemdraw");
    } catch {
      // Visualization deps are optional
    }

    isReady = true;
    return "Pyodide ready with analogpy";
  },

  /**
   * Execute Python code and capture generated netlists.
   *
   * The Python code should use analogpy to build a circuit and call
   * generate_ngspice() and/or generate_spectre(). The worker wraps
   * the user code to capture the output of print() calls and also
   * tries to extract netlists from the last expression.
   */
  async runPython(code: string): Promise<PythonResult> {
    if (!isReady) {
      return {
        ngspice: "",
        spectre: "",
        schematicSvg: "",
        error: "Pyodide not initialized. Call init() first.",
      };
    }

    try {
      // Wrap user code: capture stdout (print output) and try to
      // generate both netlists from the testbench variable.
      const wrappedCode = `
import sys
import io

# Capture stdout
_stdout_capture = io.StringIO()
sys.stdout = _stdout_capture

# User code
${code}

# Restore stdout
sys.stdout = sys.__stdout__
_captured_output = _stdout_capture.getvalue()

# Try to find testbench and generate netlists
_ngspice_result = ""
_spectre_result = ""
_svg_result = ""

try:
    from analogpy import generate_ngspice, generate_spectre, Testbench
    from analogpy.testbench import Testbench as _TBClass

    # First look for Testbench instances (preferred over plain Circuit)
    _candidates = [v for v in dir() if not v.startswith('_')]
    _tb = None
    for _name in reversed(_candidates):
        _obj = eval(_name)
        if isinstance(_obj, _TBClass):
            _tb = _obj
            break

    if _tb is not None:
        _ngspice_result = generate_ngspice(_tb)
        _spectre_result = generate_spectre(_tb)

        # Try to generate schematic SVG
        try:
            import matplotlib
            matplotlib.use('Agg')
            from importlib.metadata import version as _pkg_ver
            _ver = _pkg_ver('analogpy')
            from analogpy.visualization.svg import render_schematic_svg
            _svg_result = render_schematic_svg(_tb)
        except Exception as _svg_err:
            _ver = 'unknown'
            try:
                from importlib.metadata import version as _pkg_ver
                _ver = _pkg_ver('analogpy')
            except:
                pass
            _svg_result = f"<!-- SVG error (analogpy {_ver}): {_svg_err} -->"
    elif _captured_output.strip():
        _ngspice_result = _captured_output.strip()
except Exception as _e:
    pass

# If user printed something and we didn't find a TB, use stdout
if not _ngspice_result and _captured_output.strip():
    _ngspice_result = _captured_output.strip()

# Return results as a dict
{"ngspice": _ngspice_result, "spectre": _spectre_result, "schematicSvg": _svg_result, "error": ""}
`;

      const result = pyodide.runPython(wrappedCode);
      // Convert Python dict to JS object
      const jsResult = result.toJs({ dict_converter: Object.fromEntries });
      result.destroy();

      return {
        ngspice: jsResult.ngspice || "",
        spectre: jsResult.spectre || "",
        schematicSvg: jsResult.schematicSvg || "",
        error: "",
      };
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      return {
        ngspice: "",
        spectre: "",
        schematicSvg: "",
        error: errorMsg,
      };
    }
  },

  isReady(): boolean {
    return isReady;
  },
};

export type PyodideWorkerType = typeof pyodideWorker;

ComLink.expose(pyodideWorker);
