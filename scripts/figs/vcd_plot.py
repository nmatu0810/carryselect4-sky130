#!/usr/bin/env python3
"""Plot digital waveforms from a VCD.

  vcd_plot.py <vcd> <out.png> <t0_ns> <t1_ns> sig[=label] [sig[=label] ...] [--mark t_ns:text ...]

Signals are full VCD names (e.g. tb_top.clk). 1-bit signals are drawn as steps; buses as
hex-valued segments. Times are in ns.
"""
import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from style import INK, INK2, MUTED, SERIES, plt, save  # noqa: E402
from vcdvcd import VCDVCD  # noqa: E402


def segments(tv, t0, t1, scale):
    """[(start_ns, end_ns, value)] clipped to [t0, t1]."""
    pts = [(t * scale, v) for t, v in tv]
    out = []
    for i, (t, v) in enumerate(pts):
        nxt = pts[i + 1][0] if i + 1 < len(pts) else t1
        a, b = max(t, t0), min(nxt, t1)
        if b > a:
            out.append((a, b, v))
    return out


def plot(vcd, out, t0, t1, sigs, marks=(), title=None):
    v = VCDVCD(str(vcd))
    scale = float(v.timescale["factor"]) * 1e9  # VCD ticks -> ns
    n = len(sigs)
    fig, ax = plt.subplots(figsize=(7.0, 0.42 * n + 0.6))
    for row, (name, label) in enumerate(sigs):
        y = n - 1 - row
        sig = v[name]
        width = int(sig.size) if hasattr(sig, "size") else 1
        segs = segments(sig.tv, t0, t1, scale)
        if width == 1:
            xs, ys = [], []
            for a, b, val in segs:
                lvl = 0.7 if val == "1" else 0.0
                xs += [a, b]
                ys += [y + lvl, y + lvl]
            ax.plot(xs, ys, color=SERIES[0], lw=1.2, drawstyle="default", solid_joinstyle="miter")
        else:
            for a, b, val in segs:
                ax.fill([a + 0.4, b - 0.4, b, b - 0.4, a + 0.4, a], [y + .7, y + .7, y + .35, y, y, y + .35],
                        facecolor="white", edgecolor=SERIES[0], lw=1.0)
                try:
                    txt = format(int(val, 2), "X")
                except ValueError:
                    txt = val
                if b - a > 4:
                    ax.text((a + b) / 2, y + 0.35, txt, ha="center", va="center", fontsize=7, color=INK)
        ax.text(t0 - (t1 - t0) * 0.01, y + 0.35, label, ha="right", va="center", fontsize=8, color=INK)
    for t, txt in marks:
        ax.axvline(t, color=MUTED, lw=0.8, ls="--")
        ax.text(t, n - 0.05, txt, ha="center", va="bottom", fontsize=7, color=INK2)
    ax.set_xlim(t0, t1)
    ax.set_ylim(-0.3, n + 0.35)
    ax.set_yticks([])
    ax.spines["left"].set_visible(False)
    ax.set_xlabel("time (ns)")
    if title:
        ax.set_title(title, fontsize=9, color=INK, loc="left")
    save(fig, Path(out).name)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("vcd"); ap.add_argument("out")
    ap.add_argument("t0", type=float); ap.add_argument("t1", type=float)
    ap.add_argument("signals", nargs="+")
    ap.add_argument("--mark", action="append", default=[])
    ap.add_argument("--title")
    a = ap.parse_args()
    sigs = [(s.split("=", 1)[0], s.split("=", 1)[1] if "=" in s else s.split(".")[-1]) for s in a.signals]
    marks = [(float(m.split(":", 1)[0]), m.split(":", 1)[1]) for m in a.mark]
    plot(a.vcd, a.out, a.t0, a.t1, sigs, marks, a.title)


if __name__ == "__main__":
    main()
