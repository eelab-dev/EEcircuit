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

.param
+ sky130_fd_pr__nfet_01v8__toxe_mult = 0.9635
+ sky130_fd_pr__nfet_01v8__rshn_mult = 1.0
+ sky130_fd_pr__nfet_01v8__overlap_mult = 0.95013
+ sky130_fd_pr__nfet_01v8__lint_diff = 1.21275e-8
+ sky130_fd_pr__nfet_01v8__wint_diff = -2.252e-8
+ sky130_fd_pr__nfet_01v8__dlc_diff = 8.0874e-9
+ sky130_fd_pr__nfet_01v8__dwc_diff = -2.252e-8

.param
* sky130_fd_pr__nfet_01v8, Bin 000, W = 1.26, L = 0.15
* -----------------------------------
+ sky130_fd_pr__nfet_01v8__voff_diff_0 = 0.0
+ sky130_fd_pr__nfet_01v8__kt1_diff_0 = 0.0
+ sky130_fd_pr__nfet_01v8__ub_diff_0 = -1.8425e-19
+ sky130_fd_pr__nfet_01v8__pditsd_diff_0 = 0.0
+ sky130_fd_pr__nfet_01v8__ua_diff_0 = 5.685e-11
+ sky130_fd_pr__nfet_01v8__vsat_diff_0 = -29297.0
+ sky130_fd_pr__nfet_01v8__tvoff_diff_0 = 0.0
+ sky130_fd_pr__nfet_01v8__ags_diff_0 = 0.0
+ sky130_fd_pr__nfet_01v8__a0_diff_0 = 0.0
+ sky130_fd_pr__nfet_01v8__b0_diff_0 = 0.0
+ sky130_fd_pr__nfet_01v8__pclm_diff_0 = 0.0
+ sky130_fd_pr__nfet_01v8__pdits_diff_0 = 0.0
+ sky130_fd_pr__nfet_01v8__keta_diff_0 = 0.0
+ sky130_fd_pr__nfet_01v8__rdsw_diff_0 = 0.0
+ sky130_fd_pr__nfet_01v8__k2_diff_0 = 0.041243
+ sky130_fd_pr__nfet_01v8__vth0_diff_0 = -0.10074
+ sky130_fd_pr__nfet_01v8__nfactor_diff_0 = 0.8236
+ sky130_fd_pr__nfet_01v8__u0_diff_0 = -0.005854
+ sky130_fd_pr__nfet_01v8__eta0_diff_0 = 0.0
+ sky130_fd_pr__nfet_01v8__b1_diff_0 = 0.0

.param
* sky130_fd_pr__nfet_01v8, Bin 002, W = 1.0, L = 1.0
* ---------------------------------
+ sky130_fd_pr__nfet_01v8__nfactor_diff_2 = 1.11
+ sky130_fd_pr__nfet_01v8__u0_diff_2 = -9.2293e-5
+ sky130_fd_pr__nfet_01v8__vth0_diff_2 = 0.0065633
+ sky130_fd_pr__nfet_01v8__eta0_diff_2 = 0.0
+ sky130_fd_pr__nfet_01v8__b1_diff_2 = 0.0
+ sky130_fd_pr__nfet_01v8__voff_diff_2 = 0.0
+ sky130_fd_pr__nfet_01v8__ub_diff_2 = 1.6548e-19
+ sky130_fd_pr__nfet_01v8__kt1_diff_2 = 0.0
+ sky130_fd_pr__nfet_01v8__pditsd_diff_2 = 0.0
+ sky130_fd_pr__nfet_01v8__ua_diff_2 = 4.5462e-13
+ sky130_fd_pr__nfet_01v8__vsat_diff_2 = 0.0
+ sky130_fd_pr__nfet_01v8__tvoff_diff_2 = 0.0
+ sky130_fd_pr__nfet_01v8__ags_diff_2 = -0.052872
+ sky130_fd_pr__nfet_01v8__a0_diff_2 = 0.23412
+ sky130_fd_pr__nfet_01v8__b0_diff_2 = 0.0
+ sky130_fd_pr__nfet_01v8__pclm_diff_2 = 0.0
+ sky130_fd_pr__nfet_01v8__pdits_diff_2 = 0.0
+ sky130_fd_pr__nfet_01v8__keta_diff_2 = 0.0
+ sky130_fd_pr__nfet_01v8__rdsw_diff_2 = 0.0
+ sky130_fd_pr__nfet_01v8__k2_diff_2 = -0.0066238

