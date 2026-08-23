# EEcircuit

EEcircuit is a circuit simulator based on [ngspice](https://sourceforge.net/p/ngspice/ngspice/), and it runs inside the browser using [WebAssembly](https://webassembly.org/) technology. The input is schematic, and the output is the results of the analysis that you're doing in the simulations. You are able to plot and view the results directly in the browser using a high-performance WebGL plotting library [webgl-plot](https://github.com/danchitnis/webgl-plot), or download the data in CSV format for further analysis. Notice that your schematic and results are processed locally and _always_ remain inside _your_ browser and are _never_ uploaded to the network. The focus of this implementation is rapid analysis and sharing circuit ideas and results within the [VLSI](https://en.wikipedia.org/wiki/Very_Large_Scale_Integration) and chip-design communities.

**The next version of EEcircuit has been released! If you still require the old version go to [gen1.EEcircuit.com](https://gen1.eecircuit.com).**


## Usage

For a user guide, go to [help.EEcircuit.com](https://help.eecircuit.com).

Watch the launch [presentation video](https://www.youtube.com/watch?v=GFpjMzT08XQ) 📺

## Development

The repository expects the sibling `../EEcircuit-schematic` package because it is a local file dependency. Install with `npm ci`, run `npm run check`, and run `npm test` for the sequential headed local-Chrome suite. Video-generation tests are separate and are not included in `npm test`.

Deployment uses Wrangler and the Cloudflare configuration in `wrangler.jsonc`.

## SPICE

To learn more about SPICE netlists, refer to the [ngspice manual](http://ngspice.sourceforge.net/docs/ngspice-manual.pdf).



## Acknowledgments

EEcircuit is built on top of [Ngspice](https://sourceforge.net/p/ngspice/ngspice/), [Emscripten](https://emscripten.org/), [React](https://react.dev/), [Vite](https://vitejs.dev/), and [Cloudflare Wrangler](https://developers.cloudflare.com/workers/wrangler/).
