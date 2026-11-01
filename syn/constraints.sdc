# Shared SDC (Design Decision D-7). Reused by Task 8 (LibreLane).
create_clock -name clk -period 10.0 [get_ports clk]
set_clock_uncertainty 0.25 [get_clocks clk]
set_clock_transition 0.15 [get_clocks clk]
# every input except clk (rst_n included) gets the same input delay and driver
set non_clk_inputs [delete_from_list [all_inputs] [get_ports clk]]
set_input_delay 2.0 -clock [get_clocks clk] $non_clk_inputs
set_driving_cell -lib_cell sky130_fd_sc_hd__inv_2 -pin Y $non_clk_inputs
set_output_delay 2.0 -clock [get_clocks clk] [all_outputs]
set_load 0.0334 [all_outputs]