* SKY130 Spice File.
.param sky130_fd_pr__nfet_01v8__toxe_slope=3.443e-03
.param sky130_fd_pr__nfet_01v8__lint_slope=0.0
.param sky130_fd_pr__nfet_01v8__nfactor_slope=0.0
.param sky130_fd_pr__nfet_01v8__voff_slope=0.007
.param sky130_fd_pr__nfet_01v8__vth0_slope=3.356e-03
.param sky130_fd_pr__nfet_01v8__vth0_slope1=7.356e-03
.param sky130_fd_pr__nfet_01v8__wint_slope=0


.param sky130_fd_pr__nfet_01v8__toxe_slope = 0.0
.param sky130_fd_pr__nfet_01v8__vth0_slope = 0.0
.param sky130_fd_pr__nfet_01v8__voff_slope = 0.0

.subckt  sky130_fd_pr__nfet_01v8 d g s b
+ 
.param  l = 1 w = 1 ad = 0 as = 0 pd = 0 ps = 0 nrd = 0 nrs = 0 sa = 0 sb = 0 sd = 0 mult = 1 nf = 1.0
msky130_fd_pr__nfet_01v8 d g s b sky130_fd_pr__nfet_01v8__model l = {l} w = {w} ad = {ad} as = {as} pd = {pd} ps = {ps} nrd = {nrd} nrs = {nrs} sa = {sa} sb = {sb} sd = {sd} nf = {nf}
.model sky130_fd_pr__nfet_01v8__model.0 nmos
* DC IV MOS Parameters
+ lmin = 1.45e-07 lmax = 1.55e-07 wmin = 1.255e-06 wmax = 1.265e-6
+ level = 54.0
+ tnom = 30.0
+ version = 4.7
+ toxm = 4.148e-9
+ xj = 1.5e-7
+ lln = 1.0
+ lwn = 1.0
+ wln = 1.0
+ wwn = 1.0
+ lint = {1.1932e-008+sky130_fd_pr__nfet_01v8__lint_diff}
+ ll = 0.0
+ lw = 0.0
+ lwl = 0.0
+ wint = {2.1859e-008+sky130_fd_pr__nfet_01v8__wint_diff}
+ wl = 0.0
+ ww = 0.0
+ wwl = 0.0
+ xl = 0.0
+ xw = 0.0
+ mobmod = 0.0
+ binunit = 2.0
+ dwg = 0.0
+ dwb = 0.0
* BSIM4 - Model Selectors
+ igcmod = 0.0
+ igbmod = 0.0
+ rgatemod = 0.0
+ rbodymod = 1.0
+ trnqsmod = 0.0
+ acnqsmod = 0.0
+ fnoimod = 1.0
+ tnoimod = 1.0
+ permod = 1.0
+ geomod = 0.0
+ rdsmod = 0.0
+ tempmod = 0.0
+ lintnoi = -1.0e-7
+ vfbsdoff = 0.0
+ lambda = 0.0
+ vtl = 0.0
+ lc = 5.0e-9
+ xn = 3.0
+ rnoia = 0.94
+ rnoib = 0.26
+ tnoia = 1.5e+7
+ tnoib = 9.9e+6
* BSIM4 - Process Parameters
+ epsrox = 3.9
+ toxe = {4.148e-009*sky130_fd_pr__nfet_01v8__toxe_mult}
+ dtox = 0.0
+ ndep = 1.7e+17
+ nsd = 1.0e+20
+ rshg = 0.1
+ rsh = {1*sky130_fd_pr__nfet_01v8__rshn_mult}
* Threshold Voltage Parameters
+ vth0 = {0.49439+sky130_fd_pr__nfet_01v8__vth0_diff_0}
+ k1 = 0.90707349
+ k2 = {-0.12949+sky130_fd_pr__nfet_01v8__k2_diff_0}
+ k3 = 2.0
+ dvt0 = 0.0
+ dvt1 = 0.53
+ dvt2 = -0.032
+ dvt0w = -3.58
+ dvt1w = 1670600.0
+ dvt2w = 0.068
+ w0 = 0.0
+ k3b = 0.54
* NEW BSIM4 Parameters for Level 54
+ phin = 0.0
+ lpe0 = 1.0325e-7
+ lpeb = -7.082e-8
+ vbm = -3.0
+ dvtp0 = 0.0
+ dvtp1 = 0.0
* Mobility Parameters
+ vsat = {176320+sky130_fd_pr__nfet_01v8__vsat_diff_0}
+ ua = {-1.1926e-009+sky130_fd_pr__nfet_01v8__ua_diff_0}
+ ub = {2.1846e-018+sky130_fd_pr__nfet_01v8__ub_diff_0}
+ uc = 8.1022e-11
+ rdsw = {65.968+sky130_fd_pr__nfet_01v8__rdsw_diff_0}
+ prwb = 0.0
+ prwg = 0.021507
+ wr = 1.0
+ u0 = {0.030197+sky130_fd_pr__nfet_01v8__u0_diff_0}
+ a0 = {1.5+sky130_fd_pr__nfet_01v8__a0_diff_0}
+ keta = {0+sky130_fd_pr__nfet_01v8__keta_diff_0}
+ a1 = 0.0
+ a2 = 0.42385546
+ ags = {1.25+sky130_fd_pr__nfet_01v8__ags_diff_0}
+ b0 = {0+sky130_fd_pr__nfet_01v8__b0_diff_0}
+ b1 = {0+sky130_fd_pr__nfet_01v8__b1_diff_0}
* BSIM4 - Mobility Parameters
+ eu = 1.67
+ rdswmin = 0.0
+ rdw = 0.0
+ rdwmin = 0.0
+ rsw = 0.0
+ rswmin = 0.0
* Subthreshold Current Parameters
+ voff = {-0.20753+sky130_fd_pr__nfet_01v8__voff_diff_0}
+ nfactor = {2.015+sky130_fd_pr__nfet_01v8__nfactor_diff_0}
+ up = 0.0
+ ud = 0.0
+ lp = 1.0
+ tvfbsdoff = 0.0
+ tvoff = {0+sky130_fd_pr__nfet_01v8__tvoff_diff_0}
+ cit = 0.0
+ cdsc = 0.0
+ cdscb = 0.0
+ cdscd = 0.002052
+ eta0 = {0.00069413878+sky130_fd_pr__nfet_01v8__eta0_diff_0}
+ etab = -0.043998
+ dsub = 0.45862506
* BSIM4 - Sub-threshold parameters
+ voffl = 5.8197729e-9
+ minv = 0.0
* Rout Parameters
+ pclm = {0.14094+sky130_fd_pr__nfet_01v8__pclm_diff_0}
+ pdiblc1 = 0.35697215
+ pdiblc2 = 0.0084061121
+ pdiblcb = -0.10329577
+ drout = 0.50332666
+ pscbe1 = 7.9141988e+8
+ pscbe2 = 1.0e-12
+ pvag = 0.0
+ delta = 0.01
+ alpha0 = 3.0e-8
+ alpha1 = 0.85
+ beta0 = 13.85
* BSIM4 - Rout Parameters
+ fprout = 0.0
+ pdits = {0+sky130_fd_pr__nfet_01v8__pdits_diff_0}
+ pditsl = 0.0
+ pditsd = {0+sky130_fd_pr__nfet_01v8__pditsd_diff_0}
* BSIM4 - Gate Induced Drain Leakage Model Parameters
+ agidl = 0.0
+ bgidl = 2.3e+9
+ cgidl = 0.5
+ egidl = 0.8
* BSIM4 - Gate Leakage Current Parameters
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
+ nigc = 0.0
+ aigsd = 0.43
+ bigsd = 0.054
+ cigsd = 0.075
+ dlcig = 0.0
+ poxedge = 1.0
+ pigcd = 1.0
+ ntox = 1.0
+ toxref = 4.148e-9
* Temperature Effects Parameters
+ kt1 = {-0.22096074+sky130_fd_pr__nfet_01v8__kt1_diff_0}
+ kt2 = -0.028878939
+ at = 40720.487
+ ute = -1.3190432
+ ua1 = -2.3847336e-11
+ ub1 = 7.0775317e-19
+ uc1 = 1.4718625e-10
+ kt1l = 0.0
+ prt = 0.0
* BSIM4 - High Speed RF Model Parameters
+ xrcrg1 = 12.0
+ xrcrg2 = 1.0
+ rbpb = 50.0
+ rbpd = 50.0
+ rbps = 50.0
+ rbdb = 50.0
+ rbsb = 50.0
+ gbmin = 1.0e-12
* BSIM4 - Flicker and Thermal Noise Parameters
+ noia = 2.5e+42
+ noib = 0.0
+ noic = 0.0
+ em = 4.1000000e+7
+ af = 1.0
+ ef = 0.84
+ kf = 0.0
+ ntnoi = 1.0
* BSIM4 - Layout Dependent Parasitic Model Parameters
+ dmcg = 0.0
+ dmcgt = 0.0
+ dmdg = 0.0
+ xgw = 0.0
+ xgl = 0.0
+ ngcon = 1.0
* Diode DC IV Parameters
* BSIM4 - Diode DC IV parameters
+ diomod = 1.0
+ njs = 1.2928
+ jss = 0.0027500000000000003
+ jsws = 6.0e-10
+ xtis = 2.0
+ bvs = 11.7
+ xjbvs = 1.0
+ ijthsrev = 0.1
+ ijthsfwd = 0.1
* Diode and FET Capacitance Parameters
+ tpb = 0.0012287
+ tpbsw = 0.0
+ tpbswg = 0.0
+ tcj = 0.000792
+ tcjsw = 1.0e-5
+ tcjswg = 0.0
+ cgdo = {2.54e-010*sky130_fd_pr__nfet_01v8__overlap_mult}
+ cgso = {2.54e-010*sky130_fd_pr__nfet_01v8__overlap_mult}
+ cgbo = 1.0e-13
+ capmod = 2.0
+ xpart = 0.0
+ cgsl = {0*sky130_fd_pr__nfet_01v8__overlap_mult}
+ cgdl = {0*sky130_fd_pr__nfet_01v8__overlap_mult}
+ cf = 1.4067e-12
+ clc = 1.0e-7
+ cle = 0.6
+ dlc = {1.0494e-008+sky130_fd_pr__nfet_01v8__dlc_diff}
+ dwc = {0+sky130_fd_pr__nfet_01v8__dwc_diff}
+ vfbcv = -1.0
+ acde = 0.4
+ moin = 6.9
+ noff = 3.4037
+ voffcv = -0.17287
+ ngate = 1.0e+23
+ lwc = 0.0
+ llc = 0.0
+ lwlc = 0.0
+ wlc = 0.0
+ wwc = 0.0
+ wwlc = 0.0
* BSIM4 - FET and Diode capacitance parameters
+ ckappas = 0.6
+ cjs = {0.0013459}
+ mjs = 0.44
+ pbs = 0.729
+ cjsws = {3.6001e-011}
+ mjsws = 0.0009
+ pbsws = 0.2
+ cjswgs = {2.3347e-010}
+ mjswgs = 0.8000
+ pbswgs = 0.95578
* Stress Parameters
+ saref = 1.04e-6
+ sbref = 1.04e-6
+ wlod = 0.0
+ kvth0 = 9.8e-9
+ lkvth0 = 0.0
+ wkvth0 = .2e-6
+ pkvth0 = 0.0
+ llodvth = 0.0
+ wlodvth = 1.0
+ stk2 = 0.0
+ lodk2 = 1.0
+ lodeta0 = 1.0
+ ku0 = -2.7e-8
+ lku0 = 0.0
+ wku0 = 0.0
+ pku0 = 0.0
+ llodku0 = 0.0
+ wlodku0 = 1.0
+ kvsat = 0.2
+ steta0 = 0.0
+ tku0 = 0.0



