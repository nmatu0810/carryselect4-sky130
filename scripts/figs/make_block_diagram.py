#!/usr/bin/env python3
"""block_diagram.png: registered datapath (9-bit input bank, CSLA-4, 5-bit output bank) + Moore FSM."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from diagram import arrow, box, canvas  # noqa: E402
from style import INK2, SERIES, plt, save  # noqa: E402

fig, ax = canvas(plt, 7.0, 3.3, (0, 10.6), (0, 5.0))
box(ax, 1.4, 2.7, 1.6, 1.5, "Input bank\n9 FF\n(en = ld_en)")
box(ax, 4.0, 2.7, 2.2, 1.5, "CSLA-4\n(2+2 carry-select)", fc="#fdeee7", ec=SERIES[1], bold=True, fs=7.5)
box(ax, 7.2, 2.7, 1.6, 1.5, "Output bank\n5 FF\n(en = out_en)")
box(ax, 3.8, 0.3, 2.6, 1.3, "Controller\nMoore FSM, 2 FF\nIDLE/COMPUTE/DONE", fc="#e9f7f1", ec=SERIES[2], fs=7.5)
arrow(ax, (0.2, 3.45), (1.4, 3.45), "data_in[8:0]", tx=0.75)
ax.text(0.75, 3.15, "{cin, b, a}", ha="center", va="top", fontsize=6.5, color=INK2)
arrow(ax, (3.0, 3.6), (4.0, 3.6), "a, b", tx=3.5)
arrow(ax, (3.0, 3.2), (4.0, 3.2), "cin", tx=3.5, ty=2.9)
arrow(ax, (6.2, 3.45), (7.2, 3.45), "sum\ncout", tx=6.7, fs=6.5)
arrow(ax, (8.8, 3.45), (10.4, 3.45), "data_out[4:0]", tx=9.6)
arrow(ax, (0.2, 0.95), (3.8, 0.95), "valid_in", tx=0.9)
arrow(ax, (6.4, 1.25), (10.4, 1.25), "ready_out", tx=9.6)
arrow(ax, (6.4, 0.65), (10.4, 0.65), "valid_out", tx=9.6)
arrow(ax, (4.3, 1.6), (2.2, 2.7), "ld_en =\nvalid_in & ready_out", tx=0.3, ty=1.75, ha="left", rad=0.15)
arrow(ax, (5.9, 1.6), (8.0, 2.7), "out_en", tx=7.5, ty=2.05, rad=-0.15)
ax.text(5.1, 4.7, "clk (posedge), rst_n (async, active low) to all 16 FF", ha="center", fontsize=7, color=INK2)
save(fig, "block_diagram.png")
