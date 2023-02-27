# Skywater Examples

see this [issue](https://github.com/google/skywater-pdk/issues/301)

**🧨work-in-progress: only `nfet1v8` and `pfet1v8` implemented so far🧨**

Copy and paste the examples in [EEsim's](https://eesim.dev) netlist editor.

## nfet1V8 - IV Curves

```plaintext
nfet1V8 I-V curve
.include modelcard.skywater

.param mc_switch=0

Rg 1 2 680
X1 3 2 0 0 sky130_fd_pr__nfet_01v8 w=1u l=1u
Rd 3 4 100

* Supply
Vid 5 4 DC 0V
Vgb 1 0 DC [0:0.1:1.2]
Vdd 5 0 DC 3.3V

* This is the analysis
.dc Vdd 0 1.8 0.01

.save i(Vid)

.end
```

Matching [test results](https://cs.opensource.google/skywater-pdk/sky130_fd_pr/+/master:cells/nfet_01v8/tests/sky130_fd_pr__nfet_01v8_ids_v_vds.svg)

## pfet1V8_hvt - IV Curves

```plaintext
pfet1V8_hvt I-V curve
.include modelcard.skywater

.param mc_switch=0

* Gate bias
Rg 1 2 680
X1 3 2 5 5 sky130_fd_pr__pfet_01v8 w=1u l=1u
Rd 3 4 100

* DC source for current measure
Vid 4 0 DC 0V
Vgb 5 1 DC [0:0.1:1.2]
Vdd 5 0 DC 3.3V

* This is the analysis
.dc Vdd 0 1.8 0.01

.save i(Vid)

.end
```

Matching [test results](https://cs.opensource.google/skywater-pdk/sky130_fd_pr/+/master:cells/pfet_01v8_hvt/tests/sky130_fd_pr__pfet_01v8_hvt_ids_v_vds.svg)

## Inventer - DC Analysis

```plaintext
Skywater Inverter
.include modelcard.skywater

.param mc_switch=0

xmn 2 1 0 0 sky130_fd_pr__nfet_01v8 w=1.26u l=0.15u
xmp 2 1 vdd vdd sky130_fd_pr__pfet_01v8_hvt w=1.26u l=0.15u

* Supply node
vdd vdd 0 1.8

vin 1 0 0

.dc vin 0 1.8 0.001

.save v(1) v(2)

.end
```

## Inverter - Transient Analysis

```plaintext
Skywater Inverter
.include modelcard.skywater

.param mc_switch=0

xmn 2 1 0 0 sky130_fd_pr__nfet_01v8 w=1.26u l=0.15u
xmp 2 1 vdd vdd sky130_fd_pr__pfet_01v8 w=1.26u l=0.150u

* Supply node
vdd vdd 0 1.8

vin 1 0 0 pulse ( 0 1.8 1n 10p 10p 1n 2n )

.save v(1) v(2)

.tran 1p 5n

.end
```

## Ring Oscillator

```plaintext
Ring Oscillator
.include modelcard.skywater
.param mc_switch=0

xinv1 1 2 vdd inv
xinv2 2 3 vdd inv
xinv3 3 1 vdd inv

vdd vdd 0 1.8

* Inverter block sub-circuit
.subckt inv vin vout vdd
	.param l = 0.15u
	.param wp = 2u
	.param wn = {wp * 1.5}

	xm1 vout vin 0 0 sky130_fd_pr__nfet_01v8 w=wn l=l
	xm2 vout vin vdd vdd sky130_fd_pr__pfet_01v8 w=wp l=l
	*c1 vout 0 10f
.ends

.tran  1p 5n
.save v(1) v(2) v(3)
.end
```

## Acknowledgments

The script to convert models from Spectre to ngspice provided [here](https://github.com/google/skywater-pdk/issues/309)
