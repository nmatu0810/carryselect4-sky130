#!/usr/bin/env bash
# LVS of the full-custom FA: Magic extraction vs custom/fa/fa_cell.spice (netgen, sky130A setup).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"
source scripts/env.sh
OUT=custom/fa/out
mkdir -p "$OUT" results/logs
magic -dnull -noconsole -rcfile "$PDK_ROOT/sky130A/libs.tech/magic/sky130A.magicrc" <<TCL > "$OUT/lvs_extract.log" 2>&1
load custom/fa/fa_cell
cd $OUT
extract all
ext2spice lvs
ext2spice -o fa_cell_lvs.spice
quit -noprompt
TCL
netgen -batch lvs "$OUT/fa_cell_lvs.spice fa_cell" "custom/fa/fa_cell.spice fa_cell" \
  "$PDK_ROOT/sky130A/libs.tech/netgen/sky130A_setup.tcl" "$OUT/lvs.rpt" > "$OUT/lvs_netgen.log" 2>&1 || true
tail -n 30 "$OUT/lvs.rpt" > results/logs/t13_lvs.txt
if grep -q "Circuits match uniquely" "$OUT/lvs.rpt"; then
  echo "LVS: Circuits match uniquely."
  python3 scripts/metrics.py set fa.lvs_match true
else
  echo "LVS: MISMATCH (see $OUT/lvs.rpt)"
  python3 scripts/metrics.py set fa.lvs_match false
  exit 1
fi