.model sky130_fd_pr__nfet_01v8__model.2 nmos
* DC IV MOS Parameters
+ lmin = 9.95e-07 lmax = 1.005e-06 wmin = 9.95e-07 wmax = 1.005e-6
+ level = 54.0
+ tnom = 30.0
+ version = 4.7
+ toxm = 4.148e-9
+ xj = 1.5e-7
+ lln = 1.0
+ lwn = 1.0
+ wln = 1.0
+ wwn = 1.0
+ lint = {1.1932e-008+sky130_fd_pr__nfet_01v8__lint_diff}
+ ll = 0.0
+ lw = 0.0
+ lwl = 0.0
+ wint = {2.1859e-008+sky130_fd_pr__nfet_01v8__wint_diff}
+ wl = 0.0
+ ww = 0.0
+ wwl = 0.0
+ xl = 0.0
+ xw = 0.0
+ mobmod = 0.0
+ binunit = 2.0
+ dwg = 0.0
+ dwb = 0.0
* BSIM4 - Model Selectors
+ igcmod = 0.0
+ igbmod = 0.0
+ rgatemod = 0.0
+ rbodymod = 1.0
+ trnqsmod = 0.0
+ acnqsmod = 0.0
+ fnoimod = 1.0
+ tnoimod = 1.0
+ permod = 1.0
+ geomod = 0.0
+ rdsmod = 0.0
+ tempmod = 0.0
+ lintnoi = -1.0e-7
+ vfbsdoff = 0.0
+ lambda = 0.0
+ vtl = 0.0
+ lc = 5.0e-9
+ xn = 3.0
+ rnoia = 0.94
+ rnoib = 0.26
+ tnoia = 1.5e+7
+ tnoib = 9.9e+6
* BSIM4 - Process Parameters
+ epsrox = 3.9
+ toxe = {4.148e-009*sky130_fd_pr__nfet_01v8__toxe_mult}
+ dtox = 0.0
+ ndep = 1.7e+17
+ nsd = 1.0e+20
+ rshg = 0.1
+ rsh = {1*sky130_fd_pr__nfet_01v8__rshn_mult}
* Threshold Voltage Parameters
+ vth0 = {0.57666+sky130_fd_pr__nfet_01v8__vth0_diff_2}
+ k1 = 0.47926744
+ k2 = {-0.00734+sky130_fd_pr__nfet_01v8__k2_diff_2}
+ k3 = 2.0
+ dvt0 = 0.0
+ dvt1 = 0.53
+ dvt2 = -0.032
+ dvt0w = -3.58
+ dvt1w = 1670600.0
+ dvt2w = 0.068
+ w0 = 0.0
+ k3b = 0.54
* NEW BSIM4 Parameters for Level 54
+ phin = 0.0
+ lpe0 = 1.0325e-7
+ lpeb = -7.082e-8
+ vbm = -3.0
+ dvtp0 = 0.0
+ dvtp1 = 0.0
* Mobility Parameters
+ vsat = {90000+sky130_fd_pr__nfet_01v8__vsat_diff_2}
+ ua = {-1.3915e-009+sky130_fd_pr__nfet_01v8__ua_diff_2}
+ ub = {1.9256e-018+sky130_fd_pr__nfet_01v8__ub_diff_2}
+ uc = 7.0144e-11
+ rdsw = {65.968+sky130_fd_pr__nfet_01v8__rdsw_diff_2}
+ prwb = 0.0
+ prwg = 0.021507
+ wr = 1.0
+ u0 = {0.024597+sky130_fd_pr__nfet_01v8__u0_diff_2}
+ a0 = {0.4182+sky130_fd_pr__nfet_01v8__a0_diff_2}
+ keta = {0.0095396+sky130_fd_pr__nfet_01v8__keta_diff_2}
+ a1 = 0.0
+ a2 = 0.42385546
+ ags = {0.72513+sky130_fd_pr__nfet_01v8__ags_diff_2}
+ b0 = {0+sky130_fd_pr__nfet_01v8__b0_diff_2}
+ b1 = {0+sky130_fd_pr__nfet_01v8__b1_diff_2}
* BSIM4 - Mobility Parameters
+ eu = 1.67
+ rdswmin = 0.0
+ rdw = 0.0
+ rdwmin = 0.0
+ rsw = 0.0
+ rswmin = 0.0
* Subthreshold Current Parameters
+ voff = {-0.15134+sky130_fd_pr__nfet_01v8__voff_diff_2}
+ nfactor = {0.84726+sky130_fd_pr__nfet_01v8__nfactor_diff_2}
+ up = 0.0
+ ud = 0.0
+ lp = 1.0
+ tvfbsdoff = 0.0
+ tvoff = {0+sky130_fd_pr__nfet_01v8__tvoff_diff_2}
+ cit = 0.0
+ cdsc = 0.0
+ cdscb = 0.0
+ cdscd = 0.0054
+ eta0 = {0.0025313+sky130_fd_pr__nfet_01v8__eta0_diff_2}
+ etab = -0.084375
+ dsub = 0.26
* BSIM4 - Sub-threshold parameters
+ voffl = 5.8197729e-9
+ minv = 0.0
* Rout Parameters
+ pclm = {0.68831+sky130_fd_pr__nfet_01v8__pclm_diff_2}
+ pdiblc1 = 0.33870462
+ pdiblc2 = 0.005806679
+ pdiblcb = -0.04937254
+ drout = 0.39729981
+ pscbe1 = 8.0e+8
+ pscbe2 = 1.0e-12
+ pvag = 0.0
+ delta = 0.01
+ alpha0 = 2.88e-8
+ alpha1 = 0.697
+ beta0 = 13.86
* BSIM4 - Rout Parameters
+ fprout = 0.0
+ pdits = {0+sky130_fd_pr__nfet_01v8__pdits_diff_2}
+ pditsl = 0.0
+ pditsd = {0+sky130_fd_pr__nfet_01v8__pditsd_diff_2}
* BSIM4 - Gate Induced Drain Leakage Model Parameters
+ agidl = 0.0
+ bgidl = 2.3e+9
+ cgidl = 0.5
+ egidl = 0.8
* BSIM4 - Gate Leakage Current Parameters
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
+ nigc = 0.0
+ aigsd = 0.43
+ bigsd = 0.054
+ cigsd = 0.075
+ dlcig = 0.0
+ poxedge = 1.0
+ pigcd = 1.0
+ ntox = 1.0
+ toxref = 4.148e-9
* Temperature Effects Parameters
+ kt1 = {-0.25664+sky130_fd_pr__nfet_01v8__kt1_diff_2}
+ kt2 = -0.036226822
+ at = 85715.0
+ ute = -1.0468
+ ua1 = 1.2463e-9
+ ub1 = -7.6772e-19
+ uc1 = 1.8046812e-11
+ kt1l = 0.0
+ prt = 0.0
* BSIM4 - High Speed RF Model Parameters
+ xrcrg1 = 12.0
+ xrcrg2 = 1.0
+ rbpb = 50.0
+ rbpd = 50.0
+ rbps = 50.0
+ rbdb = 50.0
+ rbsb = 50.0
+ gbmin = 1.0e-12
* BSIM4 - Flicker and Thermal Noise Parameters
+ noia = 2.5e+42
+ noib = 0.0
+ noic = 0.0
+ em = 4.1000000e+7
+ af = 1.0
+ ef = 0.84
+ kf = 0.0
+ ntnoi = 1.0
* BSIM4 - Layout Dependent Parasitic Model Parameters
+ dmcg = 0.0
+ dmcgt = 0.0
+ dmdg = 0.0
+ xgw = 0.0
+ xgl = 0.0
+ ngcon = 1.0
* Diode DC IV Parameters
* BSIM4 - Diode DC IV parameters
+ diomod = 1.0
+ njs = 1.2928
+ jss = 0.0027500000000000003
+ jsws = 6.0e-10
+ xtis = 2.0
+ bvs = 11.7
+ xjbvs = 1.0
+ ijthsrev = 0.1
+ ijthsfwd = 0.1
* Diode and FET Capacitance Parameters
+ tpb = 0.0012287
+ tpbsw = 0.0
+ tpbswg = 0.0
+ tcj = 0.000792
+ tcjsw = 1.0e-5
+ tcjswg = 0.0
+ cgdo = {2.54e-010*sky130_fd_pr__nfet_01v8__overlap_mult}
+ cgso = {2.54e-010*sky130_fd_pr__nfet_01v8__overlap_mult}
+ cgbo = 1.0e-13
+ capmod = 2.0
+ xpart = 0.0
+ cgsl = {0*sky130_fd_pr__nfet_01v8__overlap_mult}
+ cgdl = {0*sky130_fd_pr__nfet_01v8__overlap_mult}
+ cf = 1.4067e-12
+ clc = 1.0e-7
+ cle = 0.6
+ dlc = {1.0494e-008+sky130_fd_pr__nfet_01v8__dlc_diff}
+ dwc = {0+sky130_fd_pr__nfet_01v8__dwc_diff}
+ vfbcv = -1.0
+ acde = 0.4
+ moin = 6.9
+ noff = 3.4037
+ voffcv = -0.17287
+ ngate = 1.0e+23
+ lwc = 0.0
+ llc = 0.0
+ lwlc = 0.0
+ wlc = 0.0
+ wwc = 0.0
+ wwlc = 0.0
* BSIM4 - FET and Diode capacitance parameters
+ ckappas = 0.6
+ cjs = {0.0013459}
+ mjs = 0.44
+ pbs = 0.729
+ cjsws = {3.6001e-011}
+ mjsws = 0.0009
+ pbsws = 0.2
+ cjswgs = {2.3347e-010}
+ mjswgs = 0.8000
+ pbswgs = 0.95578
* Stress Parameters
+ saref = 2.75e-6
+ sbref = 2.74e-6
+ wlod = 0.0
+ kvth0 = 9.8e-9
+ lkvth0 = 0.0
+ wkvth0 = .2e-6
+ pkvth0 = 0.0
+ llodvth = 0.0
+ wlodvth = 1.0
+ stk2 = 0.0
+ lodk2 = 1.0
+ lodeta0 = 1.0
+ ku0 = -2.7e-8
+ lku0 = 0.0
+ wku0 = 0.0
+ pku0 = 0.0
+ llodku0 = 0.0
+ wlodku0 = 1.0
+ kvsat = 0.2
+ steta0 = 0.0
+ tku0 = 0.0



.ends sky130_fd_pr__nfet_01v8
`;
