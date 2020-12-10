![Build App](https://github.com/danchitnis/EEsim/workflows/Build%20App/badge.svg) ![EMCC Build](https://github.com/danchitnis/EEsim/workflows/EEsim%20EMCC%20Build/badge.svg) ![CodeQL](https://github.com/danchitnis/EEsim/workflows/CodeQL/badge.svg)

# EEsim

EEsim is a circuit simulator based on [ngspice](https://sourceforge.net/p/ngspice/ngspice/) and it runs inside the browser using [WebAssembly](https://webassembly.org/) technology. The input is spice based netlist, and the output is results of the analysis that you're doing in the simulations. You are able to plot and view the results directly in the browser using high-performance WebGL plotting library [webgl-plot](https://github.com/danchitnis/webgl-plot), or download the data in CSV format for further analysis. Notice that your netlist and results are processed locally and _always_ remain inside _your_ browser and are _never_ uploaded to network. The focus of this implementation is rapid analysis, sharing circuits ideas and results in [VLSI](https://en.wikipedia.org/wiki/Very_Large_Scale_Integration) and chip-design communities.

## Example

These examples are also compatible with [ngspice](https://sourceforge.net/p/ngspice/ngspice/). Copy and paste them into the netlist editor and press Run!

### Basic RCL circuit

```plaintext
Basic RLC circuit
.include modelcard.CMOS90

r vdd 2 100.0
l vdd 2 1
c vdd 2 0.01
m1 2 1 0 0 N90 W=100.0u L=0.09u
vdd vdd 0 1.8

vin 1 0  pulse (0 1.8 0 0.1 0.1 15 30) ac 1
.tran  0.1 50

.end
```

### DC Sweep

```plaintext
Basic DC Sweep
.include modelcard.CMOS90

m1 2 1 0 0 N90 W=100.0u L=0.09u
Vds 2 0 DC 1.8
Vg 1 0 DC 1

.dc vds 0 1.8 0.01 vg 0.2 1 0.2

.end
```

### Ring Oscillator

```plaintext
Ring Oscillator
.include modelcard.CMOS90

m1 out1 vg1 0 0 N90 W=10.0u L=0.09u M=10
m2 out1 vg1 vdd vdd P90 W=10.0u L=0.09u M=10

m3 out2 out1 0 0 N90 W=10.0u L=0.09u M=10
m4 out2 out1 vdd vdd P90 W=10.0u L=0.09u M=10

m5 vg1 out2 0 0 N90 W=10.0u L=0.09u M=10
m6 vg1 out2 vdd vdd P90 W=10.0u L=0.09u M=10

c1 out1 0 0.1p
c2 out2 0 0.1p
c3 vg1 0 0.1p

vdd vdd 0 1.8

.tran  1p 2n

.end
```

## Usage

Use your mouse to pan & zoom on the plot. left click for area **zoom** and right click hold and drag for **pan**. To reset the view **double click**.

## Transistor Models

See [Transistor Models](https://github.com/danchitnis/EEsim/blob/main/models.md) for more information.

## Documentation

Please see [Ngspice manual](http://ngspice.sourceforge.net/docs/ngspice-manual.pdf)

## Contributions

[Ngspice](https://sourceforge.net/p/ngspice/ngspice/), [SPICE3f5](https://ptolemy.berkeley.edu/projects/embedded/pubs/), [Emscripten](https://emscripten.org/), [Docker](https://www.docker.com/), [Fedora](https://getfedora.org/), [Snowpack](https://www.snowpack.dev/), [Vercel](https://vercel.com/)
