#!/usr/bin/env python3
"""Map LibreLane final metrics (pnr/final/ol_metrics.json) to pnr.* keys.

Mapping (LibreLane 3.0.16 key -> metrics.json key):
  design__die__area                                -> pnr.die_area_um2
  design__instance__utilization__stdcell * 100     -> pnr.core_util_pct
      (final, after timing-repair buffers; fill cells excluded)
  design__instance__count__stdcell                 -> pnr.cell_count (tap cells included, fill excluded)
  timing__setup__ws__corner:nom_tt_025C_1v80       -> pnr.wns_setup_ns
  timing__hold__ws__corner:nom_tt_025C_1v80        -> pnr.wns_hold_ns
  min over timing__setup__ws__corner:*             -> pnr.wns_setup_worst_corner_ns
  min over timing__hold__ws__corner:*              -> pnr.wns_hold_worst_corner_ns
  1000 / (period - pnr.wns_setup_ns)               -> pnr.fmax_mhz (period from SDC/config, nom tt)
  magic__drc_error__count                          -> pnr.drc_magic
  klayout__drc_error__count                        -> pnr.drc_klayout
  design__lvs_error__count                         -> pnr.lvs_errors
  route__antenna_violation__count                  -> pnr.antenna_violations
  power__total (W) * 1000                          -> pnr.power_total_mw
  route__wirelength                                -> pnr.wirelength_um
"WNS" keys hold worst slack (positive = met), see DEVIATIONS D1.

Usage:
  parse_ol_metrics.py [--run 10ns]   pnr/final/ol_metrics.json       -> pnr.*   (gated run)
  parse_ol_metrics.py --run 5ns      pnr/final_5ns/ol_metrics.json   -> pnr5.*  (extension run)
pnr5.status is PASS only when every setup/hold corner slack is >= 0 and DRC/LVS are 0, else FAIL.
Every invocation regenerates results/logs/t8.txt from the run metrics that exist (never edited by hand).
"""
import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
import metrics  # noqa: E402

NOM_TT = "nom_tt_025C_1v80"
INTEREST = ("timing", "drc", "lvs", "antenna", "power", "wirelength", "area", "utilization", "count")


def r3(x: float) -> float:
    return round(float(x), 3)


def corner_values(m: dict, kind: str) -> dict:
    pre = f"timing__{kind}__ws__corner:"
    return {k[len(pre):]: v for k, v in m.items() if k.startswith(pre)}


def map_metrics(m: dict, period_ns: float) -> dict:
    setup, hold = corner_values(m, "setup"), corner_values(m, "hold")
    if NOM_TT not in setup or NOM_TT not in hold:
        raise SystemExit(f"missing {NOM_TT} timing corner in metrics")
    wns_setup = setup[NOM_TT]
    return {
        "pnr.die_area_um2": r3(m["design__die__area"]),
        "pnr.core_util_pct": round(100 * float(m["design__instance__utilization__stdcell"]), 1),
        "pnr.cell_count": int(m["design__instance__count__stdcell"]),
        "pnr.wns_setup_ns": r3(wns_setup),
        "pnr.wns_hold_ns": r3(hold[NOM_TT]),
        "pnr.wns_setup_worst_corner_ns": r3(min(setup.values())),
        "pnr.wns_hold_worst_corner_ns": r3(min(hold.values())),
        "pnr.fmax_mhz": round(1000.0 / (period_ns - wns_setup), 1),
        "pnr.drc_magic": int(m["magic__drc_error__count"]),
        "pnr.drc_klayout": int(m["klayout__drc_error__count"]),
        "pnr.lvs_errors": int(m["design__lvs_error__count"]),
        "pnr.antenna_violations": int(m["route__antenna_violation__count"]),
        "pnr.power_total_mw": r3(1000 * float(m["power__total"])),
        "pnr.wirelength_um": int(m["route__wirelength"]),
    }


def sdc_period(sdc: Path) -> float:
    mt = re.search(r"-period\s+([0-9.]+)", sdc.read_text())
    if not mt:
        raise SystemExit(f"no -period in {sdc}")
    return float(mt.group(1))


