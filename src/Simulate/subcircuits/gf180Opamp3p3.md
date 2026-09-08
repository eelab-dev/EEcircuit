# GF180 3.3 V opamp extraction

The `gf180_opamp_3p3` built-in model was extracted from the supplied
`a_3_pass 1.cir` GF180 testbench. It retains the testbench's twenty
`nmos_3p3`/`pmos_3p3` instances, their geometry and parasitic parameters, the
two 7 pF compensation capacitors, and the six ideal bias voltage sources.

The reusable interface is:

```spice
.subckt gf180_opamp_3p3 inp inn out vdd vss
```

The source testbench's `in2` node becomes `inp`. The gates of X1 and X4 were
connected to the source testbench's `out` node to form a voltage follower;
those two gate connections become the independent `inn` pin. All other `out`
connections remain on the `out` pin. Source-testbench ground references inside
the amplifier become `vss`, including the returns of the six bias sources.

The filesystem `.include`/`.lib` lines, `.param`, supply and input sources,
dependent stimulus sources, 1 kΩ/10 pF external load, feedback wiring, `.op`,
all `.control` analysis blocks, and `wrdata` commands are intentionally omitted.
EEcircuit supplies the selected GF180 model-card corner and simulation commands.

The built-in model assumes a 3.3 V `vdd`-to-`vss` supply and fixed ideal
internal biases. EEcircuit does not rescale those biases or retune the circuit
for a different supply.
