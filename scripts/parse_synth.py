#!/usr/bin/env python3
"""Parse Yosys `stat` and OpenSTA logs of Task 6 and write the synth.* / sta.synth.* metrics.

Usage (from the repo root, LIB_TT in the environment):
    parse_synth.py synth   # reads syn/out/carryselect4_top.stat.txt and the netlist
    parse_synth.py sta     # reads syn/out/sta.log, writes results/logs/t6_sta.txt

Yosys 0.66 prints one `stat` table per module (local cells + instance counts of
submodules) and a trailing "design hierarchy" block. The totals for the top module
are rebuilt here by walking the hierarchy (sum over instances x module totals), then
cross-checked against Yosys' own "Chip area for top module" line and the design
hierarchy totals. Any mismatch aborts with exit code 1.
"""
import os
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from metrics import set_metric  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
STAT = ROOT / "syn/out/carryselect4_top.stat.txt"
NETLIST = ROOT / "syn/out/carryselect4_top.syn.v"
STA_LOG = ROOT / "syn/out/sta.log"
T6_LOG = ROOT / "results/logs/t6_sta.txt"
TOP = "carryselect4_top"
AREA_TOL = 0.01  # um^2; Yosys prints 3 decimals


def die(msg):
    sys.stderr.write(f"parse_synth: ERROR: {msg}\n")
    sys.exit(1)


# ----------------------------------------------------------------------------- synth
def parse_stat(text):
    """Return (modules, hier_ref, chip_area_top)."""
    modules = {}  # name -> {"cells": {type: (count, area)}, "subs": {name: count}, "local_area": float}
    hier_ref = None
    chip_area_top = None
    parts = re.split(r"^=== (.+?) ===$", text, flags=re.M)
    # parts = [pre, name1, body1, name2, body2, ...]
    for name, body in zip(parts[1::2], parts[2::2]):
        cells, subs = {}, {}
        in_subs = False
        cells_line = None
        for line in body.splitlines():
            if re.match(r"^\s+\d+\s+-\s+submodules\s*$", line):
                in_subs = True
                continue
            if in_subs:
                m = re.match(r"^\s+(\d+)\s+-\s+(\S+)\s*$", line)
                if m:
                    subs[m.group(2)] = int(m.group(1))
                    continue
                in_subs = False
            m = re.match(r"^\s+(\d+)\s+([\d.]+)\s+(sky130_\S+)\s*$", line)
            if m:
                cells[m.group(3)] = (int(m.group(1)), float(m.group(2)))
                continue
            m = re.match(r"^\s+(\d+)\s+([\d.]+)\s+cells\s*$", line)
            if m:
                cells_line = (int(m.group(1)), float(m.group(2)))
            m = re.search(r"Chip area for top module '\\?(\S+?)':\s+([\d.]+)", line)
            if m:
                chip_area_top = (m.group(1), float(m.group(2)))
        if name == "design hierarchy":
            hier_ref = {"cells_line": cells_line, "types": cells}
            continue
        local_cells = sum(c for c, _ in cells.values())
        local_area = sum(a for _, a in cells.values())
        if cells_line and (cells_line[0] != local_cells or abs(cells_line[1] - local_area) > AREA_TOL):
            die(f"module {name}: 'cells' line {cells_line} != sum of its cell rows ({local_cells}, {local_area:.3f})")
        modules[name] = {"cells": cells, "subs": subs, "local_area": local_area}
    return modules, hier_ref, chip_area_top


def totals(modules, name, memo):
    """(cell_count, area, {type: count}) for a module including its submodules."""
    if name in memo:
        return memo[name]
    if name not in modules:
        die(f"hierarchy refers to module '{name}' that has no stat table")
    m = modules[name]
    count = sum(c for c, _ in m["cells"].values())
    area = m["local_area"]
    types = {t: c for t, (c, _) in m["cells"].items()}
    for sub, n in m["subs"].items():
        sc, sa, st = totals(modules, sub, memo)
        count += n * sc
        area += n * sa
        for t, c in st.items():
            types[t] = types.get(t, 0) + n * c
    memo[name] = (count, area, types)
    return memo[name]


