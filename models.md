# Transistor Models

The following transistor models are available in EEsim for use. Please see the reference link for detail of each models.

### Usage Example:

replace the `MODEL_NAME` from the model names in this document. Replace `WIDTH` and `LENGTH` with appropriate value for each model.

```plaintext
m1 2 1 0 0 MODEL_NAME W=WIDTH L=LENGTH
```

## FreePDK45

add `.include modelcard.FreePDK45` in your netlist.

| Model name  | Node | Type |   Vth |                                        Reference |
| ----------- | :--: | ---: | ----: | -----------------------------------------------: |
| PDK45NTHKOX | 45nm |    N | THKOX | [FreePDK](https://www.eda.ncsu.edu/wiki/FreePDK) |
| PDK45NVTG   | 45nm |    N |   VTG | [FreePDK](https://www.eda.ncsu.edu/wiki/FreePDK) |
| PDK45NVTH   | 45nm |    N |   VTH | [FreePDK](https://www.eda.ncsu.edu/wiki/FreePDK) |
| PDK45NVTL   | 45nm |    N |   VTL | [FreePDK](https://www.eda.ncsu.edu/wiki/FreePDK) |
| PDK45PTHKOX | 45nm |    P | THKOX | [FreePDK](https://www.eda.ncsu.edu/wiki/FreePDK) |
| PDK45PVTG   | 45nm |    P |   VTG | [FreePDK](https://www.eda.ncsu.edu/wiki/FreePDK) |
| PDK45PVTH   | 45nm |    P |   VTH | [FreePDK](https://www.eda.ncsu.edu/wiki/FreePDK) |
| PDK45PVTL   | 45nm |    P |   VTL | [FreePDK](https://www.eda.ncsu.edu/wiki/FreePDK) |

## PTM LP (Low Power)

add `.include modelcard.ptmLP` in your netlist.

| Model name | Node | Type |                          Reference |
| ---------- | :--: | ---: | ---------------------------------: |
| PTMLP16N   | 16nm |    N | [ptm.asu.edu](http://ptm.asu.edu/) |
| PTMLP16P   | 16nm |    P | [ptm.asu.edu](http://ptm.asu.edu/) |
| PTMLP22N   | 22nm |    N | [ptm.asu.edu](http://ptm.asu.edu/) |
| PTMLP22P   | 22nm |    P | [ptm.asu.edu](http://ptm.asu.edu/) |
| PTMLP32N   | 32nm |    N | [ptm.asu.edu](http://ptm.asu.edu/) |
| PTMLP32P   | 32nm |    P | [ptm.asu.edu](http://ptm.asu.edu/) |
| PTMLP45N   | 45nm |    N | [ptm.asu.edu](http://ptm.asu.edu/) |
| PTMLP45P   | 45nm |    P | [ptm.asu.edu](http://ptm.asu.edu/) |

## BSIM4 Benchmark

add `.include modelcard.CMOS90` in your netlist.

Currently `N90` and `P90` models from [BSIM4](https://bsim.berkeley.edu/models/bsim4/) test models are implemented.
