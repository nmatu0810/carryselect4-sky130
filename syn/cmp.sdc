# Task 7: combinational comparison. Virtual clock, zero I/O delays, so the reported
# data arrival time of the longest input->output path is the adder delay.
create_clock -name vclk -period 10
set_input_delay 0 -clock [get_clocks vclk] [all_inputs]
set_output_delay 0 -clock [get_clocks vclk] [all_outputs]
set_driving_cell -lib_cell sky130_fd_sc_hd__inv_2 -pin Y [all_inputs]
set_load 0.0334 [all_outputs]
