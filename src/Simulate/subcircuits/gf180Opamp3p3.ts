// Extracted from the supplied GF180 3.3 V amplifier testbench. The external
// supply, load, feedback wiring, stimuli, and analysis/control statements are
// intentionally not part of this reusable five-pin component.
export const gf180Opamp3p3 = `
.subckt gf180_opamp_3p3 inp inn out vdd vss
X3 d3 inp midp vdd pmos_3p3 w=75.0u l=1.0u ad=18.0p as=18.0p pd=150.48u ps=150.48u m=1.0
X4 d4 inn midp vdd pmos_3p3 w=75.0u l=1.0u ad=18.0p as=18.0p pd=150.48u ps=150.48u m=1.0
X6 midp bias1 vdd vdd pmos_3p3 w=100.0u l=0.7u ad=24.0p as=24.0p pd=200.48u ps=200.48u m=1.0
X1 d1 inn midn vss nmos_3p3 w=30.0u l=1.0u ad=7.199999999999999p as=7.199999999999999p pd=60.48u ps=60.48u m=1.0
X2 d2 inp midn vss nmos_3p3 w=30.0u l=1.0u ad=7.199999999999999p as=7.199999999999999p pd=60.48u ps=60.48u m=1.0
X5 midn bias2 vss vss nmos_3p3 w=50.0u l=0.7u ad=12.0p as=12.0p pd=100.48u ps=100.48u m=1.0
X7 d1 g7 vdd vdd pmos_3p3 w=80.0u l=1.5u ad=19.2p as=19.2p pd=160.48u ps=160.48u m=1.0
X8 d2 g7 vdd vdd pmos_3p3 w=80.0u l=1.5u ad=19.2p as=19.2p pd=160.48u ps=160.48u m=1.0
X9 g7 bias3 d1 vdd pmos_3p3 w=80.0u l=1.5u ad=19.2p as=19.2p pd=160.48u ps=160.48u m=1.0
X10 d10 bias3 d2 vdd pmos_3p3 w=80.0u l=1.5u ad=19.2p as=19.2p pd=160.48u ps=160.48u m=1.0
X15 g7 bias5 s15 vss nmos_3p3 w=15.0u l=1.0u ad=3.5999999999999996p as=3.5999999999999996p pd=30.48u ps=30.48u m=1.0
X16 s15 bias6 g7 vdd pmos_3p3 w=38.0u l=1.0u ad=9.12p as=9.12p pd=76.48u ps=76.48u m=1.0
X17 d10 bias5 s17 vss nmos_3p3 w=15.0u l=1.0u ad=3.5999999999999996p as=3.5999999999999996p pd=30.48u ps=30.48u m=1.0
X18 s17 bias6 d10 vdd pmos_3p3 w=38.0u l=1.0u ad=9.12p as=9.12p pd=76.48u ps=76.48u m=1.0
X11 s15 bias4 d4 vss nmos_3p3 w=32.0u l=1.5u ad=7.68p as=7.68p pd=64.48u ps=64.48u m=1.0
X12 s17 bias4 d3 vss nmos_3p3 w=32.0u l=1.5u ad=7.68p as=7.68p pd=64.48u ps=64.48u m=1.0
X13 d4 s15 vss vss nmos_3p3 w=32.0u l=1.5u ad=7.68p as=7.68p pd=64.48u ps=64.48u m=1.0
X14 d3 s15 vss vss nmos_3p3 w=32.0u l=1.5u ad=7.68p as=7.68p pd=64.48u ps=64.48u m=1.0
X19 out d10 vdd vdd pmos_3p3 w=100.0u l=0.28u ad=24.0p as=24.0p pd=200.48u ps=200.48u m=1.0
X20 out s17 vss vss nmos_3p3 w=50.0u l=0.28u ad=12.0p as=12.0p pd=100.48u ps=100.48u m=1.0
Cc1 out d10 7.0p
Cc2 out s17 7.0p
Vbias1 bias1 vss DC 2.4
Vbias2 bias2 vss DC 0.9
Vbias3 bias3 vss DC 1.6
Vbias4 bias4 vss DC 1.5
Vbias5 bias5 vss DC 1.9
Vbias6 bias6 vss DC 0.6
.ends gf180_opamp_3p3
`;
