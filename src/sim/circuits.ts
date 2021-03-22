export const strBsimTest1 = `NMOS Id-Vd

.include modelcard.nmos
*.include modelcard.pmos

vg 1 0 1.2
vd 2 0 1.2
vb b 0 0.0

m1 2 1 0 b N1 W=10.0u L=0.09u NF=5

.dc vd 0.0 1.2 0.02 vg 0.2 1.2 0.2
.print dc i(vd)

.end`;

export const strBsimComprt = `* One-Bit Comparator (tran)

.option reltol=1e-3 post

.include modelcard.nmos
.include modelcard.pmos

Vdd Vdd 0 1.8
Va A 0 pulse 0 1.8 10ns .1ns .1ns 15ns 30ns
Vb B 0 0

M1 Anot A Vdd Vdd P1 W=3.6u L=0.2u
M2 Anot A 0 0 N1 W=1.8u L=0.2u
M3 Bnot B Vdd Vdd P1 W=3.6u L=0.2u
M4 Bnot B 0 0 N1 W=1.8u L=0.2u
M5 AorBnot 0 Vdd Vdd P1 W=1.8u L=3.6u
M6 AorBnot B 1 0 N1 W=1.8u L=0.2u
M7 1 Anot 0 0 N1 W=1.8u L=0.2u
M8 Lnot 0 Vdd Vdd P1 W=1.8u L=3.6u
M9 Lnot Bnot 2 0 N1 W=1.8u L=0.2u
M10 2 A 0 0 N1 W=1.8u L=0.2u
M11 Qnot 0 Vdd Vdd P1 W=3.6u L=3.6u
M12 Qnot AorBnot 3 0 N1 W=1.8u L=0.2u
M13 3 Lnot 0 0 N1 W=1.8u L=0.2u
MQLO 8 Qnot Vdd Vdd P1 W=3.6u L=0.2u
MQL1 8 Qnot 0 0 N1 W=1.8u L=0.2u
MLTO 9 Lnot Vdd Vdd P1 W=3.6u L=0.2u
MLT1 9 Lnot 0 0 N1 W=1.8u L=0.2u
CQ Qnot 0 30f
CL Lnot 0 10f

.tran 1ns 60ns
.print tran a b v(9) v(8)

.end`;

export const cir1 = `Basic RC circuit 
r 1 2 1.0
*l 1 2 1.0
c 2 0 1.0
*vin 1 0  pulse (0 1) ac 1
vin 1 0 1
*.tran  0.1 7.0
.dc vin 0 1 0.1
.end
`;

export const cir2 = `Mosamp2
.options acct abstol=10n  vntol=10n
.tran 0.1us 1us
m1  15 15  1 32 m w=88.9u  l=25.4u
m2   1  1  2 32 m w=12.7u  l=266.7u
m3   2  2 30 32 m w=88.9u  l=25.4u
m4  15  5  4 32 m w=12.7u  l=106.7u
m5   4  4 30 32 m w=88.9u  l=12.7u
m6  15 15  5 32 m w=44.5u  l=25.4u
m7   5 20  8 32 m w=482.6u l=12.7u
m8   8  2 30 32 m w=88.9u  l=25.4u
m9  15 15  6 32 m w=44.5u  l=25.4u
m10  6 21  8 32 m w=482.6u l=12.7u
m11 15  6  7 32 m w=12.7u  l=106.7u
m12  7  4 30 32 m w=88.9u  l=12.7u
m13 15 10  9 32 m w=139.7u l=12.7u
m14  9 11 30 32 m w=139.7u l=12.7u
m15 15 15 12 32 m w=12.7u  l=207.8u
m16 12 12 11 32 m w=54.1u  l=12.7u
m17 11 11 30 32 m w=54.1u  l=12.7u
m18 15 15 10 32 m w=12.7u  l=45.2u
m19 10 12 13 32 m w=270.5u l=12.7u
m20 13  7 30 32 m w=270.5u l=12.7u
m21 15 10 14 32 m w=254u   l=12.7u
m22 14 11 30 32 m w=241.3u l=12.7u
m23 15 20 16 32 m w=19u    l=38.1u
m24 16 14 30 32 m w=406.4u l=12.7u
m25 15 15 20 32 m w=38.1u  l=42.7u
m26 20 16 30 32 m w=381u   l=25.4u
m27 20 15 66 32 m w=22.9u  l=7.6u
cc 7 9 40pf
cl 66 0 70pf
vin 21 0 pulse(0 5 1ns 1ns 1ns 5us 10us)
vccp 15 0 dc +15
vddn 30 0 dc -15
vb 32 0 dc -20
.model m nmos(nsub=2.2e15 uo=575 ucrit=49k uexp=0.1 tox=0.11u xj=2.95u
+   level=2 cgso=1.5n cgdo=1.5n cbd=4.5f cbs=4.5f ld=2.4485u nss=3.2e10
+   kp=2e-5 phi=0.6 )
*.print tran v(20) v(66)
.plot  tran v(20) v(66)
*.control
*set filetype=ascii
*run
*write out.raw
*.endc
.end 
`;

