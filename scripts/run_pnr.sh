#!/usr/bin/env bash
# Usage: scripts/run_pnr.sh <clock_period_ns> <run_tag>
# Runs LibreLane RTL->GDSII, then copies artifacts to pnr/final (10ns run only).
set -euo pipefail
PERIOD="${1:-10}"; TAG="${2:-run_${PERIOD}ns}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
source scripts/env.sh
mkdir -p results/logs syn/out pnr

CFG=pnr/config.json
if [ "$PERIOD" != "10" ]; then
  # regenerate SDC + config with the requested period (D-7 otherwise unchanged)
  SDC="syn/out/constraints_${PERIOD}ns.sdc"
  sed -E "s/-period [0-9.]+/-period ${PERIOD}/" syn/constraints.sdc > "$SDC"
  CFG="pnr/config_${PERIOD}ns.json"
  jq --arg p "$PERIOD" --arg s "dir::../$SDC" \
     '.CLOCK_PERIOD=($p|tonumber) | .PNR_SDC_FILE=$s | .SIGNOFF_SDC_FILE=$s' \
     pnr/config.json > "$CFG"
fi

# Docker image if present, otherwise the tools on PATH (e.g. a nix profile).
if [ -n "${OL_IMAGE:-}" ]; then MODE=(--dockerized); RUN_MODE=dockerized; else
  MODE=(--manual-pdk); RUN_MODE=native
  # tools with an embedded Python (yosys -y, openroad -python) need the venv's packages
  export PATH="$(dirname "$FLOW_CLI"):$PATH"   # bare `python3` calls in flow scripts
  export PYTHONPATH="$("$(dirname "$FLOW_CLI")/python" -c 'import site; print(site.getsitepackages()[0])')${PYTHONPATH:+:$PYTHONPATH}"
fi
CMD=("$FLOW_CLI" "${MODE[@]}" --run-tag "$TAG" --overwrite --pdk-root "$PDK_ROOT" "$CFG")

# `librelane --dockerized` starts `docker run -it`, which needs a TTY on stdin. Without one
# (CI, pipes, agents) run the command under `script`, which allocates a pty; -e makes
# `script` return the exit status of the wrapped command.
if [ "$RUN_MODE" = dockerized ] && [ ! -t 0 ]; then
  CMD=(script -qec "$(printf '%q ' "${CMD[@]}")" /dev/null)
fi
"${CMD[@]}" > "results/logs/pnr_${TAG}.log" 2>&1 \
  || { tail -n 40 "results/logs/pnr_${TAG}.log"; exit 1; }

RUN="pnr/runs/$TAG/final"
DEST=pnr/final; [ "$PERIOD" = "10" ] || DEST="pnr/final_${PERIOD}ns"
rm -rf "$DEST" && mkdir -p "$DEST"
cp "$RUN"/metrics.json "$DEST/ol_metrics.json"
jq -n --arg mode "$RUN_MODE" --arg image "${OL_IMAGE:-}" \
      --arg flow "$("$FLOW_CLI" --version | head -1)" --arg cfg "$CFG" \
      --argjson period "$PERIOD" --arg hier "$(jq -r .SYNTH_HIERARCHY_MODE "$CFG")" \
  '{mode:$mode, image:$image, flow:$flow, config:$cfg, clock_period_ns:$period, synth_hierarchy_mode:$hier}' \
  > "$DEST/run_info.json"
if [ "$PERIOD" != "10" ]; then
  python3 scripts/parse_ol_metrics.py --run "${PERIOD}ns"
  exit 0
fi
cp -r "$RUN"/{def,nl,spef,sdf,sdc,lef,lib} pnr/final/ 2>/dev/null || true
cp "$RUN"/gds/carryselect4_top.gds pnr/final/carryselect4_top.gds
find "pnr/runs/$TAG" -path '*signoff*' -name '*.rpt' -o -name '*drc*.rpt' -o -name '*lvs*.rpt' 2>/dev/null | xargs -r -I{} cp {} pnr/final/
echo "== gate =="
jq 'with_entries(select(.key|test("timing__(setup|hold)__ws")))' pnr/final/ol_metrics.json
jq '."magic__drc_error__count", ."klayout__drc_error__count", ."design__lvs_error__count"' pnr/final/ol_metrics.json
python3 scripts/parse_ol_metrics.py --run 10ns > /dev/null
