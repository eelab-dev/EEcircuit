# Examples

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

vin 1 0 0 pulse (0 1.8 0 0.1 0.1 15 30) ac 1
.tran  0.1 50

.end
```

See [here]() for more examples.

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

### Sub-Circuits (subckt)

```plaintext
Ring Oscillator (Subckt)
.include modelcard.CMOS90

xinv1 1 2 vdd inv
xinv2 2 3 vdd inv
xinv3 3 1 vdd inv

vdd vdd 0 1.8

* Inverter block sub-circuit
.subckt inv vin vout vdd
	.param l = 90n
	.param wp = 10.0u
	.param wn = {wp * 1.5}

	m1 vout vin 0 0 N90 W=wn L=l M=1
	m2 vout vin vdd vdd P90 W=wp L=l M=1
	c1 vout 0 0.1p
.ends

.tran  1p 5n

.end
```

### AC analysis

```plaintext
Demo of a simple AC circuit

v1 1 0 dc 0 ac 1
r1 1 2 30
c1 2 0 100u
.ac dec 100 1 100

.end
```

## Useful commands

here are some useful command which helps in using EEsim. For mor details see ngspice user manual.

### save

Only plots the signals which are in the `save` command.

```plaintext
save v(node1) v(node2) ...
```
