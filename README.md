# EEcircuit

EEcircuit is a circuit simulator based on [ngspice](https://sourceforge.net/p/ngspice/ngspice/), and it runs inside the browser using [WebAssembly](https://webassembly.org/) technology. The input is schematic, and the output is the results of the analysis that you're doing in the simulations. You are able to plot and view the results directly in the browser using a high-performance WebGL plotting library [webgl-plot](https://github.com/danchitnis/webgl-plot), or download the data in CSV format for further analysis. Notice that your schematic and results are processed locally and _always_ remain inside _your_ browser and are _never_ uploaded to the network. The focus of this implementation is rapid analysis and sharing circuit ideas and results within the [VLSI](https://en.wikipedia.org/wiki/Very_Large_Scale_Integration) and chip-design communities.

**The next version of EEcircuit has been released! If you still require the old version go to [gen1.EEcircuit.com](https://gen1.eecircuit.com).**


## Usage

For a user guide, go to [help.EEcircuit.com](https://help.eecircuit.com).

Watch the launch [presentation video](https://www.youtube.com/watch?v=GFpjMzT08XQ) 📺

## Development

The repository expects the sibling `../EEcircuit-schematic` package because it is a local file dependency. Install with `npm ci`, run `npm run check`, and run `npm test` for the sequential headed local-Chrome suite. Video-generation tests are separate and are not included in `npm test`.

Deployment uses Wrangler and the Cloudflare configuration in `wrangler.jsonc`.

### EEcircuit file format

The application reads and writes `EEcircuitV2` documents. V2 schematic connections are explicit: a connected wire endpoint has a terminal or junction reference, while an endpoint without a reference is electrically floating even if it shares a terminal's coordinates. Canonical saves may store a net name on one representative wire instead of repeating it on every connected segment.

`EEcircuitV1` is obsolete and cannot be opened directly. When a V1 file is selected, the application offers to convert and download a separate V2 file. The converter rejects ambiguous or invalid wiring rather than changing the circuit by guessing.

### Browser project autosave

The latest committed schematic and simulation setup are saved synchronously as a versioned snapshot under `eecircuit-browser-project`. Refreshing or reopening restores empty canvases, wires/text, project metadata, profiles and unfinished drafts, authored manual netlists, plot selections/settings, and the workspace. Plot restores Simulation because results are not saved. Camera, pointer/preview state, undo history and simulation results are excluded; exported files remain EEcircuitV2.

Invalid or unsupported snapshots and failed imports retain the saved value. Autosave pauses during recovery until an explicit successful opening or creation. Storage failures produce one notification. `?clean=true` neither restores nor writes the browser project; clearing local data stops persistence before reload.

This is a selective port of EEcircuit-Next commit `a8d4c6b5e958314e89886493ae60e17e643fcef8`. The shared `BrowserProjectPersistence` controller and its transaction/lifecycle interfaces are retained. V2 capture, validation and hydration intentionally omit Next's layout, PDK/process/corners, Monte Carlo, transmission-line models/library and shared parameters, plus their session settings.

For eventual integration, retain `tests/fixtures/browser-project-v2.json`: Next's reader must upgrade its `project` with the existing V2-to-V3 converter and default newly introduced session fields before hydration. This port does not implement that reader upgrade or a merge, and does not guarantee a conflict-free future merge.

The current shared schematic package also exposes component families absent from this application. The property map allows a subset of the editor's types and the picker filters to that supported subset; this keeps dependency type checks valid without adding those features. An application history boundary prevents Undo from reaching the editor's startup blank entry after restoring or replacing a document; no history is serialized.

## SPICE

To learn more about SPICE netlists, refer to the [ngspice manual](http://ngspice.sourceforge.net/docs/ngspice-manual.pdf).



## Acknowledgments

EEcircuit is built on top of [Ngspice](https://sourceforge.net/p/ngspice/ngspice/), [Emscripten](https://emscripten.org/), [React](https://react.dev/), [Vite](https://vitejs.dev/), and [Cloudflare Wrangler](https://developers.cloudflare.com/workers/wrangler/).