def nand2_area_from_lib(lib):
    text = Path(lib).read_text(errors="replace")
    i = text.find('cell ("sky130_fd_sc_hd__nand2_1")')
    if i < 0:
        die("sky130_fd_sc_hd__nand2_1 not found in liberty")
    m = re.search(r"\barea\s*:\s*([\d.]+)", text[i:])
    if not m:
        die("area of sky130_fd_sc_hd__nand2_1 not found")
    return float(m.group(1))


def do_synth():
    lib = os.environ.get("LIB_TT")
    if not lib or not Path(lib).is_file():
        die("LIB_TT is not set (source scripts/env.sh)")
    if not STAT.is_file() or not NETLIST.is_file():
        die("run Yosys first (make synth)")

    # D-6: fa and mux2 must survive as separate modules in the netlist
    net = NETLIST.read_text()
    for mod in ("fa", "mux2"):
        if not re.search(rf"^module {mod}\b", net, flags=re.M):
            die(f"netlist lost module '{mod}' (keep_hierarchy not honoured)")

    modules, hier_ref, chip_top = parse_stat(STAT.read_text())
    if TOP not in modules:
        die(f"no stat table for {TOP}")
    count, area, types = totals(modules, TOP, {})

    # cross-checks against what Yosys itself reports
    if chip_top is None or chip_top[0] != TOP:
        die("'Chip area for top module' line not found")
    if abs(area - chip_top[1]) > AREA_TOL:
        die(f"area mismatch: rebuilt {area:.3f} vs Yosys top-module {chip_top[1]:.3f}")
    if hier_ref is not None:
        cl = hier_ref["cells_line"]
        if cl is None or cl[0] != count or abs(cl[1] - area) > AREA_TOL:
            die(f"design hierarchy totals {cl} != rebuilt ({count}, {area:.3f})")
        if {t: c for t, (c, _) in hier_ref["types"].items()} != types:
            die(f"per-cell-type totals differ: yosys={hier_ref['types']} rebuilt={types}")
        if abs(sum(a for _, a in hier_ref["types"].values()) - area) > 0.05:
            die("sum of design-hierarchy cell rows != total area")

    area = chip_top[1]  # rebuilt value agrees within AREA_TOL; use Yosys' exact figure
    ff = sum(c for t, c in types.items() if "df" in t)
    latch = sum(c for t, c in types.items() if "dlx" in t or "dlatch" in t)
    nand2 = nand2_area_from_lib(lib)

    set_metric("synth.top.cell_count", count)
    set_metric("synth.top.area_um2", round(area, 3))
    set_metric("synth.top.ff_count", ff)
    set_metric("synth.top.latch_count", latch)
    set_metric("synth.nand2_area_um2", nand2)
    set_metric("synth.top.nand2_eq", round(area / nand2, 3))
    print(f"synth: cells={count} area={area:.3f} um2 ff={ff} latch={latch} "
          f"nand2_eq={area / nand2:.3f} (nand2_1={nand2})")
    print("hierarchy modules in netlist: " +
          ", ".join(re.findall(r"^module (\w+)", net, flags=re.M)))


# ----------------------------------------------------------------------------- sta
def clean(name):
    """OpenSTA prints Yosys' `<wire>\\<celltype>` instance names; keep only the wire part."""
    return re.sub(r"\\+sky130\S*$", "", name.strip())


def split_sections(text):
    secs = {}
    for name, body in zip(*[iter(re.split(r"^=== (?:REPORT )?(\w+) ===$", text, flags=re.M)[1:])] * 2):
        secs[name] = body
    return secs


