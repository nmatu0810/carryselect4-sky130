#!/usr/bin/env python3
"""fsm.png: Moore FSM with encodings, transitions and outputs (D-2)."""
import sys
from pathlib import Path

from matplotlib.patches import Circle

sys.path.insert(0, str(Path(__file__).resolve().parent))
from diagram import arrow, canvas  # noqa: E402
from style import INK, INK2, MUTED, SERIES, plt, save  # noqa: E402

fig, ax = canvas(plt, 6.8, 3.6, (-1.0, 10), (0, 5.6))
S = {"IDLE": (1.8, 3.0), "COMPUTE": (5.0, 3.0), "DONE": (8.2, 3.0)}
info = {"IDLE": "00\nready_out=1\nvalid_out=0", "COMPUTE": "01\nout_en=1\nready_out=0",
        "DONE": "10\nready_out=1\nvalid_out=1"}
for name, (x, y) in S.items():
    ax.add_patch(Circle((x, y), 1.0, fc="#eef4fc", ec=SERIES[0], lw=1.4))
    ax.text(x, y + 0.35, name, ha="center", va="center", fontsize=8.5, fontweight="bold", color=INK)
    ax.text(x, y - 0.3, info[name], ha="center", va="center", fontsize=6.5, color=INK2)
arrow(ax, (2.8, 3.3), (4.0, 3.3), "valid_in", ty=3.4)
arrow(ax, (6.0, 3.3), (7.2, 3.3), "1", ty=3.4)
arrow(ax, (7.5, 2.3), (5.6, 2.2), "valid_in", rad=-0.35, tx=6.6, ty=1.55)
arrow(ax, (7.6, 3.85), (2.4, 3.85), "!valid_in", rad=0.35, tx=5.0, ty=5.05)
arrow(ax, (0.88, 3.4), (0.88, 2.6), None, rad=1.6)
ax.text(-0.55, 3.0, "!valid_in", fontsize=6.5, color=INK2, ha="left", va="center")
ax.text(1.8, 0.75, "rst_n=0 -> IDLE (async)", ha="center", fontsize=6.5, color=INK2)
ax.text(5.0, 0.3, "illegal 11 -> IDLE after one edge, valid_out=0;  ld_en = valid_in & ready_out",
        ha="center", fontsize=6.8, color=MUTED)
save(fig, "fsm.png")
