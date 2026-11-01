* FA functional test: all 8 (A,B,CI) combinations, checks S and CO against the truth table
* logic 1 > 0.9*VDD, logic 0 < 0.1*VDD, sampled 1.5 ns into each 2 ns slot
* netlist under test: ../fa_cell.spice (selected sizing; see fa_path.py)
.lib $PDK_ROOT/sky130A/libs.tech/ngspice/sky130.lib.spice tt
.include ../fa_cell.spice
.temp 27
VDD vdd 0 1.8
VA A 0 PWL(0 0.0 8.0n 0.0 8.05n 1.8)
VB B 0 PWL(0 0.0 4.0n 0.0 4.05n 1.8 8.0n 1.8 8.05n 0.0 12.0n 0.0 12.05n 1.8)
VC CI 0 PWL(0 0.0 2.0n 0.0 2.05n 1.8 4.0n 1.8 4.05n 0.0 6.0n 0.0 6.05n 1.8 8.0n 1.8 8.05n 0.0 10.0n 0.0 10.05n 1.8 12.0n 1.8 12.05n 0.0 14.0n 0.0 14.05n 1.8)
X0 A B CI S CO vdd 0 fa_cell
* unit-inverter loads on outputs
XLSN sl S 0 0 sky130_fd_pr__nfet_01v8 W=0.42 L=0.15
XLSP sl S vdd vdd sky130_fd_pr__pfet_01v8 W=0.84 L=0.15
XLCN cl CO 0 0 sky130_fd_pr__nfet_01v8 W=0.42 L=0.15
XLCP cl CO vdd vdd sky130_fd_pr__pfet_01v8 W=0.84 L=0.15
.tran 5p 16n
.control
run
let npass = 0
meas tran s0 FIND v(S) AT=1.5n
meas tran c0 FIND v(CO) AT=1.5n
if (s0 < 0.18) & (c0 < 0.18)
  let npass = npass + 1
else
  echo "FAIL A=0 B=0 CI=0: S=$&s0 CO=$&c0 expected S=0 CO=0"
end
meas tran s1 FIND v(S) AT=3.5n
meas tran c1 FIND v(CO) AT=3.5n
if (s1 > 1.62) & (c1 < 0.18)
  let npass = npass + 1
else
  echo "FAIL A=0 B=0 CI=1: S=$&s1 CO=$&c1 expected S=1 CO=0"
end
meas tran s2 FIND v(S) AT=5.5n
meas tran c2 FIND v(CO) AT=5.5n
if (s2 > 1.62) & (c2 < 0.18)
  let npass = npass + 1
else
  echo "FAIL A=0 B=1 CI=0: S=$&s2 CO=$&c2 expected S=1 CO=0"
end
meas tran s3 FIND v(S) AT=7.5n
meas tran c3 FIND v(CO) AT=7.5n
if (s3 < 0.18) & (c3 > 1.62)
  let npass = npass + 1
else
  echo "FAIL A=0 B=1 CI=1: S=$&s3 CO=$&c3 expected S=0 CO=1"
end
meas tran s4 FIND v(S) AT=9.5n
meas tran c4 FIND v(CO) AT=9.5n
if (s4 > 1.62) & (c4 < 0.18)
  let npass = npass + 1
else
  echo "FAIL A=1 B=0 CI=0: S=$&s4 CO=$&c4 expected S=1 CO=0"
end
meas tran s5 FIND v(S) AT=11.5n
meas tran c5 FIND v(CO) AT=11.5n
if (s5 < 0.18) & (c5 > 1.62)
  let npass = npass + 1
else
  echo "FAIL A=1 B=0 CI=1: S=$&s5 CO=$&c5 expected S=0 CO=1"
end
meas tran s6 FIND v(S) AT=13.5n
meas tran c6 FIND v(CO) AT=13.5n
if (s6 < 0.18) & (c6 > 1.62)
  let npass = npass + 1
else
  echo "FAIL A=1 B=1 CI=0: S=$&s6 CO=$&c6 expected S=0 CO=1"
end
meas tran s7 FIND v(S) AT=15.5n
meas tran c7 FIND v(CO) AT=15.5n
if (s7 > 1.62) & (c7 > 1.62)
  let npass = npass + 1
else
  echo "FAIL A=1 B=1 CI=1: S=$&s7 CO=$&c7 expected S=1 CO=1"
end
echo "checked 8 combinations"
if npass = 8
  echo "RESULT fa_func 8/8 PASS"
else
  echo "RESULT fa_func $&npass/8 FAIL"
end
quit
.endc
.end
