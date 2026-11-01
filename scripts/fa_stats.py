#!/usr/bin/env python3
"""Statistics of the full-custom FA layout (custom/fa/fa_cell.mag) -> fa.* keys.

  fa.width_um, fa.height_um, fa.area_um2  bounding box from Magic (`units microns; box values`)
  fa.ntrans                               devices in the Magic extraction (ext2spice)
  fa.drc_errors                           DRC_COUNT printed by custom/fa/drc.tcl (drc(full))
  fa.taps                                 connected tap regions (nsubdiff/psubdiff + their contacts)
Also checks latch-up spacing: every ndiff/pdiff tile must lie within LU_MAX_UM of a p-tap / n-tap
(sky130 LU.2 / LU.3: < 15 um) and prints the worst distance.
"""
import os
import re
import subprocess
import sys
from itertools import combinations
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
import metrics  # noqa: E402

MAG = ROOT / "custom" / "fa" / "fa_cell.mag"
OUT = ROOT / "custom" / "fa" / "out"
UNIT_UM = 0.005          # .mag coordinates with "magscale 1 2"
LU_MAX_UM = 15.0


def magic(script: str) -> str:
    rc = Path(os.environ["PDK_ROOT"], "sky130A/libs.tech/magic/sky130A.magicrc")
    r = subprocess.run(["magic", "-dnull", "-noconsole", "-rcfile", str(rc)], input=script,
                       capture_output=True, text=True, cwd=ROOT)
    return r.stdout + r.stderr


def mag_rects() -> dict[str, list[tuple[int, int, int, int]]]:
    layers, cur = {}, None
    for line in MAG.read_text().splitlines():
        m = re.match(r"^<< (\S+) >>", line)
        if m:
            cur = m.group(1)
            continue
        m = re.match(r"^rect (-?\d+) (-?\d+) (-?\d+) (-?\d+)", line)
        if m and cur:
            layers.setdefault(cur, []).append(tuple(map(int, m.groups())))
    return layers


def touch(a, b) -> bool:
    return a[0] <= b[2] and b[0] <= a[2] and a[1] <= b[3] and b[1] <= a[3]


def regions(rects) -> list[list[tuple]]:
    parent = list(range(len(rects)))

    def find(i):
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i

    for i, j in combinations(range(len(rects)), 2):
        if touch(rects[i], rects[j]):
            parent[find(i)] = find(j)
    groups = {}
    for i, r in enumerate(rects):
        groups.setdefault(find(i), []).append(r)
    return list(groups.values())


def dist(a, b) -> float:
    dx = max(0, b[0] - a[2], a[0] - b[2])
    dy = max(0, b[1] - a[3], a[1] - b[3])
    return (dx * dx + dy * dy) ** 0.5 * UNIT_UM


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    out = magic(f"""load custom/fa/fa_cell
units microns
select top cell
puts "BBOX [box values]"
cd {OUT}
extract all
ext2spice -o fa_cell_stats.spice
quit -noprompt
""")
    bb = re.search(r"BBOX (\S+) (\S+) (\S+) (\S+)", out)
    if not bb:
        raise SystemExit(out)
    x1, y1, x2, y2 = map(float, bb.groups())
    spice = (OUT / "fa_cell_stats.spice").read_text()
    ntrans = len(re.findall(r"^X\S+ .*sky130_fd_pr__[np]fet", spice, re.M))

    drc = magic(Path(ROOT / "custom/fa/drc.tcl").read_text().replace("quit -noprompt", "") + "\nquit -noprompt\n")
    m = re.search(r"DRC_COUNT (\d+)", drc)
    if not m:
        raise SystemExit(drc)
    drc_errors = int(m.group(1))

    L = mag_rects()
    ntap = L.get("nsubdiff", []) + L.get("nsubdiffcont", [])
    ptap = L.get("psubdiff", []) + L.get("psubdiffcont", [])
    taps = len(regions(ntap)) + len(regions(ptap))
    nd = L.get("ndiff", []) + L.get("ndiffc", []) + L.get("nmos", [])
    pd = L.get("pdiff", []) + L.get("pdiffc", []) + L.get("pmos", [])
    lu_n = max(min(dist(r, t) for t in ptap) for r in nd)
    lu_p = max(min(dist(r, t) for t in ntap) for r in pd)
    print(f"latch-up: worst ndiff->ptap {lu_n:.2f} um, pdiff->ntap {lu_p:.2f} um (limit {LU_MAX_UM} um)")
    if max(lu_n, lu_p) >= LU_MAX_UM:
        raise SystemExit("latch-up spacing violated")

    w, h = x2 - x1, y2 - y1
    res = {
        "fa.width_um": round(w, 3), "fa.height_um": round(h, 3), "fa.area_um2": round(w * h, 2),
        "fa.ntrans": ntrans, "fa.drc_errors": drc_errors, "fa.taps": taps,
    }
    for k, v in res.items():
        metrics.set_metric(k, v)
        print(f"{k} = {v}")


if __name__ == "__main__":
    main()
