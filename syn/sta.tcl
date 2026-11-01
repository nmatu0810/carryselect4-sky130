# OpenSTA sign-off on the synthesized netlist. Run via scripts/olsh from the repo root
# with LIB_TT in the environment (see `make sta`).
read_liberty $::env(LIB_TT)
read_verilog syn/out/carryselect4_top.syn.v
link_design carryselect4_top
read_sdc syn/constraints.sdc

puts "=== REPORT worst_setup ==="
report_checks -path_delay max -fields {slew cap input_pins} -digits 3
puts "=== REPORT worst_hold ==="
report_checks -path_delay min -fields {slew cap input_pins} -digits 3
puts "=== REPORT reg2reg ==="
report_checks -path_delay max -from [all_registers -clock_pins] -to [all_registers -data_pins] -fields {slew cap input_pins} -digits 3
puts "=== REPORT summary ==="
report_wns
report_tns
report_worst_slack -max -digits 3
report_worst_slack -min -digits 3
puts "=== END ==="
