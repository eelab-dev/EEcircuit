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
  stdout: string;
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
    await micropip.install("analogpy", {keep_going: true});

    isReady = true;
    return "Pyodide ready with analogpy";
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

_ngspice_result = ""
_spectre_result = ""
_svg_result = ""

# Patch generate_ngspice / generate_spectre in the analogpy module so that
# any call — whether via "from analogpy import ..." or "analogpy.generate_*" —
# automatically registers the result without extra boilerplate.
try:
    import analogpy as _analogpy
    from analogpy import generate_ngspice as _real_gen_ngspice
    from analogpy import generate_spectre as _real_gen_spectre

    def generate_ngspice(tb):
        global _ngspice_result
        result = _real_gen_ngspice(tb)
        _ngspice_result = result
        return result

    def generate_spectre(tb):
        global _spectre_result
        result = _real_gen_spectre(tb)
        _spectre_result = result
        return result

    _analogpy.generate_ngspice = generate_ngspice
    _analogpy.generate_spectre = generate_spectre
except Exception:
    pass

# ---- User code ----
${code}
# ---- End user code ----

# Restore stdout
sys.stdout = sys.__stdout__
_captured_output = _stdout_capture.getvalue()

# Fallback: if user never called generate_ngspice/generate_spectre,
# auto-detect the last Testbench in scope.
try:
    from analogpy.testbench import Testbench as _TBClass
    _tb = None
    for _name in reversed([v for v in dir() if not v.startswith('_')]):
        _obj = eval(_name)
        if isinstance(_obj, _TBClass):
            _tb = _obj
            break
    if _tb is not None:
        if not _ngspice_result:
            _ngspice_result = _real_gen_ngspice(_tb)
        if not _spectre_result:
            _spectre_result = _real_gen_spectre(_tb)
except Exception:
    pass

# Auto-generate SVG schematic (user does not call this)
try:
    from analogpy.testbench import Testbench as _TBClass2
    _tb2 = None
    for _name2 in reversed([v for v in dir() if not v.startswith('_')]):
        _obj2 = eval(_name2)
        if isinstance(_obj2, _TBClass2):
            _tb2 = _obj2
            break
    if _tb2 is not None:
        import matplotlib
        matplotlib.use('Agg')
        from analogpy.visualization.svg import render_block_diagram_svg
        from analogpy.visualization.symbols import get_default_renderer, SymbolStyle
        get_default_renderer().default_style = SymbolStyle.DETAILED
        _svg_result = render_block_diagram_svg(_tb2)
except Exception as _svg_err:
    _svg_result = f"<!-- SVG error: {_svg_err} -->"

# Last-resort: use raw stdout if nothing else produced a netlist
if not _ngspice_result and _captured_output.strip():
    _ngspice_result = _captured_output.strip()

{"ngspice": _ngspice_result, "spectre": _spectre_result, "schematicSvg": _svg_result, "stdout": _captured_output, "error": ""}
`;

      const result = pyodide.runPython(wrappedCode);
      const jsResult = result.toJs({ dict_converter: Object.fromEntries });
      result.destroy();

      return {
        ngspice: jsResult.ngspice || "",
        spectre: jsResult.spectre || "",
        schematicSvg: jsResult.schematicSvg || "",
        stdout: jsResult.stdout || "",
        error: "",
      };
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      return {
        ngspice: "",
        spectre: "",
        schematicSvg: "",
        stdout: "",
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