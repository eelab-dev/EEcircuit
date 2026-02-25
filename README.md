[![Npm Build](https://github.com/eelab-dev/EEcircuit/actions/workflows/build.yml/badge.svg)](https://github.com/eelab-dev/EEcircuit/actions/workflows/build.yml) [![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.4781565.svg)](https://doi.org/10.5281/zenodo.4781565)

(formerly EEsim.dev)

# analogpy

**analogpy** (the successor to EEcircuit) is a Python package for programmatically defining circuits using a native Python representation. It features cross-platform compatibility with the ability to generate both SPICE and Spectre netlists. This website serves as a GUI-driven simulation environment powered by **ngspice** running in the browser via WebAssembly. By supporting both analogpy-based Python code and standard SPICE netlists, it provides a seamless workflow from definition to analysis.

Beyond simulation, this platform demonstrates the cutting-edge integration of AI—including **Anthropic Claude, Google Gemini, and OpenAI GPT**—directly with circuit analysis to assist in design and debugging. Results are visualized in real-time using the high-performance **webgl-plot** library or exported as CSV.

To ensure complete privacy, all simulation and data processing occur locally within your browser; your netlists and results are never uploaded to a server. For professional workflows involving **NDA-restricted PDKs**, you can download and run analogpy locally to explore its full power within your secure environment. analogpy is built to facilitate rapid iteration and collaborative sharing within the VLSI and chip-design communities.

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

<span style="font-size:2em">💥</span> See [here](https://github.com/eelab-dev/EEcircuit/blob/main/examples.md) for more examples.

## Usage

Use your mouse to pan & zoom on the plot. left click for area **zoom** and right click hold and drag for **pan**. To reset the view **double click**.

## Documentation

<span style="font-size:2em">📺</span> A brief [presentation](https://youtu.be/BZLsTAZr1tY) on the origins of EEcircuit (formerly EEsim.dev) and how it was developed. ([slides](https://docs.google.com/presentation/d/e/2PACX-1vROdrVB1vpGM1tqHSvA2HpPmH6B2HpILzLM8kaqnePEtZ8UP_To8q5GsWh90YOtBjYZCUov2rnOzis7/pub?start=false&loop=false&delayms=3000))

To learn more about SPICE netlits refer to [ngspice manual](http://ngspice.sourceforge.net/docs/ngspice-manual.pdf)

## Transistor Models

See [Transistor Models](https://github.com/eelab-dev/EEcircuit/blob/main/models.md) for more information.

## Acknowledgments

Thanks to [Xuanhao Bao](https://github.com/XuanhaoBao), [Chang Liu](https://github.com/chang10912), and [Konstantinos Bantounos](https://www.linkedin.com/in/kbantounos?originalSubdomain=uk) for testing.

## Contributions

[Ngspice](https://sourceforge.net/p/ngspice/ngspice/), [SPICE3f5](https://ptolemy.berkeley.edu/projects/embedded/pubs/), [Emscripten](https://emscripten.org/), [Docker](https://www.docker.com/), [Chakra-UI](https://www.chakra-ui.com/), [Vercel](https://vercel.com/)