export const cirTrans = `Basic RLC circuit 
r 1 2 1.0
l 1 2 0.2
c 2 0 1.0
vin 1 0 0 pulse (0 1 0 0.001 0.001 15 30)
.tran 0.02 100
*.dc vin 0 1 0.1
.end`;

export const bsimTrans = `Basic RLC circuit 
.include modelcard.CMOS90

r vdd 2 100.0
l vdd 2 1
c vdd 2 0.01
m1 2 1 0 0 N90 W=100.0u L=0.09u
vdd vdd 0 1.8

vin 1 0 0 pulse (0 1.8 0 0.1 0.1 15 30)
.tran 0.1 50

.end`;

export const strModelCMOS90 = `* NMOS modelcard

* The BSIM4 modelcard below was not extracted from any real technologies. It should
* not be used for any other purposes except for benchmarking against BSIM team's
* standard results using spice3f5.

* Authors: ChetanKumar Dabhi, Shivendra Singh Parihar, Navid Paydavosi, Tanvir Morshed,
*          Darsen Lu, Mohan Dunga, Wenwei Yang, Ali Niknejad, and Chenming Hu.

.MODEL N90 NMOS
+LEVEL         = 14
+VERSION       = 4.81
+BINUNIT       = 1
+PARAMCHK      = 1
+MOBMOD        = 0
+CAPMOD        = 1
+IGCMOD        = 1
+IGBMOD        = 1
+GEOMOD        = 1
+DIOMOD        = 1
+RDSMOD        = 0
+RBODYMOD      = 0
+RGATEMOD      = 1
+PERMOD        = 1
+ACNQSMOD      = 0
+TRNQSMOD      = 0
+TEMPMOD       = 0
+MTRLMOD       = 1
+CVCHARGEMOD   = 0
+MTRLCOMPATMOD = 1
+EOT           = 1.8E-9
+VDDEOT        = 1.5
+ADOS          = 1.1
+BDOS          = 1.0
+TNOM          = 27
+TOXE          = 1.8E-9
+TOXP          = 10E-10
+TOXM          = 1.8E-9
+DTOX          = 8E-10
+EPSROX        = 3.9
+WINT          = 5E-9
+LINT          = 1E-9
+LL            = 0
+WL            = 0
+LLN           = 1
+WLN           = 1
+LW            = 0
+WW            = 0
+LWN           = 1
+WWN           = 1
+LWL           = 0
+WWL           = 0
+XPART         = 1
+TOXREF        = 1.4E-9
+PHIG          = 4.05
+EPSRGATE      = 11.7
+SAREF         = 5E-6
+SBREF         = 5E-6
+WLOD          = 2E-6
+KU0           = -4E-6
+KVSAT         = 0.2
+KVTH0         = -2E-8
+TKU0          = 0
+LLODKU0       = 1.1
+WLODKU0       = 1.1
+LLODVTH       = 1.0
+WLODVTH       = 1.0
+LKU0          = 1E-6
+WKU0          = 1E-6
+PKU0          = 0
+LKVTH0        = 1.1E-6
+WKVTH0        = 1.1E-6
+PKVTH0        = 0
+STK2          = 0
+LODK2         = 1.0
+STETA0        = 0
+LODETA0       = 1.0
+LAMBDA        = 4E-10
+VSAT          = 1.1E5
+VTL           = 2.0E5
+XN            = 6.0
+LC            = 5E-9
+RNOIA         = 0.577
+RNOIB         = 0.37
+LINTNOI       = 1E-009
+TVOFF         = 0
+TVFBSDOFF     = 0
+VTH0          = 0.25
+K1            = 0.35
+K2            = 0.05
+K3            = 0
+K3B           = 0
+W0            = 2.5E-6
+DVT0          = 1.8
+DVT1          = 0.52
+DVT2          = -0.032
+DVT0W         = 0
+DVT1W         = 0
+DVT2W         = 0
+DSUB          = 2
+MINV          = 0.05
+VOFFL         = 0
+DVTP0         = 1E-7
+MINVCV        = 2
+VOFFCVL       = 0
+DVTP1         = 0.05
+LPE0          = 5.75E-8
+LPEB          = 2.3E-10
+XJ            = 2E-8
+NGATE         = 5E20
+NDEP          = 2.8E18
+NSD           = 1E20
+PHIN          = 0
+CDSC          = 0.0002
+CDSCB         = 0
+CDSCD         = 0
+CIT           = 0
+VOFF          = -0.15
+NFACTOR       = 1.2
+ETA0          = 0.05
+ETAB          = 0
+UC            = -3E-11
+VFB           = -0.55
+U0            = 0.032
+UA            = 5.0E-11
+UB            = 3.5E-18
+A0            = 2
+AGS           = 1E-20
+A1            = 0
+A2            = 1
+B0            = -1E-20
+B1            = 0
+KETA          = 0.04
+DWG           = 0
+DWB           = 0
+PCLM          = 0.08
+PDIBLC1       = 0.028
+PDIBLC2       = 0.022
+PDIBLCB       = -0.005
+DROUT         = 0.45
+PVAG          = 1E-20
+DELTA         = 0.01
+PSCBE1        = 8.14E8
+PSCBE2        = 5E-8
+FPROUT        = 0.2
+PDITS         = 0.2
+PDITSD        = 0.23
+PDITSL        = 2.3E6
+RSH           = 0
+RDSW          = 50
+RSW           = 50
+RDW           = 50
+RDSWMIN       = 0
+RDWMIN        = 0
+RSWMIN        = 0
+PRWG          = 0
+PRWB          = 6.8E-11
+WR            = 1
+ALPHA0        = 0.074
+ALPHA1        = 0.005
+BETA0         = 30
+AGIDL         = 0.0001
+BGIDL         = 2.1E9
+CGIDL         = 0.0001
+EGIDL         = 0.8
+AGISL         = 0.0002
+BGISL         = 2.1E9
+CGISL         = 0.0002
+EGISL         = 0.8
+AIGBACC       = 0.012
+BIGBACC       = 0.0028
+CIGBACC       = 0.002
+NIGBACC       = 1
+AIGBINV       = 0.014
+BIGBINV       = 0.004
+CIGBINV       = 0.004
+EIGBINV       = 1.1
+NIGBINV       = 3
+AIGC          = 0.012
+BIGC          = 0.0028
+CIGC          = 0.002
+AIGS          = 0.012
+BIGS          = 0.0028
+CIGS          = 0.002
+NIGC          = 1
+POXEDGE       = 1
+PIGCD         = 1
+NTOX          = 1
+AIGD          = 0.01
+BIGD          = 0.003
+CIGD          = 0.0015
+XRCRG1        = 12
+XRCRG2        = 5
+CGSO          = 6.238E-10
+CGDO          = 6.238E-10
+CGBO          = 2.56E-11
+CGDL          = 2.495E-10
+CGSL          = 2.495E-10
+CKAPPAS       = 0.03
+CKAPPAD       = 0.03
+ACDE          = 1
+MOIN          = 15
+NOFF          = 0.9
+VOFFCV        = -0.02
+KT1           = -0.37
+KT1L          = 0.0
+KT2           = -0.042
+UTE           = -1.5
+UA1           = 1E-9
+UB1           = -3.5E-19
+UC1           = 0
+PRT           = 0
+AT            = 53000
+FNOIMOD       = 1
+TNOIMOD       = 0
+JSS           = 0.0001
+JSWS          = 1E-11
+JSWGS         = 1E-10
+NJS           = 1
+IJTHSFWD      = 0.01
+IJTHSREV      = 0.001
+BVS           = 10
+XJBVS         = 1
+JSD           = 0.0001
+JSWD          = 1E-11
+JSWGD         = 1E-10
+NJD           = 1
+IJTHDFWD      = 0.01
+IJTHDREV      = 0.001
+BVD           = 10
+XJBVD         = 1
+PBS           = 1
+CJS           = 0.0005
+MJS           = 0.5
+PBSWS         = 1
+CJSWS         = 5E-10
+MJSWS         = 0.33
+PBSWGS        = 1
+CJSWGS        = 3E-10
+MJSWGS        = 0.33
+PBD           = 1
+CJD           = 0.0005
+MJD           = 0.5
+PBSWD         = 1
+CJSWD         = 5E-10
+MJSWD         = 0.33
+PBSWGD        = 1
+CJSWGD        = 5E-10
+MJSWGD        = 0.33
+TPB           = 0.005
+TCJ           = 0.001
+TPBSW         = 0.005
+TCJSW         = 0.001
+TPBSWG        = 0.005
+TCJSWG        = 0.001
+XTIS          = 3
+XTID          = 3
+DMCG          = 0
+DMCI          = 0
+DMDG          = 0
+DMCGT         = 0
+DWJ           = 0
+XGW           = 0
+XGL           = 0
+RSHG          = 0.4
+GBMIN         = 1E-10
+RBPB          = 5
+RBPD          = 15
+RBPS          = 15
+RBDB          = 15
+RBSB          = 15
+NGCON         = 1
+JTSS          = 1E-4
+JTSD          = 1E-4
+JTSSWS        = 1E-10
+JTSSWD        = 1E-10
+JTSSWGS       = 1E-7
+JTSSWGD       = 1E-7
+NJTS          = 20.0
+NJTSSW        = 15
+NJTSSWG       = 6
+VTSS          = 10
+VTSD          = 10
+VTSSWS        = 10
+VTSSWD        = 10
+NJTSD         = 15.0
+NJTSSWD       = 20
+NJTSSWGD      = 6
+TNJTS         = 0.1
+TNJTSD        = 0.05
+VTSSWGS       = 2
+VTSSWGD       = 2
+XTSS          = 0.02
+XTSD          = 0.02
+XTSSWS        = 0.02
+XTSSWD        = 0.02
+XTSSWGS       = 0.02
+XTSSWGD       = 0.02


* PMOS modelcard

* The BSIM4 modelcard below was not extracted from any real technologies. It should
* not be used for any other purposes except for benchmarking against BSIM team's
* standard results using spice3f5.

* Authors: ChetanKumar Dabhi, Shivendra Singh Parihar, Navid Paydavosi, Tanvir Morshed,
*          Darsen Lu, Mohan Dunga, Wenwei Yang, Ali Niknejad, and Chenming Hu.

.MODEL P90 PMOS
+LEVEL         = 14
+BINUNIT       = 1
+PARAMCHK      = 1
+MOBMOD        = 0
+CAPMOD        = 2
+IGCMOD        = 1
+IGBMOD        = 1
+GEOMOD        = 1
+DIOMOD        = 1
+RDSMOD        = 0
+RBODYMOD      = 0
+RGATEMOD      = 1
+PERMOD        = 1
+ACNQSMOD      = 0
+TRNQSMOD      = 0
+TEMPMOD       = 0
+MTRLMOD       = 1
+CVCHARGEMOD   = 0
+MTRLCOMPATMOD = 1
+EOT           = 1.8E-9
+VDDEOT        = -1.5
+ADOS          = 1.1
+BDOS          = 1.0
+TNOM          = 27
+TOXE          = 1.8E-9
+TOXP          = 10E-10
+TOXM          = 1.8E-9
+DTOX          = 8E-10
+EPSROX        = 3.9
+WINT          = 5E-9
+LINT          = 1E-9
+LL            = 0
+WL            = 0
+LLN           = 1
+WLN           = 1
+LW            = 0
+WW            = 0
+LWN           = 1
+WWN           = 1
+LWL           = 0
+WWL           = 0
+XPART         = 0
+TOXREF        = 1.8E-9
+PHIG          = 4.05
+EPSRGATE      = 11.7
+SAREF         = 5E-6
+SBREF         = 5E-6
+WLOD          = 2E-6
+KU0           = 4E-6
+KVSAT         = 0.2
+KVTH0         = -2E-8
+TKU0          = 0.0
+LLODKU0       = 1.1
+WLODKU0       = 1.1
+LLODVTH       = 1.0
+WLODVTH       = 1.0
+LKU0          = 1E-6
+WKU0          = 1E-6
+PKU0          = 0.0
+LKVTH0        = 1.1E-6
+WKVTH0        = 1.1E-6
+PKVTH0        = 0
+STK2          = 0
+LODK2         = 1.0
+STETA0        = 0
+LODETA0       = 1.0
+LAMBDA        = 4E-10
+VSAT          = 1.1E5
+VTL           = 2.0E5
+XN            = 6.0
+LC            = 5E-9
+RNOIA         = 0.577
+RNOIB         = 0.37
+LINTNOI       = 1E-9
+TVOFF         = 0
+TVFBSDOFF     = 0
+VTH0          = -0.25
+K1            = 0.35
+K2            = 0.05
+K3            = 0
+K3B           = 0
+W0            = 2.5E-6
+DVT0          = 1.8
+DVT1          = 0.52
+DVT2          = -0.032
+DVT0W         = 0
+DVT1W         = 0
+DVT2W         = 0
+DSUB          = 2
+MINV          = 0.05
+VOFFL         = 0
+DVTP0         = 1E-7
+MINVCV        = 2
+VOFFCVL       = 0
+DVTP1         = 0.05
+LPE0          = 5.75E-8
+LPEB          = 2.3E-10
+XJ            = 2E-8
+NGATE         = 5E20
+NDEP          = 2.8E18
+NSD           = 1E20
+PHIN          = 0
+CDSC          = 0.0002
+CDSCB         = 0
+CDSCD         = 0
+CIT           = 0
+VOFF          = -0.15
+NFACTOR       = 1.2
+ETA0          = 0.05
+ETAB          = 0
+VFB           = 0.55
+U0            = 0.0095
+UA            = 5.0E-11
+UB            = 3.5E-18
+UC            = -3E-11
+A0            = 2
+AGS           = 1E-20
+A1            = 0
+A2            = 1
+B0            = -1E-20
+B1            = 0
+KETA          = 0.04
+DWG           = 0
+DWB           = 0
+PCLM          = 0.08
+PDIBLC1       = 0.028
+PDIBLC2       = 0.022
+PDIBLCB       = -0.005
+DROUT         = 0.45
+PVAG          = 1E-20
+DELTA         = 0.01
+PSCBE1        = 8.14E8
+PSCBE2        = 5E-8
+FPROUT        = 0.2
+PDITS         = 0.2
+PDITSD        = 0.23
+PDITSL        = 2.3E6
+RSH           = 0
+RDSW          = 50
+RSW           = 50
+RDW           = 50
+RDSWMIN       = 0
+RDWMIN        = 0
+RSWMIN        = 0
+PRWG          = 0
+PRWB          = 6.8E-11
+WR            = 1
+ALPHA0        = 0.074
+ALPHA1        = 0.005
+BETA0         = 30
+AGIDL         = 0.0002
+BGIDL         = 2.1E9
+CGIDL         = 0.0002
+EGIDL         = 0.8
+AGISL         = 0.0003
+BGISL         = 2.5E9
+CGISL         = 0.0003
+EGISL         = 0.8
+AIGBACC       = 0.012
+BIGBACC       = 0.0028
+CIGBACC       = 0.002
+NIGBACC       = 1
+AIGBINV       = 0.014
+BIGBINV       = 0.004
+CIGBINV       = 0.004
+EIGBINV       = 1.1
+NIGBINV       = 3
+AIGC          = 0.012
+BIGC          = 0.0028
+CIGC          = 0.002
+AIGS          = 0.012
+BIGS          = 0.0028
+CIGS          = 0.002
+NIGC          = 1
+POXEDGE       = 1
+PIGCD         = 1
+NTOX          = 1
+AIGD          = 0.01
+BIGD          = 0.003
+CIGD          = 0.0015
+XRCRG1        = 12
+XRCRG2        = 5
+CGSO          = 6.238E-10
+CGDO          = 6.238E-10
+CGBO          = 2.56E-11
+CGDL          = 2.495E-10
+CGSL          = 2.495E-10
+CKAPPAS       = 0.03
+CKAPPAD       = 0.03
+ACDE          = 1
+MOIN          = 15
+NOFF          = 0.9
+VOFFCV        = 0.02
+KT1           = -0.37
+KT1L          = 0.0
+KT2           = -0.042
+UTE           = -1.5
+UA1           = 1E-9
+UB1           = -3.5E-19
+UC1           = 0
+PRT           = 0
+AT            = 53000
+FNOIMOD       = 1
+TNOIMOD       = 0
+JSS           = 0.0001
+JSWS          = 1E-11
+JSWGS         = 1E-10
+NJS           = 1
+IJTHSFWD      = 0.01
+IJTHSREV      = 0.001
+BVS           = 10
+XJBVS         = 1
+JSD           = 0.0001
+JSWD          = 1E-11
+JSWGD         = 1E-10
+NJD           = 1
+IJTHDFWD      = 0.01
+IJTHDREV      = 0.001
+BVD           = 10
+XJBVD         = 1
+PBS           = 1
+CJS           = 0.0005
+MJS           = 0.5
+PBSWS         = 1
+CJSWS         = 5E-10
+MJSWS         = 0.33
+PBSWGS        = 1
+CJSWGS        = 3E-10
+MJSWGS        = 0.33
+PBD           = 1
+CJD           = 0.0005
+MJD           = 0.5
+PBSWD         = 1
+CJSWD         = 5E-10
+MJSWD         = 0.33
+PBSWGD        = 1
+CJSWGD        = 5E-10
+MJSWGD        = 0.33
+TPB           = 0.005
+TCJ           = 0.001
+TPBSW         = 0.005
+TCJSW         = 0.001
+TPBSWG        = 0.005
+TCJSWG        = 0.001
+XTIS          = 3
+XTID          = 3
+DMCG          = 0
+DMCI          = 0
+DMDG          = 0
+DMCGT         = 0
+DWJ           = 0
+XGW           = 0
+XGL           = 0
+RSHG          = 0.4
+GBMIN         = 1E-10
+RBPB          = 5
+RBPD          = 15
+RBPS          = 15
+RBDB          = 15
+RBSB          = 15
+NGCON         = 1
+JTSS          = 1E-4
+JTSD          = 1E-4
+JTSSWS        = 1E-10
+JTSSWD        = 1E-10
+JTSSWGS       = 1E-7
+JTSSWGD       = 1E-7
+NJTS          = 20.0
+NJTSSW        = 15
+NJTSSWG       = 4
+VTSS          = 10
+VTSD          = 10
+VTSSWS        = 10
+VTSSWD        = 10
+NJTSD         = 15.0
+NJTSSWD       = 20
+NJTSSWGD      = 6
+TNJTS         = 0.1
+TNJTSD        = 0.05
+VTSSWGS       = 2
+VTSSWGD       = 2
+XTSS          = 0.02
+XTSD          = 0.02
+XTSSWS        = 0.02
+XTSSWD        = 0.02
+XTSSWGS       = 0.02
+XTSSWGD       = 0.02
`;
