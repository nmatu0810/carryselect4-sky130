#!/usr/bin/env python3
"""wave_case2.png (first 12 cycles of case2) and wave_case4.png (async reset while running)."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from style import ROOT  # noqa: E402
from vcd_plot import plot  # noqa: E402

TB = "tb_top."
IO = [("clk", "clk"), ("valid_in", "valid_in"), ("ready_out", "ready_out"), ("data_in[8:0]", "data_in"),
      ("valid_out", "valid_out"), ("data_out[4:0]", "data_out")]

plot(ROOT / "verif/out/case2.vcd", "wave_case2.png", 40, 160, [(TB + s, l) for s, l in IO],
     marks=[(55, "accept (k)"), (75, "valid_out @ k+2"), (95, "next result")],
     title="Case 2: back-to-back transactions, latency 2 cycles, 1 result / 2 cycles")
plot(ROOT / "verif/out/case4.vcd", "wave_case4.png", 85, 290,
     [(TB + "clk", "clk"), (TB + "rst_n", "rst_n"), (TB + "valid_in", "valid_in"),
      (TB + "dut.u_ctrl.state[1:0]", "state"), (TB + "ready_out", "ready_out"),
      (TB + "valid_out", "valid_out"), (TB + "data_out[4:0]", "data_out")],
     marks=[(98, "(a) reset in COMPUTE"), (248, "(b) reset in DONE")],
     title="Case 4: asynchronous reset (a) in COMPUTE, (b) in DONE: no spurious valid_out")