def map_metrics_5ns(m: dict) -> dict:
    setup, hold = corner_values(m, "setup"), corner_values(m, "hold")
    if NOM_TT not in setup or NOM_TT not in hold:
        raise SystemExit(f"missing {NOM_TT} timing corner in metrics")
    clean = (int(m["magic__drc_error__count"]) == 0 and int(m["klayout__drc_error__count"]) == 0
             and int(m["design__lvs_error__count"]) == 0)
    met = min(setup.values()) >= 0 and min(hold.values()) >= 0
    return {
        "pnr5.status": "PASS" if (met and clean) else "FAIL",
        "pnr5.wns_setup_ns": r3(setup[NOM_TT]),
        "pnr5.wns_hold_ns": r3(hold[NOM_TT]),
        "pnr5.wns_setup_worst_corner_ns": r3(min(setup.values())),
        "pnr5.wns_hold_worst_corner_ns": r3(min(hold.values())),
    }


# ---------------------------------------------------------------------------- results/logs/t8.txt
RUNS = {  # label -> (metrics file, run_info file)
    "10ns": (ROOT / "pnr/final/ol_metrics.json", ROOT / "pnr/final/run_info.json"),
    "5ns": (ROOT / "pnr/final_5ns/ol_metrics.json", ROOT / "pnr/final_5ns/run_info.json"),
}


def run_block(label: str, m: dict, info: dict) -> list:
    out = [f"run_{label}:"]
    out.append(f"  mode / flow : {info.get('mode', '?')}"
               f"{' (' + info['image'] + ')' if info.get('image') else ''} / {info.get('flow', '?')}")
    out.append(f"  config      : {info.get('config', '?')}  CLOCK_PERIOD={info.get('clock_period_ns', '?')}"
               f"  SYNTH_HIERARCHY_MODE={info.get('synth_hierarchy_mode', '?')}")
    out.append(f"  die bbox    : {m.get('design__die__bbox', '?')} um   (area {m.get('design__die__area', '?')} um2)")
    out.append("  corner                 setup_ws_ns  hold_ws_ns")
    setup, hold = corner_values(m, "setup"), corner_values(m, "hold")
    for c in sorted(setup, key=lambda c: (c.split("_")[0] != "min", c.split("_")[0] != "nom", c)):
        out.append(f"  {c:22s} {setup[c]:11.3f} {hold.get(c, float('nan')):11.3f}")
    out.append(f"  worst over {len(setup)} corners: setup {min(setup.values()):.3f}, hold {min(hold.values()):.3f}")
    out.append(f"  DRC magic / klayout / LVS errors: {int(m['magic__drc_error__count'])} / "
               f"{int(m['klayout__drc_error__count'])} / {int(m['design__lvs_error__count'])}")
    return out


def write_t8() -> None:
    lines = ["Task 8 - LibreLane RTL->GDSII (generated by scripts/parse_ol_metrics.py from the run metrics)",
             "rst_n recovery/removal checks are in path group 'asynchronous', included in timing__setup/hold__ws.", ""]
    status = None
    for label, (mf, inf) in RUNS.items():
        if not mf.is_file():
            continue
        info = json.loads(inf.read_text()) if inf.is_file() else {}
        m = json.loads(mf.read_text())
        lines += run_block(label, m, info)
        if label == "5ns":
            status = map_metrics_5ns(m)["pnr5.status"]
            lines.append(f"  extension run, not gated: pnr5.status = {status}")
        lines.append("")
    out = ROOT / "results/logs/t8.txt"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text("\n".join(lines).rstrip() + "\n")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--run", choices=sorted(RUNS), default="10ns", help="which run to parse")
    ap.add_argument("--metrics", help="override the run's metrics file")
    ap.add_argument("--sdc", default=str(ROOT / "syn/constraints.sdc"))
    ap.add_argument("--list", action="store_true", help="print the relevant LibreLane keys")
    a = ap.parse_args()
    mf = Path(a.metrics) if a.metrics else RUNS[a.run][0]
    m = json.loads(mf.read_text())
    if a.list:
        for k in sorted(m):
            if any(s in k for s in INTEREST) and "corner:m" not in k:
                print(f"{k} = {m[k]}")
        print("----")
    out = map_metrics(m, sdc_period(Path(a.sdc))) if a.run == "10ns" else map_metrics_5ns(m)
    for k, v in out.items():
        metrics.set_metric(k, v)
        print(f"{k} = {v}")
    write_t8()


if __name__ == "__main__":
    main()
