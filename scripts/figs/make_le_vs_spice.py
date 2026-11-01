#!/usr/bin/env python3
"""le_vs_spice.png: D-9 path delay, Logical Effort estimate vs SPICE pre/post layout."""
import csv
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from style import INK, INK2, ROOT, SERIES, plt, save  # noqa: E402

rows = list(csv.DictReader(open(ROOT / "results/le_compare.csv")))
label = {"LE_estimate": "Logical Effort\nestimate", "SPICE_pre": "SPICE\npre-layout", "SPICE_post": "SPICE\npost-layout (PEX)"}
vals = [float(r["delay_ps"]) for r in rows]
fig, ax = plt.subplots(figsize=(4.2, 2.6))
bars = ax.bar(range(len(rows)), vals, width=0.6, color=SERIES[:len(rows)], edgecolor="white", linewidth=1.5)
for b, r, v in zip(bars, rows, vals):
    err = float(r["err_vs_post_pct"])
    txt = f"{v:.0f} ps" + ("" if r["method"] == "SPICE_post" else f"\n({err:+.1f}% vs post)")
    ax.text(b.get_x() + b.get_width() / 2, v, txt, ha="center", va="bottom", fontsize=7, color=INK)
ax.set_xticks(range(len(rows)), [label[r["method"]] for r in rows], fontsize=7)
ax.set_ylabel("delay A0 -> CO1 (ps)")
ax.set_ylim(0, max(vals) * 1.3)
ax.yaxis.grid(True)
ax.set_axisbelow(True)
ax.set_title("2-bit ripple carry path (N = 4 stages)", fontsize=8.5, color=INK, loc="left")
save(fig, "le_vs_spice.png")
