[![Npm Build](https://github.com/eelab-dev/EEcircuit/actions/workflows/build.yml/badge.svg)](https://github.com/eelab-dev/EEcircuit/actions/workflows/build.yml) [![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.4781565.svg)](https://doi.org/10.5281/zenodo.4781565)

(formerly EEsim.dev)

# EEcircuit

EEcircuit is a circuit simulator based on ngspice that operates directly in your browser using WebAssembly technology. It takes a spice-based netlist as input and produces analysis results from your simulations as output. You can visualize and plot the results in the browser using the high-performance WebGL plotting library, **webgl-plot**, or download the data in CSV format for further analysis. Importantly, your netlist and results are processed locally, meaning they always remain within your browser and are never uploaded to a server. This project focuses on facilitating rapid analysis and sharing of circuit ideas and results within the VLSI and chip-design communities. Additionally, since EEcircuit uses a text-based netlist as input, you can utilize Git for version control to track your changes effectively.

### What's new

The plot viewer has been significantly enhanced with an advanced interactive experience: three independent measurement cursors (**A**, **B**, **M**) can be placed on any curve via keyboard shortcuts, with delta readouts in the legend. Each curve now has a **per-curve color picker** accessible directly from the legend. Zoom and pan have been reworked — scroll to zoom the X axis, Shift+Scroll for the Y axis, right-click drag for rectangle zoom, and middle-click drag to pan. A full keyboard shortcut system covers cursor placement, view fit, zoom steps, and item deletion. The platform also demonstrates AI-assisted circuit design and debugging through integration with **Anthropic Claude**, **Google Gemini**, and **OpenAI GPT**.

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

### Plot controls

| Action | Result |
|--------|--------|
| **Scroll** | Zoom X axis |
| **Shift + Scroll** | Zoom Y axis |
| **Right-click drag** | Zoom in on X axis (rectangle select) |
| **Middle-click drag** | Pan X + Y |
| **Left-click** | Select curve or cursor marker |

### Keyboard shortcuts

| Key | Action |
|-----|--------|
| `a` / `b` / `m` | Place cursor A / B / M on nearest curve |
| `c` | Clear all cursors |
| `f` | Fit view (reset zoom) |
| `[` / `]` | Zoom out / zoom in (X axis) |
| `Delete` | Remove selected curve or cursor |
| `Esc` | Deselect |

## Documentation

<span style="font-size:2em">📺</span> A brief [presentation](https://youtu.be/BZLsTAZr1tY) on the origins of EEcircuit (formerly EEsim.dev) and how it was developed. ([slides](https://docs.google.com/presentation/d/e/2PACX-1vROdrVB1vpGM1tqHSvA2HpPmH6B2HpILzLM8kaqnePEtZ8UP_To8q5GsWh90YOtBjYZCUov2rnOzis7/pub?start=false&loop=false&delayms=3000))

To learn more about SPICE netlits refer to [ngspice manual](http://ngspice.sourceforge.net/docs/ngspice-manual.pdf)

## Transistor Models

See [Transistor Models](https://github.com/eelab-dev/EEcircuit/blob/main/models.md) for more information.

## Acknowledgments

Thanks to [Xuanhao Bao](https://github.com/XuanhaoBao), [Chang Liu](https://github.com/chang10912), and [Konstantinos Bantounos](https://www.linkedin.com/in/kbantounos?originalSubdomain=uk) for testing.

## Contributions

[Ngspice](https://sourceforge.net/p/ngspice/ngspice/), [SPICE3f5](https://ptolemy.berkeley.edu/projects/embedded/pubs/), [Emscripten](https://emscripten.org/), [Docker](https://www.docker.com/), [Chakra-UI](https://www.chakra-ui.com/), [Vercel](https://vercel.com/)
