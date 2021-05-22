![Build App](https://github.com/danchitnis/EEsim/workflows/Build%20App/badge.svg) ![CodeQL](https://github.com/danchitnis/EEsim/workflows/CodeQL/badge.svg) [![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.4781565.svg)](https://doi.org/10.5281/zenodo.4781565)

⚠ Currently works on Chrome and Edge. Availability on Safari coming soon. Check latest [status](https://wpt.fyi/results/workers/modules/dedicated-worker-import.any.html?label=master&product=chrome%5Bstable%5D&product=firefox%5Bstable%5D&product=safari%5Bstable%5D&product=chrome%5Bexperimental%5D&product=firefox%5Bexperimental%5D&product=safari%5Bexperimental%5D&aligned). More info [here...](https://github.com/danchitnis/EEsim/issues/9)

# EEsim

EEsim is a circuit simulator based on [ngspice](https://sourceforge.net/p/ngspice/ngspice/) and it runs inside the browser using [WebAssembly](https://webassembly.org/) technology. The input is spice based netlist, and the output is results of the analysis that you're doing in the simulations. You are able to plot and view the results directly in the browser using high-performance WebGL plotting library [webgl-plot](https://github.com/danchitnis/webgl-plot), or download the data in CSV format for further analysis. Notice that your netlist and results are processed locally and _always_ remain inside _your_ browser and are _never_ uploaded to network. The focus of this implementation is rapid analysis, sharing circuits ideas and results in [VLSI](https://en.wikipedia.org/wiki/Very_Large_Scale_Integration) and chip-design communities.

## Getting started

Copy and paste this circuit into editor and click Run. Input is also compatible with [ngspice](https://sourceforge.net/p/ngspice/ngspice/) netlist.

### Basic RCL circuit

```plaintext
Basic RLC circuit
.include modelcard.CMOS90

r vdd 2 100.0
l vdd 2 1
c vdd 2 0.01
m1 2 1 0 0 N90 W=100.0u L=0.09u
vdd vdd 0 1.8

vin 1 0 0 pulse (0 1.8 0 0.1 0.1 15 30)
.tran 0.1 50

.end
```

## Examples

<span style="font-size:2em">💥</span> See [here](https://github.com/danchitnis/EEsim/blob/main/examples.md) for more examples.

## Usage

Use your mouse to pan & zoom on the plot. left click for area **zoom** and right click hold and drag for **pan**. To reset the view **double click**.

## Documentation

<span style="font-size:2em">📺</span> A brief [presentation](https://youtu.be/BZLsTAZr1tY) on the origins of EEsim and how it was developed. ([slides](https://docs.google.com/presentation/d/e/2PACX-1vROdrVB1vpGM1tqHSvA2HpPmH6B2HpILzLM8kaqnePEtZ8UP_To8q5GsWh90YOtBjYZCUov2rnOzis7/pub?start=false&loop=false&delayms=3000))

To learn more about SPICE netlits refer to [ngspice manual](http://ngspice.sourceforge.net/docs/ngspice-manual.pdf)

## Transistor Models

See [Transistor Models](https://github.com/danchitnis/EEsim/blob/main/models.md) for more information.

## Acknowledgments

Thanks to [Konstantinos Bantounos](https://www.linkedin.com/in/kbantounos?originalSubdomain=uk) for testing.

## Contributions

[Ngspice](https://sourceforge.net/p/ngspice/ngspice/), [SPICE3f5](https://ptolemy.berkeley.edu/projects/embedded/pubs/), [Emscripten](https://emscripten.org/), [Docker](https://www.docker.com/), [Fedora](https://getfedora.org/), [Snowpack](https://www.snowpack.dev/), [Vercel](https://vercel.com/)
