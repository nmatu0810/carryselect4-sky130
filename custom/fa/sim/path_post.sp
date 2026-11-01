* D-9 critical path, POST-layout (identical to path_pre.sp, PEX netlist of the layout): A0 -> (FA0 carry gate -> inv) -> CO0 -> (FA1 carry gate -> inv) -> CO1
* RCA2 of two fa_cell; B0=1, CI0=0 so CO0 = A0; A1=1, B1=0 (A1^B1=1) so CO1 = CO0.
* Load at CO1 = 3 x C(mux2_1.S) = 3 x le.c_mux_s_ff (3 x 3.402 fF), the three MUX selected by c2.
* tpd = average of A0 rise -> CO1 rise and A0 fall -> CO1 fall, 50%-50%.
.lib $PDK_ROOT/sky130A/libs.tech/ngspice/sky130.lib.spice tt
.include ../out/fa_cell_pex.spice
.temp 27
.param cload=10.206f

VDD vdd 0 1.8
VIN in 0 PULSE(1.8 0 200p 30p 30p 1.5n 3.2n)
* pre-driver: 3x unit inverter (input A of fa_cell is ~9x unit cap -> FO3 slope)
XDN A0 in 0 0 sky130_fd_pr__nfet_01v8 W=1.26 L=0.15
XDP A0 in vdd vdd sky130_fd_pr__pfet_01v8 W=2.52 L=0.15

VB0 B0 0 1.8
VC0 CI0 0 0
VA1 A1 0 1.8
VB1 B1 0 0
XFA0 A0 B0 CI0 S0 CO0 vdd 0 fa_cell
XFA1 A1 B1 CO0 S1 CO1 vdd 0 fa_cell
CL CO1 0 {cload}
* sum outputs see a unit inverter each
XS0N s0l S0 0 0 sky130_fd_pr__nfet_01v8 W=0.42 L=0.15
XS0P s0l S0 vdd vdd sky130_fd_pr__pfet_01v8 W=0.84 L=0.15
XS1N s1l S1 0 0 sky130_fd_pr__nfet_01v8 W=0.42 L=0.15
XS1P s1l S1 vdd vdd sky130_fd_pr__pfet_01v8 W=0.84 L=0.15

.tran 1p 4n
.control
run
meas tran tpdr TRIG v(A0) VAL=0.9 RISE=1 TARG v(CO1) VAL=0.9 RISE=1
meas tran tpdf TRIG v(A0) VAL=0.9 FALL=1 TARG v(CO1) VAL=0.9 FALL=1
let tpd = (tpdr + tpdf) / 2
echo "RESULT tpd $&tpd"
* waveforms for docs/figures/fa_transient.png (path relative to the repo root)
wrdata custom/fa/out/fa_transient.dat v(A0) v(CO1)
quit
.endc
.end
