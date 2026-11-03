#!/usr/bin/env bash
# Task 20: re-run the reproducible steps and every metrics gate of Tasks 5-13.
#   make verify-all        (exit 0 only if everything passes)
# PnR is not re-run (too slow): the GDS hash is compared with DELIVERABLES.md instead.
# Re-runs write into a scratch copy of results/metrics.json (VERIFY_METRICS), so the committed
# numbers that the paper/report/slides quote are never overwritten; values that drift from the
# committed ones are listed (a drift is reported, not hidden).
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
source scripts/env.sh

OUT=results/out
mkdir -p "$OUT"
export METRICS_FILE="$PWD/$OUT/verify_metrics.json"
cp results/metrics.json "$METRICS_FILE"
LOG="$OUT/verify_all.log"
# outputs that the re-run regenerates: keep the committed copies, park the re-run copies in $OUT/rerun
KEEP=(results/cmp.csv results/logs/t6_sta.txt results/logs/t7.txt paper/CarrySelect4_IEEE.pdf
      paper/metrics.tex report/baocao_CarrySelect4.docx)
SNAP=$(mktemp -d)
for f in "${KEEP[@]}"; do [ -f "$f" ] && mkdir -p "$SNAP/$(dirname "$f")" && cp -p "$f" "$SNAP/$f"; done
restore() {
  for f in "${KEEP[@]}"; do
    if [ -f "$SNAP/$f" ]; then
      if ! cmp -s "$f" "$SNAP/$f"; then mkdir -p "$OUT/rerun/$(dirname "$f")"; cp -p "$f" "$OUT/rerun/$f"; fi
      cp -p "$SNAP/$f" "$f"
    fi
  done
  rm -rf "$SNAP"
}
trap restore EXIT
: > "$LOG"
FAILS=()

run() {   # run <label> <command...>
  local label=$1; shift
  if "$@" >> "$LOG" 2>&1; then echo "  ok    $label"; else echo "  FAIL  $label (see $LOG)"; FAILS+=("$label"); fi
}
chk() {   # chk <key> <op> <value>
  if python3 scripts/metrics.py check "$1" "$2" "$3"; then :; else
    echo "  FAIL  check $1 $2 $3 (value: $(python3 scripts/metrics.py get "$1" 2>/dev/null || echo missing))"
    FAILS+=("check $1 $2 $3")
  fi
}

echo "== re-run =="
run lint        make -s lint
run sim-all     make -s sim-all
run synth       make -s synth
run sta         make -s sta
run compare     make -s compare
run le-test     make -s le-test
run tex-test    python3 -m pytest -q scripts/test_metrics_to_tex.py
run paper       make -s paper
run report      make -s report

echo "== metrics gates (T5-T13) =="
for c in case1 case2 case3 case4 case5 case_illegal; do chk "sim.$c.status" '==' PASS; done
chk sim.latency_cycles '==' 2; chk sim.cycles_per_result '==' 2
chk sim.exhaustive.checked '==' 512; chk sim.exhaustive.errors '==' 0
chk synth.top.latch_count '==' 0; chk synth.top.ff_count '==' 16; chk synth.top.nand2_eq '<=' 500
chk sta.synth.wns_setup_ns '>=' 0; chk sta.synth.wns_hold_ns '>=' 0
for v in csla4 rca4 csla4_flat rca4_flat; do chk "cmp.$v.delay_ns" '>' 0; done
for k in wns_setup_ns wns_hold_ns wns_setup_worst_corner_ns wns_hold_worst_corner_ns; do chk "pnr.$k" '>=' 0; done
for k in drc_magic drc_klayout lvs_errors; do chk "pnr.$k" '==' 0; done
chk le.tau_ps '>' 5; chk le.tau_ps '<' 40
for k in G B H F fhat D_est_ps p_carry; do chk "le.$k" '>' 0; done
chk fa.drc_errors '==' 0; chk fa.ntrans '==' 28; chk fa.taps '>=' 2
chk fa.lvs_match '==' true
chk spice.D_post_ps '>=' "$(python3 scripts/metrics.py get spice.D_pre_ps)"

echo "== documents =="
pages=$(pdfinfo paper/CarrySelect4_IEEE.pdf 2>/dev/null | awk '/^Pages/{print $2}')
if [ -n "$pages" ] && [ "$pages" -le 4 ]; then echo "  ok    paper pages = $pages"; else echo "  FAIL  paper pages = ${pages:-?}"; FAILS+=(paper-pages); fi
if unzip -p report/baocao_CarrySelect4.docx word/document.xml | grep -q '{{'; then
  echo "  FAIL  report has unresolved placeholders"; FAILS+=(report-placeholders); else echo "  ok    report placeholders resolved"; fi
nslides=$(unzip -l slides/CarrySelect4_BaoVe.pptx | grep -cE 'ppt/slides/slide[0-9]+\.xml')
if [ "$nslides" -ge 10 ] && [ "$nslides" -le 18 ]; then echo "  ok    slides = $nslides"; else echo "  FAIL  slides = $nslides"; FAILS+=(slides); fi
if python3 scripts/check_consistency.py; then :; else FAILS+=(consistency); fi

echo "== GDS =="
want=$(grep -oE 'sha256: `[0-9a-f]{64}`' DELIVERABLES.md | grep -oE '[0-9a-f]{64}' | head -1)
have=$(sha256sum pnr/final/carryselect4_top.gds | cut -d' ' -f1)
if [ -n "$want" ] && [ "$want" = "$have" ]; then echo "  ok    pnr/final/carryselect4_top.gds sha256 matches DELIVERABLES.md"
else echo "  FAIL  GDS sha256 $have != DELIVERABLES.md ${want:-<none>}"; FAILS+=(gds-sha256); fi

echo "== drift vs committed results/metrics.json (re-run outputs kept in $OUT/rerun) =="
python3 - "$METRICS_FILE" <<'PY'
import json, sys
a = json.load(open("results/metrics.json")); b = json.load(open(sys.argv[1]))
drift = [(k, a.get(k), b.get(k)) for k in sorted(set(a) | set(b)) if a.get(k) != b.get(k) and not k.startswith("env.")]
print("  none" if not drift else "\n".join(f"  {k}: committed={x} rerun={y}" for k, x, y in drift))
PY

echo
if [ ${#FAILS[@]} -eq 0 ]; then echo "verify-all: PASS"; exit 0; fi
echo "verify-all: FAIL (${#FAILS[@]}): ${FAILS[*]}"
exit 1
