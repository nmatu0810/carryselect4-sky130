# Magic DRC (full sky130 rule deck) + GDS export of fa_cell.
#   magic -dnull -noconsole -rcfile $PDK_ROOT/sky130A/libs.tech/magic/sky130A.magicrc custom/fa/drc.tcl
drc style drc(full)
load custom/fa/fa_cell
select top cell
drc check
drc catchup
set n [drc listall count]
set errs 0
foreach pair $n { incr errs [lindex $pair 1] }
puts "DRC_COUNT $errs"
if {$errs > 0} {
    foreach {why boxes} [drc listall why] { puts "DRC_WHY $why ([llength $boxes])" }
}
file mkdir custom/fa/out
gds write custom/fa/out/fa_cell.gds
quit -noprompt
