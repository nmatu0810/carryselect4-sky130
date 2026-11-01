#!/usr/bin/env python3
"""csla_struct.png: 2+2 carry-select adder; the select carry c2 is highlighted."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from diagram import arrow, box, canvas  # noqa: E402
from style import HILITE, INK2, plt, save  # noqa: E402

fig, ax = canvas(plt, 7.0, 3.8, (0, 10.4), (0, 5.6))
box(ax, 1.2, 0.5, 2.0, 1.2, "RCA2 low\n(2 FA)")
box(ax, 4.2, 2.3, 2.0, 1.2, "RCA2 hi0\n(cin = 0)")
box(ax, 4.2, 4.0, 2.0, 1.2, "RCA2 hi1\n(cin = 1)")
for i, (y, lab) in enumerate([(0.9, "MUX\nsum[2]"), (2.4, "MUX\nsum[3]"), (3.9, "MUX\ncout")]):
    box(ax, 7.6, y + 0.4, 1.1, 1.0, lab, fc="#fff6e0", ec="#eda100")
arrow(ax, (0.1, 1.1), (1.2, 1.1), "a[1:0]\nb[1:0]\ncin", tx=0.15, ha="left", ty=1.2, fs=6.5)
arrow(ax, (3.2, 0.8), (10.2, 0.8), "sum[1:0]", tx=9.8, ty=0.45)
arrow(ax, (2.6, 3.0), (4.2, 3.0), None)
arrow(ax, (2.6, 4.6), (4.2, 4.6), None)
ax.plot([2.6, 2.6], [3.0, 4.6], color="#898781", lw=1.2)
ax.text(2.5, 3.8, "a[3:2]\nb[3:2]", ha="right", va="center", fontsize=7, color=INK2)
for ysrc in (2.7, 4.4):
    for ydst in (1.8, 3.3, 4.8):
        arrow(ax, (6.2, ysrc), (7.6, ydst), None, lw=0.7)
for y, lab in [(1.8, "sum[2]"), (3.3, "sum[3]"), (4.8, "cout")]:
    arrow(ax, (8.7, y), (10.2, y), lab, tx=9.5)
# critical select carry c2
ax.plot([3.2, 7.1, 7.1], [1.4, 1.4, 4.4], color=HILITE, lw=2.2)
for y in (1.4, 2.9, 4.4):
    arrow(ax, (7.1, y), (7.6, y), None, color=HILITE, lw=2.0)
ax.text(3.4, 1.55, "c2 (select carry, critical)", fontsize=7.5, color=HILITE, fontweight="bold")
ax.text(5.2, 0.1, "hi0 / hi1 compute in parallel with low; c2 only drives the 3 MUX selects",
        ha="center", fontsize=7, color=INK2)
save(fig, "csla_struct.png")
