export const skywaterParams = `
* SKY130 Spice File.
*.option scale=1.0u


.param
+ lv_dlc_rotweak = .00e-9
+ lvhvt_dlc_rotweak = .00e-9
+ lvt_dlc_rotweak = .00e-9
+ hv_dlc_rotweak = .00e-9
+ sky130_fd_pr__nfet_01v8__dlc_rotweak = lv_dlc_rotweak
+ sky130_fd_pr__esd_nfet_01v8__dlc_rotweak = lv_dlc_rotweak
+ sky130_fd_pr__nfet_01v8_lvt__dlc_rotweak = lvt_dlc_rotweak
+ sky130_fd_pr__pfet_01v8__dlc_rotweak = lv_dlc_rotweak
+ sky130_fd_pr__pfet_01v8_lvt__dlc_rotweak = lvt_dlc_rotweak
+ sky130_fd_pr__pfet_01v8_hvt__dlc_rotweak = lvhvt_dlc_rotweak
+ sky130_fd_pr__esd_nfet_g5v0d10v5__dlc_rotweak = hv_dlc_rotweak
+ sky130_fd_pr__esd_pfet_g5v0d10v5__dlc_rotweak = hv_dlc_rotweak
+ sky130_fd_pr__nfet_03v3_nvt__dlc_rotweak = hv_dlc_rotweak
+ sky130_fd_pr__nfet_05v0_nvt__dlc_rotweak = hv_dlc_rotweak
+ sky130_fd_pr__nfet_g5v0d10v5__dlc_rotweak = hv_dlc_rotweak
+ sky130_fd_pr__pfet_g5v0d10v5__dlc_rotweak = hv_dlc_rotweak
+ sky130_fd_pr__pfet_g5v0d16v0__dlc_rotweak = hv_dlc_rotweak
+ sky130_fd_pr__special_nfet_pass__dlc_rotweak = lv_dlc_rotweak
+ sky130_fd_pr__special_nfet_pass_lowleakage__dlc_rotweak = lv_dlc_rotweak
+ sky130_fd_pr__special_nfet_pass_flash__dlc_rotweak = hv_dlc_rotweak
+ sky130_fd_pr__special_nfet_latch__dlc_rotweak = lv_dlc_rotweak
+ sky130_fd_pr__special_nfet_latch_lowleakage__dlc_rotweak = lv_dlc_rotweak
+ sky130_fd_pr__special_pfet_pass__dlc_rotweak = lv_dlc_rotweak
+ sky130_fd_pr__special_pfet_pass_lowleakage__dlc_rotweak = lv_dlc_rotweak
+ sky130_fd_bs_flash__special_sonosfet_star__dlc_rotweak = hv_dlc_rotweak
+ sky130_fd_bs_flash__special_sonosfet_original__dlc_rotweak = hv_dlc_rotweak
+ sonos_eeol_dlc_rotweak = hv_dlc_rotweak

.param sky130_fd_pr__rf_nfet_01v8_lvt__base__dlc_rotweak=0
.param sky130_fd_pr__pfet_01v8_lvt__rf_base_dlc_rotweak=0
.param sky130_fd_pr__rf_nfet_01v8__base__dlc_rotweak=0
.param sky130_fd_pr__rf_pfet_01v8__base__dlc_rotweak=0
.param sky130_fd_pr__rf_nfet_g5v0d10v5__base__dlc_rotweak=0



* SKY130 Spice File.
.param
+ sky130_fd_pr__nfet_01v8_lvt__lkvth0_diff = 0.0
+ sky130_fd_pr__nfet_01v8_lvt__wlod_diff = 0.0
+ sky130_fd_pr__nfet_01v8_lvt__lku0_diff = 0.0
+ sky130_fd_pr__nfet_01v8_lvt__kvth0_diff = 7.9e-9
+ sky130_fd_pr__nfet_01v8_lvt__wkvth0_diff = .3e-6
+ sky130_fd_pr__nfet_01v8_lvt__ku0_diff = -2.7e-8
+ sky130_fd_pr__nfet_01v8_lvt__wku0_diff = 0.0
+ sky130_fd_pr__nfet_01v8_lvt__kvsat_diff = 0.2
+ sky130_fd_pr__pfet_01v8__lkvth0_diff = .0e-6
+ sky130_fd_pr__pfet_01v8__wlod_diff = .0e-6
+ sky130_fd_pr__pfet_01v8__lku0_diff = 0.0
+ sky130_fd_pr__pfet_01v8__kvsat_diff = 0.5
+ sky130_fd_pr__pfet_01v8__kvth0_diff = 3.29e-8
+ sky130_fd_pr__pfet_01v8__wkvth0_diff = .20e-6
+ sky130_fd_pr__pfet_01v8__ku0_diff = 4.5e-8
+ sky130_fd_pr__pfet_01v8__wku0_diff = .25e-6
+ sky130_fd_pr__pfet_01v8_lvt__wkvth0_diff = .73e-6
+ sky130_fd_pr__pfet_01v8_lvt__lkvth0_diff = 0.0
+ sky130_fd_pr__pfet_01v8_lvt__wlod_diff = .0e-6
+ sky130_fd_pr__pfet_01v8_lvt__ku0_diff = 5.9e-8
+ sky130_fd_pr__pfet_01v8_lvt__lku0_diff = 0.0
+ sky130_fd_pr__pfet_01v8_lvt__wku0_diff = 0.0
+ sky130_fd_pr__pfet_01v8_lvt__kvsat_diff = .0e-6
+ sky130_fd_pr__pfet_01v8_lvt__kvth0_diff = 1.76e-8
+ sky130_fd_pr__nfet_g5v0d10v5__wkvth0_diff = .65e-6
+ sky130_fd_pr__nfet_g5v0d10v5__lkvth0_diff = 0.0
+ sky130_fd_pr__nfet_g5v0d10v5__kvth0_diff = 11.0e-9
+ sky130_fd_pr__nfet_g5v0d10v5__wlod_diff = 0.0
+ sky130_fd_pr__nfet_g5v0d10v5__ku0_diff = -4.5e-8
+ sky130_fd_pr__nfet_g5v0d10v5__lku0_diff = 0.0
+ sky130_fd_pr__nfet_g5v0d10v5__wku0_diff = .2e-6
+ sky130_fd_pr__nfet_g5v0d10v5__kvsat_diff = 0.3
+ sky130_fd_pr__pfet_g5v0d10v5__wkvth0_diff = .65e-6
+ sky130_fd_pr__pfet_g5v0d10v5__lkvth0_diff = 0.0
+ sky130_fd_pr__pfet_g5v0d10v5__kvth0_diff = 3.5e-8
+ sky130_fd_pr__pfet_g5v0d10v5__wlod_diff = 0.0
+ sky130_fd_pr__pfet_g5v0d10v5__ku0_diff = 7.0e-8
+ sky130_fd_pr__pfet_g5v0d10v5__lku0_diff = 0.0
+ sky130_fd_pr__pfet_g5v0d10v5__wku0_diff = 0.0
+ sky130_fd_pr__pfet_g5v0d10v5__kvsat_diff = 0.4
+ sky130_fd_pr__nfet_05v0_nvt__wkvth0_diff = .8e-6
+ sky130_fd_pr__nfet_05v0_nvt__lkvth0_diff = 0.0
+ sky130_fd_pr__nfet_05v0_nvt__kvth0_diff = -7.0e-9
+ sky130_fd_pr__nfet_05v0_nvt__wlod_diff = 0.0
+ sky130_fd_pr__nfet_05v0_nvt__ku0_diff = -3.0e-8
+ sky130_fd_pr__nfet_05v0_nvt__lku0_diff = 0.0
+ sky130_fd_pr__nfet_05v0_nvt__wku0_diff = .2e-6
+ sky130_fd_pr__nfet_05v0_nvt__kvsat_diff = 0.4
+ sky130_fd_pr__nfet_03v3_nvt__wkvth0_diff = .0e-6
+ sky130_fd_pr__nfet_03v3_nvt__lkvth0_diff = 0.0
+ sky130_fd_pr__nfet_03v3_nvt__kvth0_diff = -2.0e-9
+ sky130_fd_pr__nfet_03v3_nvt__wlod_diff = 0.0
+ sky130_fd_pr__nfet_03v3_nvt__ku0_diff = -3.0e-8
+ sky130_fd_pr__nfet_03v3_nvt__lku0_diff = 0.0
+ sky130_fd_pr__nfet_03v3_nvt__wku0_diff = .5e-6
+ sky130_fd_pr__nfet_03v3_nvt__kvsat_diff = 0.3
.param
* parameters fixed copy from Hvnmos
+ sky130_fd_pr__nfet_g5v0d16v0__wku0_diff = .2e-6
+ sky130_fd_pr__nfet_g5v0d16v0__kvsat_diff = 0.3
+ sky130_fd_pr__nfet_g5v0d16v0__kvth0_diff = 1.7057e-8
+ sky130_fd_pr__nfet_g5v0d16v0__ku0_diff = -9.9000e-8
+ sky130_fd_pr__nfet_g5v0d16v0__lku0_diff = 9.6975e-7
+ sky130_fd_pr__nfet_g5v0d16v0__lkvth0_diff = 2.2691e-7
+ sky130_fd_pr__nfet_g5v0d16v0__wkvth0_diff = 2.3093e-6
* parameters fixed copy from Hvpmos
.param
+ sky130_fd_pr__pfet_g5v0d16v0__wku0_diff = 0.0
+ sky130_fd_pr__pfet_g5v0d16v0__kvsat_diff = 0.4
+ sky130_fd_pr__pfet_g5v0d16v0__kvth0_diff = 5.2302e-9
+ sky130_fd_pr__pfet_g5v0d16v0__ku0_diff = 2.2180e-7
+ sky130_fd_pr__pfet_g5v0d16v0__lku0_diff = 8.7129e-7
+ sky130_fd_pr__pfet_g5v0d16v0__lkvth0_diff = -4.8631e-7
+ sky130_fd_pr__pfet_g5v0d16v0__wkvth0_diff = 5.3980e-7



.param
+ sky130_fd_pr__nfet_01v8__ajunction_mult = 1.0
+ sky130_fd_pr__nfet_01v8__pjunction_mult = 1.0
* sky130_fd_pr__diode_pd2nw_05v5_hvt  Parameters
+ sky130_fd_pr__pfet_01v8_hvt__ajunction_mult = 1.0
+ sky130_fd_pr__pfet_01v8_hvt__pjunction_mult = 1.0

`;
