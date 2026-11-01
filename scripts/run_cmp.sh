#!/usr/bin/env bash
# Task 7: synthesize csla4 / rca4 (hierarchical and flattened) with the Task 6 flow,
# time them with OpenSTA (Docker) and write cmp.* metrics + results/cmp.csv.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
source scripts/env.sh

OUT=syn/out/cmp
# name top flat
VARIANTS=("csla4 csla4 0" "rca4 rca4 0" "csla4_flat csla4 1" "rca4_flat rca4 1")

fail() { echo "run_cmp: ERROR: $*" >&2; exit 1; }

for spec in "${VARIANTS[@]}"; do
  read -r name top flat <<<"$spec"
  d="$OUT/$name"
  rm -rf "$d"; mkdir -p "$d"
  if [ "$flat" = 1 ]; then
    # fa and mux2 carry (* keep_hierarchy *); rca4 has no mux2, so unset only modules that exist
    case "$top" in
      csla4) keep_mods="fa mux2" ;;
      rca4)  keep_mods="fa" ;;
      *)     fail "unknown top $top" ;;
    esac
    unset_cmd="setattr -mod -unset keep_hierarchy $keep_mods"; flatten="-flatten"
  else
    unset_cmd="# keep_hierarchy kept"; flatten=""
  fi
  sed -e "s|@TOP@|$top|g" -e "s|@LIB@|$LIB_TT|g" -e "s|@ROOT@|$REPO_DIR|g" \
      -e "s|@UNSET@|$unset_cmd|" -e "s|@FLATTEN@|$flatten|" syn/synth_cmp.ys > "$d/synth.gen.ys"
  (cd "$d" && yosys -q -l yosys.log synth.gen.ys > /dev/null) || fail "yosys failed for $name (see $d/yosys.log)"

  # D-6 sanity: hierarchical variants keep fa (and mux2 when used), flat variants keep neither
  net="$d/netlist.syn.v"
  mods=$(grep -E '^module ' "$net" | sed -E 's/^module ([A-Za-z0-9_]+).*/\1/' | sort | tr '\n' ' ')
  if [ "$flat" = 1 ]; then
    [ "$mods" = "$top " ] || fail "$name: expected only module $top, got: $mods"
  else
    grep -qE '^module fa\b' "$net" || fail "$name: module fa missing"
    if [ "$top" = csla4 ]; then grep -qE '^module mux2\b' "$net" || fail "$name: module mux2 missing"; fi
  fi
  echo "[$name] modules: $mods"

  scripts/olsh "LIB_TT=$LIB_TT NETLIST=$net TOP=$top sta -no_splash -exit syn/sta_cmp.tcl" > "$d/sta.log" 2>&1 \
    || { tail -n 20 "$d/sta.log"; fail "sta failed for $name"; }
  python3 scripts/parse_synth.py cmp "$name" "$top"
done

python3 scripts/parse_synth.py csv
