#!/usr/bin/env python3
"""Generate the Magic layout of the 28T mirror full adder (fa_cell) from fa_cell.spice.

Writes custom/fa/out/fa_cell_gen.tcl; `make fa-layout` runs it in Magic and saves custom/fa/fa_cell.mag.

Floorplan (bottom -> top, um):
  VGND met1 rail over a full-width p-tap (psd + psc) row
  n-diffusion row (top edge aligned at YN1, devices grow downward)
  9 horizontal met1 routing tracks
  p-diffusion row (bottom edge aligned at YP0, devices grow upward), inside nwell
  VPWR met1 rail over a full-width n-tap (nsd + nsc) row, inside nwell
Columns: poly gates (vertical, shared by the pMOS and the mirrored nMOS) alternate with
source/drain node columns. A node column either gets a diffusion contact + vertical li strap
(to the rail, to its routing track, or straight through p->n when both sides are the same net)
or no contact (internal series node). Gate order = Euler paths documented in euler.md.
"""
import re
from pathlib import Path

HERE = Path(__file__).resolve().parent
NETLIST = HERE / "fa_cell.spice"
OUT = HERE / "out" / "fa_cell_gen.tcl"

PITCH = 1.0        # gate-to-gate pitch (one node column between)
HALF_DIFF = 0.34   # diffusion extent beyond an end-node centre
STRIP_GAP = 1.2    # node-centre distance across a diffusion break
CW = 0.17          # contact / li strap width
ENC = 0.06         # diffusion enclosure of contacts (y)
LI_EXT = 0.08      # li overlap of a diffusion contact on two opposite sides (li.5)
GATE_L = 0.15
ENDCAP = 0.13
YN1, YP0 = 2.10, 8.30            # n-row top edge, p-row bottom edge
TRACK_Y0, TRACK_PITCH = 2.80, 0.60
TRACKS = ["snz", "ncx", "Sb", "COb", "CI", "B", "A", "spz", "cpx"]  # bottom -> top
Y_GND, Y_PWR = 0.0, 11.60        # rail / tap centre lines
RAIL_H, TAP_H, BAND_H = 0.48, 0.55, 0.33
NWELL_ENC = 0.18

# Strips: node, (gate net, pfet name, nfet name), node, ...
# node = (p-side net, n-side net); None = internal series node (no contact)
STRIPS = [
    [("S", "S"), ("Sb", "XPI2", "XNI2"), ("VPWR", "VGND"), ("COb", "XPI1", "XNI1"), ("CO", "CO")],
    [("VPWR", "VGND"),
     ("A", "XPS1", "XNS1"), ("spz", "snz"), ("COb", "XPS4", "XNS4"), ("Sb", "Sb"),
     ("CI", "XPS7", "XNS7"), None, ("B", "XPS6", "XNS6"), None, ("A", "XPS5", "XNS5"),
     ("VPWR", "VGND"), ("B", "XPS2", "XNS2"), ("spz", "snz"), ("CI", "XPS3", "XNS3"),
     ("VPWR", "VGND"),
     ("B", "XPC2", "XNC2"), ("cpx", "ncx"), ("A", "XPC1", "XNC1"), ("VPWR", "VGND"),
     ("A", "XPC4", "XNC4"), None, ("B", "XPC5", "XNC5"), ("COb", "COb"), ("CI", "XPC3", "XNC3"),
     ("cpx", "ncx")],
]
PORTS = ["A", "B", "CI", "S", "CO", "VPWR", "VGND"]


def widths() -> dict[str, float]:
    w = {}
    for line in NETLIST.read_text().splitlines():
        m = re.match(r"^(X\S+)\s.*\bW=([0-9.]+)", line)
        if m:
            w[m.group(1)] = float(m.group(2))
    return w


def snap(v: float) -> float:
    return round(round(v / 0.005) * 0.005, 3)


