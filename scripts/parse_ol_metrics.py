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


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--metrics", default=str(ROOT / "pnr/final/ol_metrics.json"))
    ap.add_argument("--sdc", default=str(ROOT / "syn/constraints.sdc"))
    ap.add_argument("--list", action="store_true", help="print the relevant LibreLane keys")
    a = ap.parse_args()
    m = json.loads(Path(a.metrics).read_text())
    if a.list:
        for k in sorted(m):
            if any(s in k for s in INTEREST) and "corner:m" not in k:
                print(f"{k} = {m[k]}")
        print("----")
    out = map_metrics(m, sdc_period(Path(a.sdc)))
    for k, v in out.items():
        metrics.set_metric(k, v)
        print(f"{k} = {v}")


if __name__ == "__main__":
    main()
