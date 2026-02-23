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

    // Revert to reliable CDN loading for local development
    const pyodideModule = await import(
      /* @vite-ignore */
      "https://cdn.jsdelivr.net/pyodide/v0.27.5/full/pyodide.mjs"
    );
    pyodide = await pyodideModule.loadPyodide();

    // Prepare micropip
    await pyodide.loadPackage("micropip");
    const micropip = pyodide.pyimport("micropip");

    // Pre-load binary packages
    try {
      await pyodide.loadPackage(["numpy", "matplotlib"]);
    } catch (e) {
      console.warn("Failed to pre-load binary packages:", e);
    }

    // Install pure python dependencies
    await micropip.install(["pyyaml", "schemdraw"]);
    
    // Install analogpy
    await micropip.install("analogpy==0.2.2", {keep_going: true});

    isReady = true;
    return "Pyodide ready with analogpy 0.2.2";
  },

  /**
   * Execute Python code and capture generated netlists.
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

    # First look for Testbench instances
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
            from analogpy.visualization.svg import render_schematic_svg, render_block_diagram_svg
            from analogpy.visualization.symbols import get_default_renderer, SymbolStyle
            
            get_default_renderer().default_style = SymbolStyle.DETAILED
            
            if hasattr(_tb, 'analyses'):
                _svg_result = render_block_diagram_svg(_tb)
            else:
                _svg_result = render_schematic_svg(_tb, compact=True)
        except Exception as _svg_err:
            _svg_result = f"<!-- SVG error: {_svg_err} -->"
    elif _captured_output.strip():
        _ngspice_result = _captured_output.strip()
except Exception as _e:
    pass

if not _ngspice_result and _captured_output.strip():
    _ngspice_result = _captured_output.strip()

# Return results as a dict
{"ngspice": _ngspice_result, "spectre": _spectre_result, "schematicSvg": _svg_result, "error": ""}
`;

      const result = pyodide.runPython(wrappedCode);
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