class Tcl:
    def __init__(self):
        self.lines = []

    def rect(self, layer, x1, y1, x2, y2):
        x1, x2 = sorted((snap(x1), snap(x2)))
        y1, y2 = sorted((snap(y1), snap(y2)))
        self.lines.append(f"box {x1}um {y1}um {x2}um {y2}um; paint {layer}")

    def label(self, text, layer, x1, y1, x2, y2, port_index):
        self.lines.append(f"box {snap(x1)}um {snap(y1)}um {snap(x2)}um {snap(y2)}um")
        self.lines.append(f"label {text} c {layer}")
        self.lines.append(f"port make {port_index}")


def build() -> str:
    W = widths()
    t = Tcl()
    track_y = {n: TRACK_Y0 + i * TRACK_PITCH for i, n in enumerate(TRACKS)}
    conn = {n: [] for n in TRACKS}           # x positions that must reach each track
    strap_x = {}                              # through-strap x for S / CO (pins)
    x = 0.5
    xmin = xmax = None
    for si, strip in enumerate(STRIPS):
        if si:
            x += STRIP_GAP - PITCH
        nodes = strip[0::2]
        gates = strip[1::2]
        xs_node = [x + i * PITCH for i in range(len(nodes))]
        xs_gate = [x + PITCH / 2 + i * PITCH for i in range(len(gates))]
        wp = [W[g[1]] for g in gates]
        wn = [W[g[2]] for g in gates]
        x0, x1 = xs_node[0] - HALF_DIFF, xs_node[-1] + HALF_DIFF
        xmin = x0 if xmin is None else min(xmin, x0)
        xmax = x1 if xmax is None else max(xmax, x1)
        # diffusion: per node region, height = neighbour gate width; step at the node centre
        for i, xn in enumerate(xs_node):
            left = (xn - HALF_DIFF) if i == 0 else xn
            right = (xn + HALF_DIFF) if i == len(nodes) - 1 else xn
            if i > 0:   # left half belongs to gate i-1
                t.rect("pdiff", xn - PITCH / 2, YP0, xn, YP0 + wp[i - 1])
                t.rect("ndiff", xn - PITCH / 2, YN1 - wn[i - 1], xn, YN1)
            if i < len(gates):  # right half belongs to gate i
                t.rect("pdiff", xn, YP0, xn + PITCH / 2, YP0 + wp[i])
                t.rect("ndiff", xn, YN1 - wn[i], xn + PITCH / 2, YN1)
            if i == 0:
                t.rect("pdiff", left, YP0, xn, YP0 + wp[0])
                t.rect("ndiff", left, YN1 - wn[0], xn, YN1)
            if i == len(nodes) - 1:
                t.rect("pdiff", xn, YP0, right, YP0 + wp[-1])
                t.rect("ndiff", xn, YN1 - wn[-1], right, YN1)
        # gates
        for g, xg, p, n in zip(gates, xs_gate, wp, wn):
            t.rect("poly", xg - GATE_L / 2, YN1 - n - ENDCAP, xg + GATE_L / 2, YP0 + p + ENDCAP)
            ty = track_y[g[0]]
            t.rect("poly", xg - 0.165, ty - 0.165, xg + 0.165, ty + 0.165)
            t.rect("li", xg - CW / 2, ty - 0.185, xg + CW / 2, ty + 0.185)
            t.rect("pc", xg - CW / 2, ty - CW / 2, xg + CW / 2, ty + CW / 2)
            t.rect("mcon", xg - CW / 2, ty - CW / 2, xg + CW / 2, ty + CW / 2)
            conn[g[0]].append(xg)
        # node contacts and li straps
        for i, (node, xn) in enumerate(zip(nodes, xs_node)):
            if node is None:
                continue
            pnet, nnet = node
            nb = [j for j in (i - 1, i) if 0 <= j < len(gates)]
            wpmin, wnmin = min(wp[j] for j in nb), min(wn[j] for j in nb)
            pc_y1, pc_y2 = YP0 + ENC, YP0 + wpmin - ENC
            nc_y1, nc_y2 = YN1 - wnmin + ENC, YN1 - ENC
            cx1, cx2 = xn - CW / 2, xn + CW / 2
            if pnet == nnet:   # same net on both sides: one strap p -> n
                t.rect("li", cx1, nc_y1 - LI_EXT, cx2, pc_y2 + LI_EXT)
                if pnet in track_y:
                    ty = track_y[pnet]
                    t.rect("mcon", cx1, ty - CW / 2, cx2, ty + CW / 2)
                    conn[pnet].append(xn)
                else:
                    strap_x[pnet] = xn
            else:
                if pnet == "VPWR":
                    t.rect("li", cx1, pc_y1 - LI_EXT, cx2, Y_PWR)
                else:
                    ty = track_y[pnet]
                    t.rect("li", cx1, ty - 0.185, cx2, pc_y2 + LI_EXT)
                    t.rect("mcon", cx1, ty - CW / 2, cx2, ty + CW / 2)
                    conn[pnet].append(xn)
                if nnet == "VGND":
                    t.rect("li", cx1, Y_GND, cx2, nc_y2 + LI_EXT)
                else:
                    ty = track_y[nnet]
                    t.rect("li", cx1, nc_y1 - LI_EXT, cx2, ty + 0.185)
                    t.rect("mcon", cx1, ty - CW / 2, cx2, ty + CW / 2)
                    conn[nnet].append(xn)
            t.rect("pdc", cx1, pc_y1, cx2, pc_y2)
            t.rect("ndc", cx1, nc_y1, cx2, nc_y2)
        x = xs_node[-1] + PITCH
    # routing tracks
    for net, xs in conn.items():
        ty = track_y[net]
        t.rect("m1", min(xs) - 0.2, ty - 0.115, max(xs) + 0.2, ty + 0.115)
    # taps, li bands, rails, nwell
    tx1, tx2 = xmin, xmax
    for yc, tap, tapc in ((Y_GND, "psd", "psc"), (Y_PWR, "nsd", "nsc")):
        t.rect(tap, tx1, yc - TAP_H / 2, tx2, yc + TAP_H / 2)
        t.rect("li", tx1, yc - BAND_H / 2, tx2, yc + BAND_H / 2)
        xc = tx1 + 0.3
        while xc + CW <= tx2 - 0.3:
            t.rect(tapc, xc, yc - CW / 2, xc + CW, yc + CW / 2)
            t.rect("mcon", xc, yc - CW / 2, xc + CW, yc + CW / 2)
            xc += 0.68
        t.rect("m1", tx1, yc - RAIL_H / 2, tx2, yc + RAIL_H / 2)
    pmax = YP0 + max(W[n] for n in W if n.startswith("XP"))
    t.rect("nwell", tx1 - NWELL_ENC, YP0 - NWELL_ENC, tx2 + NWELL_ENC, Y_PWR + TAP_H / 2 + NWELL_ENC)
    assert pmax + 0.4 < Y_PWR - TAP_H / 2, "p row overlaps the n-tap row"
    # ports, in subckt order A B CI S CO VPWR VGND
    for i, net in enumerate(PORTS, 1):
        if net in ("A", "B", "CI"):
            xs = conn[net]
            ty = track_y[net]
            t.label(net, "m1", min(xs), ty - 0.115, min(xs) + 0.17, ty + 0.115, i)
        elif net in ("S", "CO"):
            xs = strap_x[net]
            ym = (YN1 + YP0) / 2
            t.label(net, "li", xs - CW / 2, ym - 0.1, xs + CW / 2, ym + 0.1, i)
        else:
            yc = Y_PWR if net == "VPWR" else Y_GND
            t.label(net, "m1", tx1, yc - RAIL_H / 2, tx1 + 0.5, yc + RAIL_H / 2, i)
    head = ["# generated by custom/fa/gen_layout.py from fa_cell.spice -- do not edit",
            "drc off", "load fa_cell -force", "select top cell", "delete",
            "box 0 0 0 0"]
    tail = ["drc on", "save custom/fa/fa_cell",
            "quit -noprompt"]
    return "\n".join(head + t.lines + tail) + "\n"


if __name__ == "__main__":
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(build())
    print(f"wrote {OUT}")
