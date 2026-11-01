* FO4 inverter characterization, sky130 tt, 1.8 V, 27 C
* Unit inverter: Wn = 0.42 um, L = 0.15 um, Wp = {wp} (swept by run_tau.py).
* Chain A (loaded):   vin -> XS (slope shaper, FO4) -> XD (DUT) -> 4 x unit inverter
* Chain B (unloaded): vin -> XS2 (same shaper, FO4)  -> XD2 (DUT, fanout 0)
* Every load inverter drives one more unit inverter so its Miller input cap is realistic.
.lib @PDK_ROOT@/sky130A/libs.tech/ngspice/sky130.lib.spice tt
.temp 27
.param wp=0.84
.param wn=0.42

.subckt inv in out vdd
XMN out in 0 0 sky130_fd_pr__nfet_01v8 W={wn} L=0.15
XMP out in vdd vdd sky130_fd_pr__pfet_01v8 W={wp} L=0.15
.ends

VDD vdd 0 1.8
VIN vin 0 PULSE(0 1.8 200p 30p 30p 1.5n 3.2n)

* ---- chain A: DUT with fanout 4 ----
XS  vin a1 vdd inv
XSd1 a1 sd1 vdd inv
XSd2 a1 sd2 vdd inv
XSd3 a1 sd3 vdd inv
XD  a1 a2 vdd inv
XL1 a2 l1 vdd inv
XL2 a2 l2 vdd inv
XL3 a2 l3 vdd inv
XL4 a2 l4 vdd inv
XT1 l1 t1 vdd inv
XT2 l2 t2 vdd inv
XT3 l3 t3 vdd inv
XT4 l4 t4 vdd inv

* ---- chain B: DUT unloaded ----
XS2  vin b1 vdd inv
XS2d1 b1 sb1 vdd inv
XS2d2 b1 sb2 vdd inv
XS2d3 b1 sb3 vdd inv
XD2  b1 b2 vdd inv

.tran 1p 4n
.control
run
* a1 rises when vin falls; DUT output a2 then falls (tpdf), and vice versa
meas tran tpdf  TRIG v(a1) VAL=0.9 RISE=1 TARG v(a2) VAL=0.9 FALL=1
meas tran tpdr  TRIG v(a1) VAL=0.9 FALL=1 TARG v(a2) VAL=0.9 RISE=1
meas tran tpdf0 TRIG v(b1) VAL=0.9 RISE=1 TARG v(b2) VAL=0.9 FALL=1
meas tran tpdr0 TRIG v(b1) VAL=0.9 FALL=1 TARG v(b2) VAL=0.9 RISE=1
quit
.endc
.end
