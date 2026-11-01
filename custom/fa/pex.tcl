# Parasitic extraction of fa_cell (all capacitances, no threshold).
#   magic -dnull -noconsole -rcfile $PDK_ROOT/sky130A/libs.tech/magic/sky130A.magicrc custom/fa/pex.tcl
# Port order comes from the port indices set in the layout: A B CI S CO VPWR VGND.
load custom/fa/fa_cell
file mkdir custom/fa/out
cd custom/fa/out
extract all
ext2spice format ngspice
ext2spice subcircuit top on
ext2spice cthresh 0 rthresh 0
ext2spice -o fa_cell_pex.spice
quit -noprompt
