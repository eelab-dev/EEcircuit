# EEcircuit

EEcircuit is a circuit simulator based on [ngspice](https://sourceforge.net/p/ngspice/ngspice/), and it runs inside the browser using [WebAssembly](https://webassembly.org/) technology. The input is schematic, and the output is the results of the analysis that you're doing in the simulations. You are able to plot and view the results directly in the browser using a high-performance WebGL plotting library [webgl-plot](https://github.com/danchitnis/webgl-plot), or download the data in CSV format for further analysis. Notice that your schematic and results are processed locally and _always_ remain inside _your_ browser and are _never_ uploaded to the network. The focus of this implementation is rapid analysis and sharing circuit ideas and results within the [VLSI](https://en.wikipedia.org/wiki/Very_Large_Scale_Integration) and chip-design communities.

**The next version of EEcircuit has been released! If you still require the old vesrion go to [gen1.EEcircuit.com](https://gen1.eecircuit.com).**


## Usage

For a user guide, go to [help.EEcircuit.com](https://help.eecircuit.com).

Watch the launch [presentation video](https://www.youtube.com/watch?v=GFpjMzT08XQ) 📺

## SPICE

To learn more about SPICE netlits, refer to [ngspice manual](http://ngspice.sourceforge.net/docs/ngspice-manual.pdf)



## Acknowledgments

EEcircuit is built on top of [Ngspice](https://sourceforge.net/p/ngspice/ngspice/), [Emscripten](https://emscripten.org/), [Docker](https://www.docker.com/),[React](https://react.dev/), [Vite](https://vitejs.dev/), [Vercel](https://vercel.com/)
