#!/usr/bin/env python3
"""area_delay.png: area and critical-path delay of the 4 variants in results/cmp.csv (one axis each)."""
import csv
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from style import INK, ROOT, SERIES, plt, save  # noqa: E402

rows = list(csv.DictReader(open(ROOT / "results/cmp.csv")))
order = ["csla4", "rca4", "csla4_flat", "rca4_flat"]
rows = sorted(rows, key=lambda r: order.index(r["variant"]))
names = ["CSLA-4\n(hier)", "RCA-4\n(hier)", "CSLA-4\n(flat)", "RCA-4\n(flat)"]
colour = {"csla4": SERIES[0], "csla4_flat": SERIES[0], "rca4": SERIES[1], "rca4_flat": SERIES[1]}

fig, axes = plt.subplots(1, 3, figsize=(7.0, 2.4))
for ax, key, title, fmt in zip(axes, ["area_um2", "delay_ns", "adp"],
                               ["Area (um$^2$)", "Delay (ns)", "Area x delay (um$^2$ns)"],
                               ["{:.0f}", "{:.2f}", "{:.0f}"]):
    vals = [float(r[key]) for r in rows]
    bars = ax.bar(range(4), vals, width=0.62, color=[colour[r["variant"]] for r in rows],
                  edgecolor="white", linewidth=1.5,
                  hatch=["", "", "///", "///"])
    for b, v in zip(bars, vals):
        ax.text(b.get_x() + b.get_width() / 2, v, fmt.format(v), ha="center", va="bottom", fontsize=7, color=INK)
    ax.set_xticks(range(4), names, fontsize=6.5)
    ax.set_title(title, fontsize=8.5, color=INK, loc="left")
    ax.set_ylim(0, max(vals) * 1.18)
    ax.yaxis.grid(True)
    ax.set_axisbelow(True)
fig.tight_layout(w_pad=1.2)
save(fig, "area_delay.png")