def parse_paths(body):
    """List of dicts: start, end, slack, arrival, lines."""
    paths = []
    chunks = re.split(r"(?m)^(?=Startpoint:)", body)
    for ch in chunks:
        if not ch.startswith("Startpoint:"):
            continue
        s = re.match(r"Startpoint:\s+(\S+)", ch)
        e = re.search(r"^Endpoint:\s+(\S+)", ch, flags=re.M)
        sl = re.search(r"^\s+(-?\d+\.\d+)\s+slack \((\w+)\)", ch, flags=re.M)
        ar = re.search(r"^\s+(-?\d+\.\d+)\s+data arrival time", ch, flags=re.M)
        if not (s and e and sl and ar):
            die("could not parse an OpenSTA path block")
        end = ch.index(sl.group(0)) + len(sl.group(0))
        paths.append({
            "start": clean(s.group(1)), "end": clean(e.group(1)),
            "slack": float(sl.group(1)), "arrival": float(ar.group(1)),
            "lines": ch[:end].splitlines(),
        })
    return paths


def do_sta():
    if not STA_LOG.is_file():
        die("run OpenSTA first (make sta)")
    text = STA_LOG.read_text()
    if "=== END ===" not in text or re.search(r"^Error", text, flags=re.M):
        die("sta.log incomplete or contains errors")
    secs = split_sections(text)
    for k in ("worst_setup", "worst_hold", "reg2reg", "summary"):
        if k not in secs:
            die(f"section {k} missing in sta.log")

    setup = parse_paths(secs["worst_setup"])
    hold = parse_paths(secs["worst_hold"])
    r2r = parse_paths(secs["reg2reg"])
    if not (setup and hold and r2r):
        die("no paths found in one of the reports")
    w_setup = min(setup, key=lambda p: p["slack"])
    w_hold = min(hold, key=lambda p: p["slack"])
    crit = min(r2r, key=lambda p: p["slack"])

    ms = re.search(r"worst slack max (-?\d+\.\d+)", secs["summary"])
    mh = re.search(r"worst slack min (-?\d+\.\d+)", secs["summary"])
    if not (ms and mh):
        die("report_worst_slack output not found")
    wns_setup, wns_hold = float(ms.group(1)), float(mh.group(1))
    if abs(wns_setup - w_setup["slack"]) > 0.002 or abs(wns_hold - w_hold["slack"]) > 0.002:
        die(f"worst slack ({wns_setup}/{wns_hold}) != slack of worst path "
            f"({w_setup['slack']}/{w_hold['slack']})")

    set_metric("sta.synth.wns_setup_ns", wns_setup)
    set_metric("sta.synth.wns_hold_ns", wns_hold)
    set_metric("sta.synth.crit_path", f"{crit['start']} -> {crit['end']}")
    set_metric("sta.synth.crit_arrival_ns", crit["arrival"])
    set_metric("sta.synth.worst_path", f"{w_setup['start']} -> {w_setup['end']}")

    # results/logs/t6_sta.txt (<= 60 lines): summary + full reg->reg path
    out = [
        "Task 6 STA (tt_025C_1v80, clk 10 ns, synthesized netlist, ideal clock)",
        f"worst setup (whole design): {w_setup['start']} -> {w_setup['end']}  slack {w_setup['slack']:.3f} ns",
        f"worst hold  (whole design): {w_hold['start']} -> {w_hold['end']}  slack {w_hold['slack']:.3f} ns",
        f"critical reg->reg: {crit['start']} -> {crit['end']}  arrival {crit['arrival']:.3f} ns  slack {crit['slack']:.3f} ns",
        "wns_* metrics hold the worst slack (positive when met), see DEVIATIONS D1",
        "--- full reg->reg setup path ---",
    ]
    body, blank = [], False
    for ln in crit["lines"]:
        if not ln.strip():
            if blank:
                continue
            blank = True
        else:
            blank = False
        body.append(ln.rstrip())
    out += body
    if len(out) > 60:
        out = out[:59] + ["... (truncated to 60 lines)"]
    T6_LOG.parent.mkdir(parents=True, exist_ok=True)
    T6_LOG.write_text("\n".join(out) + "\n")
    print("\n".join(out[:5]))


if __name__ == "__main__":
    if len(sys.argv) != 2 or sys.argv[1] not in ("synth", "sta"):
        die("usage: parse_synth.py synth|sta")
    do_synth() if sys.argv[1] == "synth" else do_sta()
