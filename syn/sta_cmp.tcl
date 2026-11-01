# Run via scripts/run_cmp.sh (olsh) with LIB_TT, NETLIST, TOP in the environment.
read_liberty $::env(LIB_TT)
read_verilog $::env(NETLIST)
link_design $::env(TOP)
read_sdc syn/cmp.sdc
puts "=== REPORT cmp ==="
report_checks -path_delay max -from [all_inputs] -to [all_outputs] -fields {slew cap input_pins} -digits 3
puts "=== END ==="
