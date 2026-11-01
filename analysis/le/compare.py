#!/usr/bin/env python3
"""Post-layout simulation of the D-9 path and LE vs SPICE comparison.

Runs custom/fa/sim/path_post.sp (PEX netlist from custom/fa/pex.tcl), then writes:
  spice.D_pre_ps  = fa.<chosen>.delay_pre_ps (Task 11)
  spice.D_post_ps = tpd from path_post.sp
  fa.pex_cap_count = number of non-zero C elements in fa_cell_pex.spice
  le.err_pre_pct / le.err_post_pct = (LE - SPICE) / SPICE * 100
  results/le_compare.csv  (method,delay_ps,err_vs_post_pct)
  results/logs/t13_pex.txt  (where the extra post-layout capacitance sits)
"""
import collections
import csv
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
import metrics  # noqa: E402

PEX = ROOT / "custom/fa/out/fa_cell_pex.spice"


def run_post() -> float:
    r = subprocess.run(["ngspice", "-b", "custom/fa/sim/path_post.sp"], capture_output=True, text=True, cwd=ROOT)
    (ROOT / "custom/fa/out/path_post.log").write_text(r.stdout + r.stderr)
    vals = {}
    for k in ("tpdr", "tpdf"):
        m = re.search(rf"^{k}\s*=\s*([-+0-9.eE]+)", r.stdout, re.M)
        if not m:
            raise SystemExit(f"path_post.sp: no {k}; see custom/fa/out/path_post.log")
        vals[k] = float(m.group(1)) * 1e12
    return (vals["tpdr"] + vals["tpdf"]) / 2


def all_caps(text: str) -> list[tuple[str, str, str]]:
    """C elements as (node1, node2, value in fF); ext2spice writes zero caps as a bare 0."""
    return re.findall(r"^C\d+ (\S+) (\S+) ([0-9.]+)f?\b", text, re.M)


def pex_summary(text: str) -> list[str]:
    caps = [c for c in all_caps(text) if float(c[2]) > 0]
    per = collections.Counter()
    for a, b, v in caps:
        per[a] += float(v)
        per[b] += float(v)
    ad = sum(float(x) for x in re.findall(r"\bad=([0-9.]+)", text))
    as_ = sum(float(x) for x in re.findall(r"\bas=([0-9.]+)", text))
    zero = len(all_caps(text)) - len(caps)
    lines = [f"PEX: {len(caps)} non-zero capacitors (+{zero} zero-valued entries written by cthresh 0), "
             f"{len(re.findall(r'^X', text, re.M))} devices",
             f"source/drain area from layout: sum(ad)={ad:.2f} um2, sum(as)={as_:.2f} um2 "
             "(schematic netlist has no ad/as/pd/ps -> no junction capacitance pre-layout)",
             "largest wiring capacitance per net (fF, includes caps to VGND/VPWR):"]
    lines += [f"  {n:<16} {v:7.2f}" for n, v in per.most_common(10)]
    return lines


def main() -> None:
    chosen = metrics.get_metric("fa.sizing_chosen").lower()
    d_pre = metrics.get_metric(f"fa.{chosen}.delay_pre_ps")
    d_le = metrics.get_metric("le.D_est_ps")
    d_post = run_post()
    text = PEX.read_text()
    ncap = sum(1 for c in all_caps(text) if float(c[2]) > 0)  # non-zero parasitic capacitors

    def err(a, b):
        return round((a - b) / b * 100, 2)

    out = {
        "spice.D_pre_ps": round(d_pre, 2), "spice.D_post_ps": round(d_post, 2), "fa.pex_cap_count": ncap,
        "le.err_pre_pct": err(d_le, d_pre), "le.err_post_pct": err(d_le, d_post),
    }
    for k, v in out.items():
        metrics.set_metric(k, v)
        print(f"{k} = {v}")
    with open(ROOT / "results/le_compare.csv", "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["method", "delay_ps", "err_vs_post_pct"])
        w.writerow(["LE_estimate", round(d_le, 2), err(d_le, d_post)])
        w.writerow(["SPICE_pre", round(d_pre, 2), err(d_pre, d_post)])
        w.writerow(["SPICE_post", round(d_post, 2), 0.0])
    log = pex_summary(text)
    (ROOT / "results/logs/t13_pex.txt").write_text("\n".join(log) + "\n")
    print("\n".join(log))


if __name__ == "__main__":
    main()
