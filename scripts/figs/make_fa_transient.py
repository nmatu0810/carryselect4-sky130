#!/usr/bin/env python3
"""fa_transient.png: post-layout transient of A0 and CO1 (custom/fa/out/fa_transient.dat from path_post.sp)."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from style import INK, INK2, ROOT, SERIES, metrics, plt, save  # noqa: E402

dat = ROOT / "custom/fa/out/fa_transient.dat"
t, a0, co1 = [], [], []
for line in dat.read_text().split("\n"):
    f = line.split()
    if len(f) >= 4:
        t.append(float(f[0]) * 1e9); a0.append(float(f[1])); co1.append(float(f[3]))
m = metrics()
fig, ax = plt.subplots(figsize=(5.2, 2.4))
ax.plot(t, a0, color=SERIES[0], lw=1.5, label="A0 (input)")
ax.plot(t, co1, color=SERIES[1], lw=1.5, label="CO1 (carry out, 10.2 fF load)")
ax.axhline(0.9, color="#898781", lw=0.6, ls="--")
ax.text(1.25, 0.95, "50% VDD", ha="center", fontsize=6.5, color=INK2)
ax.set_xlim(0, 4)
ax.set_xlabel("time (ns)")
ax.set_ylabel("V")
ax.legend(fontsize=7, loc="upper center", bbox_to_anchor=(0.5, -0.28), ncol=2)
ax.set_title(f"Post-layout D-9 path, tpd = {m['spice.D_post_ps']:.0f} ps (mean of rise/fall)",
             fontsize=8.5, color=INK, loc="left")
save(fig, "fa_transient.png")
