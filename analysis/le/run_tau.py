#!/usr/bin/env python3
"""Characterize tau from an FO4 inverter in sky130 tt and record le.* keys.

Sweeps Wp in {0.84, 1.00, 1.26} um (Wn = 0.42 um), keeps the Wp with the
smallest |tpdr - tpdf| at FO4, then:
  fo4_ps = (tpdr + tpdf) / 2
  tau_ps = fo4_ps / 5           (FO4 = g*h + p = 1*4 + pinv, with pinv ~ 1)
  pinv   = tpd_unloaded / tau_ps
Also reads the S pin capacitance of sky130_fd_sc_hd__mux2_1 (tt liberty) -> le.c_mux_s_ff.
"""
import os
import re
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
import metrics  # noqa: E402

WN = 0.42
WP_SWEEP = (0.84, 1.00, 1.26)
OUT = ROOT / "analysis" / "le" / "out"


def run_fo4(wp: float) -> dict[str, float]:
    src = (HERE / "inv_fo4.sp").read_text()
    src = src.replace("@PDK_ROOT@", os.environ["PDK_ROOT"])
    src = re.sub(r"^\.param wp=.*$", f".param wp={wp}", src, flags=re.M)
    OUT.mkdir(parents=True, exist_ok=True)
    net = OUT / f"inv_fo4_wp{wp:.2f}.sp"
    net.write_text(src)
    res = subprocess.run(["ngspice", "-b", str(net)], capture_output=True, text=True)
    (OUT / f"inv_fo4_wp{wp:.2f}.log").write_text(res.stdout + res.stderr)
    vals = {}
    for name in ("tpdf", "tpdr", "tpdf0", "tpdr0"):
        m = re.search(rf"^{name}\s*=\s*([-+0-9.eE]+)", res.stdout, re.M)
        if not m:
            raise SystemExit(f"ngspice: no measurement {name} for wp={wp}; see {net}.log")
        vals[name] = float(m.group(1)) * 1e12
    return vals


def mux_s_cap_ff(lib: Path) -> float:
    text = lib.read_text()
    start = text.index('cell ("sky130_fd_sc_hd__mux2_1")')
    cell = text[start : text.index('cell ("', start + 10)]
    pin = cell[cell.index('pin ("S")') :]
    m = re.search(r"\bcapacitance\s*:\s*([0-9.eE+-]+)", pin)
    if not m:
        raise SystemExit("no capacitance for mux2_1/S")
    return float(m.group(1)) * 1000.0  # pF -> fF


def main() -> None:
    rows = []
    for wp in WP_SWEEP:
        v = run_fo4(wp)
        rows.append((abs(v["tpdr"] - v["tpdf"]), wp, v))
        print(f"wp={wp:.2f}  tpdr={v['tpdr']:.2f}  tpdf={v['tpdf']:.2f}  "
              f"tpdr0={v['tpdr0']:.2f}  tpdf0={v['tpdf0']:.2f} ps")
    _, wp, v = min(rows, key=lambda r: r[0])
    fo4 = (v["tpdr"] + v["tpdf"]) / 2
    tau = fo4 / 5
    pinv = (v["tpdr0"] + v["tpdf0"]) / 2 / tau
    cmux = mux_s_cap_ff(Path(os.environ["LIB_TT"]))
    out = {
        "le.wn_unit_um": WN,
        "le.wp_unit_um": wp,
        "le.fo4_ps": round(fo4, 3),
        "le.tau_ps": round(tau, 3),
        "le.pinv": round(pinv, 3),
        "le.c_mux_s_ff": round(cmux, 3),
    }
    for k, val in out.items():
        metrics.set_metric(k, val)
        print(f"{k} = {val}")


if __name__ == "__main__":
    main()
