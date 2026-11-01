"""Small helpers for box-and-arrow diagrams."""
from matplotlib.patches import FancyArrowPatch, FancyBboxPatch

from style import INK, INK2, MUTED


def box(ax, x, y, w, h, text, fc="#eef4fc", ec="#2a78d6", fs=8, bold=False):
    ax.add_patch(FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.02,rounding_size=0.08",
                                fc=fc, ec=ec, lw=1.2))
    ax.text(x + w / 2, y + h / 2, text, ha="center", va="center", fontsize=fs, color=INK,
            fontweight="bold" if bold else "normal")


def arrow(ax, p0, p1, text=None, color=MUTED, lw=1.2, tx=None, ty=None, fs=7, ha="center", rad=0.0, ls="-"):
    ax.add_patch(FancyArrowPatch(p0, p1, arrowstyle="-|>", mutation_scale=9, color=color, lw=lw,
                                 connectionstyle=f"arc3,rad={rad}", linestyle=ls))
    if text:
        x = tx if tx is not None else (p0[0] + p1[0]) / 2
        y = ty if ty is not None else (p0[1] + p1[1]) / 2 + 0.08
        ax.text(x, y, text, ha=ha, va="bottom", fontsize=fs, color=INK2)


def canvas(plt, w, h, xlim, ylim):
    fig, ax = plt.subplots(figsize=(w, h))
    ax.set_xlim(*xlim)
    ax.set_ylim(*ylim)
    ax.set_aspect("equal")
    ax.axis("off")
    return fig, ax
