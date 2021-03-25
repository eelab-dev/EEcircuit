export const nfet18 = `
* Copyright 2020 The SkyWater PDK Authors
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
*     https://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.




.param sky130_fd_pr__nfet_01v8__toxe_slope = 0.0
.param sky130_fd_pr__nfet_01v8__vth0_slope = 0.0
.param sky130_fd_pr__nfet_01v8__voff_slope = 0.0

.subckt  sky130_fd_pr__nfet_01v8 d g s b
+ 
.param  l = 1 w = 1 ad = 0 as = 0 pd = 0 ps = 0 nrd = 0 nrs = 0 sa = 0 sb = 0 sd = 0 mult = 1 nf = 1.0
msky130_fd_pr__nfet_01v8 d g s b sky130_fd_pr__nfet_01v8__model l = {l} w = {w} ad = {ad} as = {as} pd = {pd} ps = {ps} nrd = {nrd} nrs = {nrs} sa = {sa} sb = {sb} sd = {sd} nf = {nf}


.model sky130_fd_pr__nfet_01v8__model.58 nmos
* Model Flag Parameters
+ lmin = 1.0e-06 lmax = 2.0e-06 wmin = 1.0e-06 wmax = 1.26e-6
+ level = 54.0
+ version = 4.7
+ binunit = 2.0
+ mobmod = 0.0
+ capmod = 2.0
+ igcmod = 0.0
+ igbmod = 0.0
+ geomod = 0.0
+ diomod = 1.0
+ rdsmod = 0.0
+ rbodymod = 1.0
+ rgatemod = 0.0
+ permod = 1.0
+ acnqsmod = 0.0
+ trnqsmod = 0.0
+ fnoimod = 1.0
+ tnoimod = 1.0
+ tempmod = 0.0
* Process Parameters
+ toxe = {4.148e-09}
+ toxm = 4.148e-9
+ dtox = 0.0
+ epsrox = 3.9
+ xj = 1.5e-7
+ ngate = 1.0e+23
+ ndep = 1.7e+17
+ nsd = 1.0e+20
+ rsh = 1.0
+ rshg = 0.1
* Basic Model Parameters
+ wint = 2.1859e-8
+ lint = 1.1932e-8
+ vth0 = {5.269636961e-01} lvth0 = 5.491702467e-8
+ k1 = 5.981414663e-01 lk1 = -1.160372166e-7
+ k2 = -5.041999168e-02 lk2 = 3.558620112e-8
+ k3 = 2.0
+ k3b = 0.54
+ w0 = 0.0
+ dvt0 = 0.0
+ dvt1 = 0.53
+ dvt2 = -0.032
+ dvt0w = -3.58
+ dvt1w = 1670600.0
+ dvt2w = 0.068
+ dsub = 8.528408000e-01 ldsub = -5.786932471e-7
+ minv = 0.0
+ voffl = 5.8197729e-9
+ lpe0 = 1.0325e-7
+ lpeb = -7.082e-8
+ vbm = -3.0
+ dvtp0 = 0.0
+ dvtp1 = 0.0
+ phin = 0.0
+ cdsc = 0.0
+ cdscb = 0.0
+ cdscd = 0.0054
+ cit = 0.0
+ voff = {-1.009647561e-01} lvoff = -4.917308910e-8
+ nfactor = 2.817502433e+00 lnfactor = -8.397136079e-7
+ eta0 = 1.556199869e-01 leta0 = -1.494353785e-7
+ etab = -5.596804500e-02 letab = -2.772905143e-8
+ u0 = 2.859798223e-02 lu0 = -3.995593312e-9
+ ua = -9.275965507e-10 lua = -4.523890865e-16
+ ub = 1.780184404e-18 lub = 3.034763837e-25
+ uc = 3.842701720e-11 luc = 3.096008872e-17
+ ud = 0.0
+ up = 0.0
+ lp = 1.0
+ eu = 1.67
+ vtl = 0.0
+ xn = 3.0
+ vsat = 7.023864000e+04 lvsat = 1.928977490e-2
+ a0 = 1.415845595e+00 la0 = -7.453048199e-7
+ ags = 3.271776224e-01 lags = 3.368453795e-7
+ a1 = 0.0
+ a2 = 0.42385546
+ b0 = 0.0
+ b1 = 0.0
+ keta = -2.678710971e-02 lketa = 3.545980911e-08 pketa = -1.387778781e-29
+ dwg = 0.0
+ dwb = 0.0
+ pclm = 4.290014341e-01 lpclm = 2.531204263e-7
+ pdiblc1 = 4.400712671e-01 lpdiblc1 = -9.894763339e-8
+ pdiblc2 = 4.799318577e-03 lpdiblc2 = 9.833207738e-10
+ pdiblcb = -1.209086295e-03 lpdiblcb = -4.701408105e-8
+ drout = 7.188175127e-01 ldrout = -3.138450042e-7
+ pscbe1 = 800000000.0
+ pscbe2 = 1.0e-12
+ pvag = 0.0
+ delta = 0.01
+ fprout = 0.0
+ pdits = 0.0
+ pditsl = 0.0
+ pditsd = 0.0
+ lambda = 0.0
+ lc = 5.0e-9
* Parameters FOR Asymmetric AND Bias-Dependent RDS Model
+ rdsw = 65.968
+ rsw = 0.0
+ rdw = 0.0
+ rdswmin = 0.0
+ rdwmin = 0.0
+ rswmin = 0.0
+ prwb = 0.0
+ prwg = 0.021507
+ wr = 1.0
* Impact Ionization Current Model Parameters
+ alpha0 = 3.117136320e-08 lalpha0 = -2.314772989e-15
+ alpha1 = 9.993488080e-01 lalpha1 = -2.951335560e-7
+ beta0 = 13.86
* Gidl Induced Drain Leakage Model Parameters
+ agidl = 0.0
+ bgidl = 2300000000.0
+ cgidl = 0.5
+ egidl = 0.8
* Gate Dielectric Tunneling Current Model Parameters
+ toxref = 4.148e-9
+ dlcig = 0.0
+ aigbacc = 1.0
+ bigbacc = 0.0
+ cigbacc = 0.0
+ nigbacc = 0.0
+ aigbinv = 0.35
+ bigbinv = 0.03
+ cigbinv = 0.006
+ eigbinv = 1.1
+ nigbinv = 0.0
+ aigc = 0.43
+ bigc = 0.054
+ cigc = 0.075
+ aigsd = 0.43
+ bigsd = 0.054
+ cigsd = 0.075
+ nigc = 0.0
+ poxedge = 1.0
+ pigcd = 1.0
+ ntox = 1.0
+ vfbsdoff = 0.0
* Charge AND Capacitance Model Parameters
+ dlc = 9.87908e-9
+ dwc = 0.0
+ xpart = 0.0
+ cgso = 2.449068e-10
+ cgdo = 2.449068e-10
+ cgbo = 1.0e-13
+ cgdl = 0.0
+ cgsl = 0.0
+ clc = 1.0e-7
+ cle = 0.6
+ cf = 1.4067e-12
+ ckappas = 0.6
+ vfbcv = -1.0
+ acde = 0.4
+ moin = 6.9
+ noff = 3.4037
+ voffcv = -0.17287
* High-Speed/RF Model Parameters
+ xrcrg1 = 12.0
+ xrcrg2 = 1.0
+ rbpb = 50.0
+ rbpd = 50.0
+ rbps = 50.0
+ rbdb = 50.0
+ rbsb = 50.0
+ gbmin = 1.0e-12
* Flicker AND Thermal Noise Model Parameters
+ ef = 0.84
+ noia = 2.5e+42
+ noib = 0.0
+ noic = 0.0
+ em = 41000000.0
+ ntnoi = 1.0
+ lintnoi = -1.0e-7
+ af = 1.0
+ kf = 0.0
+ tnoia = 15000000.0
+ tnoib = 9900000.0
+ rnoia = 0.94
+ rnoib = 0.26
* Layout-Dependent Parasitics Model Parameters
+ xl = 0.0
+ xw = 0.0
+ dmcg = 0.0
+ dmdg = 0.0
+ dmcgt = 0.0
+ xgw = 0.0
+ xgl = 0.0
+ ngcon = 1.0
* Asymmetric Source/Drain Junction Diode Model Parameters
+ jss = 0.00275
+ jsws = 6.0e-10
+ ijthsfwd = 0.1
+ ijthsrev = 0.1
+ bvs = 11.7
+ xjbvs = 1.0
+ pbs = 0.729
+ cjs = 0.001339749237
+ mjs = 0.44
+ pbsws = 0.2
+ cjsws = 3.67354204e-11
+ mjsws = 0.0009
+ pbswgs = 0.95578
+ cjswgs = 2.38232788e-10
+ mjswgs = 0.8
* Temperature Dependence Parameters
+ tnom = 30.0
+ kt1 = -3.258838054e-01 lkt1 = 6.759137127e-8
+ kt2 = 3.871048534e-04 lkt2 = -3.574017210e-8
+ at = 1.360768260e+05 lat = -4.915999135e-02 wat = -1.164153218e-16
+ ute = 1.869609889e-01 lute = -1.204318517e-6
+ ua1 = 5.918675958e-09 lua1 = -4.560874379e-15
+ ub1 = -4.657704193e-18 lub1 = 3.797153610e-24
+ uc1 = -7.733386419e-11 luc1 = 9.310451173e-17 wuc1 = -5.169878828e-32 puc1 = -5.169878828e-38
+ kt1l = 0.0
+ prt = 0.0
+ tvoff = 0.0
+ njs = 1.2928
+ tpb = 0.0012287
+ tcj = 0.000792
+ tpbsw = 0.0
+ tcjsw = 1.0e-5
+ tpbswg = 0.0
+ tcjswg = 0.0
+ xtis = 2.0
+ tvfbsdoff = 0.0
* DW AND DL Parameters
+ ll = 0.0
+ wl = 0.0
+ lln = 1.0
+ wln = 1.0
+ lw = 0.0
+ ww = 0.0
+ lwn = 1.0
+ wwn = 1.0
+ lwl = 0.0
+ wwl = 0.0
+ llc = 0.0
+ wlc = 0.0
+ lwc = 0.0
+ wwc = 0.0
+ lwlc = 0.0
+ wwlc = 0.0
* Stress Parameters
+ saref = 2.75e-6
+ sbref = 2.74e-6
+ kvth0 = 9.8e-9
+ lkvth0 = 0.0
+ wkvth0 = 2.0e-7
+ pkvth0 = 0.0
+ llodvth = 0.0
+ wlodvth = 1.0
+ wlod = 0.0
+ stk2 = 0.0
+ lodk2 = 1.0
+ lodeta0 = 1.0
+ ku0 = -2.7e-8
+ lku0 = 0.0
+ wku0 = 0.0
+ pku0 = 0.0
+ tku0 = 0.0
+ llodku0 = 0.0
+ wlodku0 = 1.0
+ kvsat = 0.2
+ steta0 = 0.0
* Well Proximity Effect Parameters


.ends sky130_fd_pr__nfet_01v8


****************************pFET***************************

.subckt  sky130_fd_pr__pfet_01v8_hvt d g s b
+ 
.param  l = 1 w = 1 ad = 0 as = 0 pd = 0 ps = 0 nrd = 0 nrs = 0 sa = 0 sb = 0 sd = 0 mult = 1 nf = 1.0
msky130_fd_pr__pfet_01v8_hvt d g s b sky130_fd_pr__pfet_01v8_hvt__model l = {l} w = {w} ad = {ad} as = {as} pd = {pd} ps = {ps} nrd = {nrd} nrs = {nrs} sa = {sa} sb = {sb} sd = {sd} nf = {nf}
.model sky130_fd_pr__pfet_01v8_hvt__model.0 pmos
* Model Flag Parameters
+ lmin = 1.0e-06 lmax = 2.0e-06 wmin = 1.0e-06 wmax = 1.12e-6
+ level = 54.0
+ version = 4.7
+ binunit = 2.0
+ mobmod = 0.0
+ capmod = 2.0
+ igcmod = 0.0
+ igbmod = 0.0
+ geomod = 0.0
+ diomod = 1.0
+ rdsmod = 0.0
+ rbodymod = 1.0
+ rgatemod = 0.0
+ permod = 1.0
+ acnqsmod = 0.0
+ trnqsmod = 0.0
+ fnoimod = 1.0
+ tnoimod = 1.0
+ tempmod = 0.0
* Process Parameters
+ toxe = {4.23e-09}
+ toxm = 4.23e-9
+ dtox = 0.0
+ epsrox = 3.9
+ xj = 1.5e-7
+ ngate = 1.0e+23
+ ndep = 1.7e+17
+ nsd = 1.0e+20
+ rsh = 1.0
+ rshg = 0.1
* Basic Model Parameters
+ wint = 9.364e-9
+ lint = -1.176e-8
+ vth0 = {-1.101595176e+00} lvth0 = 3.067712146e-8
+ k1 = 3.540326720e-01 lk1 = 1.659689040e-7
+ k2 = 5.577749960e-02 lk2 = -6.377529522e-08 pk2 = -5.551115123e-29
+ k3 = -13.778
+ k3b = 2.0
+ w0 = 0.0
+ dvt0 = 4.05
+ dvt1 = 0.3
+ dvt2 = 0.03
+ dvt0w = -4.254
+ dvt1w = 1147200.0
+ dvt2w = -0.00896
+ dsub = -2.663045674e-01 ldsub = 1.067616350e-6
+ minv = 0.0
+ voffl = 0.0
+ lpe0 = 0.0
+ lpeb = 0.0
+ vbm = -3.0
+ dvtp0 = 0.0
+ dvtp1 = 0.0
+ phin = 0.0
+ cdsc = 0.0
+ cdscb = 0.0
+ cdscd = 0.0
+ cit = 1.0e-5
+ voff = {-2.021762939e-01} lvoff = -1.639286090e-9
+ nfactor = {2.430472285e+00} lnfactor = -5.350714714e-7
+ eta0 = -2.241626400e-01 leta0 = 4.546093453e-07 weta0 = -2.046973702e-22 peta0 = 2.237793284e-28
+ etab = 8.442995791e-01 letab = -1.709466317e-06 wetab = 1.908195824e-23 petab = -7.459310947e-28
+ u0 = 1.250342728e-02 lu0 = -4.352444370e-9
+ ua = 2.633023699e-11 lua = -9.458151364e-16
+ ub = 5.976931819e-19 lub = 4.788153150e-25
+ uc = -7.509174596e-11 luc = 1.060590969e-17
+ ud = 0.0
+ up = 0.0
+ lp = 1.0
+ eu = 1.67
+ vtl = 0.0
+ xn = 3.0
+ vsat = 5.963848416e+04 lvsat = -1.254680371e-02 wvsat = 1.164153218e-16
+ a0 = 1.367169856e+00 la0 = -4.184015232e-7
+ ags = 1.755171746e-01 lags = 4.500466829e-7
+ a1 = 0.0
+ a2 = 5.953062352e-01 la2 = 4.142019269e-7
+ b0 = 0.0
+ b1 = 0.0
+ keta = -1.079934288e-02 lketa = -2.963762975e-9
+ dwg = -5.722e-9
+ dwb = -1.7864e-8
+ pclm = 4.550220723e-01 lpclm = 3.593326501e-7
+ pdiblc1 = 7.492555200e-01 lpdiblc1 = -7.269607298e-7
+ pdiblc2 = 0.00043
+ pdiblcb = -0.025
+ drout = 1.096512000e-01 ldrout = 9.112898038e-7
+ pscbe1 = 7.983183467e+08 lpscbe1 = -1.229870506e+1
+ pscbe2 = 9.530520115e-09 lpscbe2 = -3.620850560e-16
+ pvag = 0.0
+ delta = 0.01
+ fprout = 0.0
+ pdits = 0.0
+ pditsl = 0.0
+ pditsd = 0.0
+ lambda = 0.0
+ lc = 5.0e-9
* Parameters FOR Asymmetric AND Bias-Dependent RDS Model
+ rdsw = 531.92
+ rsw = 0.0
+ rdw = 0.0
+ rdswmin = 0.0
+ rdwmin = 0.0
+ rswmin = 0.0
+ prwb = -0.32348
+ prwg = 0.02
+ wr = 1.0
* Impact Ionization Current Model Parameters
+ alpha0 = 1.0e-10
+ alpha1 = 1.0e-10
+ beta0 = 5.862313582e+00 lbeta0 = 1.848390856e-6
* Gidl Induced Drain Leakage Model Parameters
+ agidl = -2.563433413e-10 lagidl = 7.823789760e-16
+ bgidl = 1000000000.0
+ cgidl = 300.0
+ egidl = 0.1
* Gate Dielectric Tunneling Current Model Parameters
+ toxref = 4.23e-9
+ dlcig = 0.0
+ aigbacc = 0.43
+ bigbacc = 0.054
+ cigbacc = 0.075
+ nigbacc = 1.0
+ aigbinv = 0.35
+ bigbinv = 0.03
+ cigbinv = 0.006
+ eigbinv = 1.1
+ nigbinv = 3.0
+ aigc = 0.43
+ bigc = 0.054
+ cigc = 0.075
+ aigsd = 0.43
+ bigsd = 0.054
+ cigsd = 0.075
+ nigc = 1.0
+ poxedge = 1.0
+ pigcd = 1.0
+ ntox = 1.0
+ vfbsdoff = 0.0
* Charge AND Capacitance Model Parameters
+ dlc = -2.56e-9
+ dwc = 0.0
+ xpart = 0.0
+ cgso = 5.93202e-11
+ cgdo = 5.93202e-11
+ cgbo = 0.0
+ cgdl = 7.513892e-12
+ cgsl = 7.513892e-12
+ clc = 1.0e-7
+ cle = 0.6
+ cf = 1.2e-11
+ ckappas = 0.6
+ vfbcv = -0.1446893
+ acde = 0.552
+ moin = 14.504
+ noff = 4.0
+ voffcv = -0.1375
* High-Speed/RF Model Parameters
+ xrcrg1 = 12.0
+ xrcrg2 = 1.0
+ rbpb = 50.0
+ rbpd = 50.0
+ rbps = 50.0
+ rbdb = 50.0
+ rbsb = 50.0
+ gbmin = 1.0e-12
* Flicker AND Thermal Noise Model Parameters
+ ef = 0.88
+ noia = 1.2e+41
+ noib = 2.0e+25
+ noic = 0.0
+ em = 41000000.0
+ ntnoi = 1.0
+ lintnoi = -6.0e-8
+ af = 1.0
+ kf = 0.0
+ tnoia = 1.5
+ tnoib = 3.5
+ rnoia = 0.577
+ rnoib = 0.37
* Layout-Dependent Parasitics Model Parameters
+ xl = 0.0
+ xw = 0.0
+ dmcg = 0.0
+ dmdg = 0.0
+ dmcgt = 0.0
+ xgw = 0.0
+ xgl = 0.0
+ ngcon = 1.0
* Asymmetric Source/Drain Junction Diode Model Parameters
+ jss = 2.17e-5
+ jsws = 8.2e-10
+ ijthsfwd = 0.1
+ ijthsrev = 0.1
+ bvs = 12.8
+ xjbvs = 1.0
+ pbs = 0.6587
+ cjs = 0.0007432633326
+ mjs = 0.34629
+ pbsws = 0.7418
+ cjsws = 9.5078641e-11
+ mjsws = 0.26859
+ pbswgs = 1.3925
+ cjswgs = 2.54074486e-10
+ mjswgs = 0.70393
* Temperature Dependence Parameters
+ tnom = 30.0
+ kt1 = -4.585366557e-01 lkt1 = -2.101090483e-8
+ kt2 = -5.625426130e-02 lkt2 = 7.876068592e-9
+ at = 9.703221664e+04 lat = -3.610003518e-2
+ ute = 9.359355551e-01 lute = -2.030761278e-06 wute = -4.440892099e-22 pute = 1.110223025e-27
+ ua1 = 6.136533540e-09 lua1 = -6.721391901e-15
+ ub1 = -4.270929418e-18 lub1 = 5.287314936e-24
+ uc1 = -1.285649500e-10 luc1 = 2.000815094e-16
+ kt1l = 0.0
+ prt = 0.0
+ tvoff = 0.0
+ njs = 1.2556
+ tpb = 0.0019551
+ tcj = 0.0012407
+ tpbsw = 0.00014242
+ tcjsw = 0.0
+ tpbswg = 0.0
+ tcjswg = 2.0e-12
+ xtis = 2.0
+ tvfbsdoff = 0.0
* DW AND DL Parameters
+ ll = 0.0
+ wl = 0.0
+ lln = 1.0
+ wln = 1.0
+ lw = 0.0
+ ww = 0.0
+ lwn = 1.0
+ wwn = 1.0
+ lwl = 0.0
+ wwl = 0.0
+ llc = 0.0
+ wlc = 0.0
+ lwc = 0.0
+ wwc = 0.0
+ lwlc = 0.0
+ wwlc = 0.0
* Stress Parameters
+ saref = 2.75e-6
+ sbref = 2.74e-6
+ kvth0 = 2.65e-8
+ lkvth0 = 0.0
+ wkvth0 = 2.5e-7
+ pkvth0 = 0.0
+ llodvth = 0.0
+ wlodvth = 1.0
+ wlod = 0.0
+ stk2 = 0.0
+ lodk2 = 1.0
+ lodeta0 = 1.0
+ ku0 = 4.5e-8
+ lku0 = 0.0
+ wku0 = 2.5e-7
+ pku0 = 0.0
+ tku0 = 0.0
+ llodku0 = 0.0
+ wlodku0 = 1.0
+ kvsat = 0.4
+ steta0 = 0.0
* Well Proximity Effect Parameters
.ends sky130_fd_pr__pfet_01v8_hvt

`;
