"""Shared figure style: 300 dpi, white background, English text, fixed categorical order."""
import json
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent.parent
FIG = ROOT / "docs" / "figures"
FIG.mkdir(parents=True, exist_ok=True)

# categorical slots, always assigned in this order (validated: scripts/validate_palette.js, light)
SERIES = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100"]
INK, INK2, MUTED, GRID = "#0b0b0b", "#52514e", "#898781", "#e4e3df"
HILITE = "#eb6834"      # emphasis colour (critical carry c2)

plt.rcParams.update({
    "figure.dpi": 100, "savefig.dpi": 300, "figure.facecolor": "white", "axes.facecolor": "white",
    "savefig.facecolor": "white", "font.family": "DejaVu Sans", "font.size": 9,
    "axes.edgecolor": MUTED, "axes.labelcolor": INK2, "xtick.color": INK2, "ytick.color": INK2,
    "axes.spines.top": False, "axes.spines.right": False, "axes.grid": False,
    "grid.color": GRID, "grid.linewidth": 0.6, "lines.linewidth": 1.5, "legend.frameon": False,
})


def metrics() -> dict:
    return json.loads((ROOT / "results" / "metrics.json").read_text())


def save(fig, name: str) -> None:
    out = FIG / name
    fig.savefig(out, bbox_inches="tight", pad_inches=0.05)
    plt.close(fig)
    print(f"wrote {out.relative_to(ROOT)}")
