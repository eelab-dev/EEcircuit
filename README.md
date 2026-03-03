# EEcircuit

EEcircuit is a circuit simulator based on [ngspice](https://sourceforge.net/p/ngspice/ngspice/) and it runs inside the browser using [WebAssembly](https://webassembly.org/) technology. The input is schematic, and the output is results of the analysis that you're doing in the simulations. You are able to plot and view the results directly in the browser using high-performance WebGL plotting library [webgl-plot](https://github.com/danchitnis/webgl-plot), or download the data in CSV format for further analysis. Notice that your schematic and results are processed locally and _always_ remain inside _your_ browser and are _never_ uploaded to network. The focus of this implementation is rapid analysis, sharing circuits ideas and results in [VLSI](https://en.wikipedia.org/wiki/Very_Large_Scale_Integration) and chip-design communities.

**Next version of EEcircuit is released! if you still require the old vesrion go to [gen1.EEcircuit.com](https://gen1.eecircuit.com).**


## Usage

For a short user guide go to [User Guide](https://github.com/eelab-dev/EEcircuit/blob/gen2/user.md).

More tutorials and videos are coming soon.

## SPICE

To learn more about SPICE netlits refer to [ngspice manual](http://ngspice.sourceforge.net/docs/ngspice-manual.pdf)



## Acknowledgments

EEcircuit is built on top of [Ngspice](https://sourceforge.net/p/ngspice/ngspice/), [Emscripten](https://emscripten.org/), [Docker](https://www.docker.com/),[React](https://react.dev/), [Vite](https://vitejs.dev/), [Vercel](https://vercel.com/)
