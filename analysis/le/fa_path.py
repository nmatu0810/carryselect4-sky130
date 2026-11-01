#!/usr/bin/env python3
"""Logical Effort of the D-9 path and LE-driven sizing of the 28T FA.

Path (N = 4): A0 -> FA0 carry gate -> inv -> CO0 -> FA1 carry gate -> inv -> CO1 (load 3*C_mux.S)
  g = [g_carry, g_inv, g_carry, g_inv] = [2, 1, 2, 1]
  p = [p_carry, pinv, p_carry, pinv];  p_carry measured (carry gate alone, unloaded) / tau
  b (from transistor widths of fa_cell_s1.spice):
    b1 = b3 = (C_inv_CO.in + C_sumgate.COb) / C_inv_CO.in   COb feeds the CO inverter and the sum gate
    b2      = (C_carry.CI + C_sumgate.CI) / C_carry.CI      CO0 feeds FA1's carry gate and sum gate
    b4      = 1                                              all of the CO1 load is the path load
  H = C_load / C_in(A),  C_in(A) = carry-gate A pins of FA0, C_load = 3 * le.c_mux_s_ff
Gate capacitance per um width: Cg = C_A(sky130_fd_sc_hd__inv_1, tt liberty) / (Wn + Wp of inv_1 in
the PDK spice) = 2.302 fF / 1.65 um = 1.395 fF/um (read at run time).

Sizing S2 = S1 with the CO inverter replaced by the optimal last-stage size from optimal_sizes()
(the stage that drives the real load). Both sizings are simulated with sim/path_pre.sp; the faster
one is kept, or the smaller one (sum of W) if the delays differ by < 3 %.
"""
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
FA = ROOT / "custom" / "fa"
OUT = FA / "out"
sys.path.insert(0, str(ROOT / "scripts"))
sys.path.insert(0, str(HERE))
import metrics  # noqa: E402
from le_calc import optimal_sizes, path_effort, stage_effort  # noqa: E402

DEV = re.compile(r"^(X\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(sky130_fd_pr__\S+)\s+W=([0-9.]+)", re.I)


def devices(netlist: Path) -> list[dict]:
    out = []
    for line in netlist.read_text().splitlines():
        m = DEV.match(line.strip())
        if m:
            name, d, g, s, b, model, w = m.groups()
            out.append(dict(name=name, d=d, g=g, s=s, b=b, model=model, w=float(w)))
    return out


def gate_w(devs, prefixes, net) -> float:
    return sum(x["w"] for x in devs if x["name"].startswith(prefixes) and x["g"] == net)


def cg_ff_per_um() -> float:
    lib = Path(os.environ["LIB_TT"]).read_text()
    i = lib.index('cell ("sky130_fd_sc_hd__inv_1")')
    cell = lib[i : lib.index('cell ("', i + 10)]
    cap = float(re.search(r"capacitance\s*:\s*([0-9.]+)", cell[cell.index('pin ("A")') :]).group(1))
    spice = Path(os.environ["PDK_ROOT"], "sky130A/libs.ref/sky130_fd_sc_hd/spice/sky130_fd_sc_hd.spice").read_text()
    sub = spice[spice.index(".subckt sky130_fd_sc_hd__inv_1 ") :]
    sub = sub[: sub.index(".ends")]
    wsum = sum(float(w) / 1e6 for w in re.findall(r"w=([0-9.e+]+)u", sub))
    return cap * 1000.0 / wsum


def ngspice(netlist: Path) -> str:
    r = subprocess.run(["ngspice", "-b", str(netlist)], capture_output=True, text=True)
    netlist.with_suffix(".log").write_text(r.stdout + r.stderr)
    return r.stdout


def meas(text: str, name: str) -> float:
    m = re.search(rf"^{name}\s*=\s*([-+0-9.eE]+)", text, re.M)
    if not m:
        raise SystemExit(f"ngspice: no measurement {name}")
    return float(m.group(1))


def p_carry_tau(s1: Path, tau_ps: float) -> float:
    """Carry gate alone (10T from fa_cell), COb unloaded; A switches with B=1, CI=0 so COb = ~A."""
    carry = [l for l in s1.read_text().splitlines() if re.match(r"^X[PN]C\d", l)]
    net = "\n".join([
        "* carry gate alone, output unloaded (p_carry)",
        ".lib $PDK_ROOT/sky130A/libs.tech/ngspice/sky130.lib.spice tt",
        ".temp 27",
        ".subckt carry A B CI COb VPWR VGND", *carry, ".ends",
        "VDD vdd 0 1.8", "VIN in 0 PULSE(1.8 0 200p 30p 30p 1.5n 3.2n)",
        "* unit-inverter predriver; A pin of the carry gate is 4x unit cap -> FO4 slope",
        "XDN a in 0 0 sky130_fd_pr__nfet_01v8 W=0.42 L=0.15",
        "XDP a in vdd vdd sky130_fd_pr__pfet_01v8 W=0.84 L=0.15",
        "VB b 0 1.8", "VC ci 0 0",
        "XC a b ci cob vdd 0 carry",
        ".tran 1p 4n", ".control", "run",
        "meas tran tpdf TRIG v(a) VAL=0.9 RISE=1 TARG v(cob) VAL=0.9 FALL=1",
        "meas tran tpdr TRIG v(a) VAL=0.9 FALL=1 TARG v(cob) VAL=0.9 RISE=1",
        "quit", ".endc", ".end"])
    f = OUT / "carry_unloaded.sp"
    f.write_text(net + "\n")
    t = ngspice(f)
    return (meas(t, "tpdr") + meas(t, "tpdf")) / 2 * 1e12 / tau_ps


def path_delay_ps(cell: Path) -> float:
    src = (FA / "sim" / "path_pre.sp").read_text().replace(".include ../fa_cell.spice", f".include {cell}")
    f = OUT / f"path_pre_{cell.stem}.sp"
    f.write_text(src)
    t = ngspice(f)
    return (meas(t, "tpdr") + meas(t, "tpdf")) / 2 * 1e12


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    tau = metrics.get_metric("le.tau_ps")
    pinv = metrics.get_metric("le.pinv")
    wn_u, wp_u = metrics.get_metric("le.wn_unit_um"), metrics.get_metric("le.wp_unit_um")
    c_load = 3 * metrics.get_metric("le.c_mux_s_ff")
    cg = cg_ff_per_um()

    s1 = FA / "fa_cell_s1.spice"
    d = devices(s1)
    if len(d) != 28:
        raise SystemExit(f"expected 28 devices in {s1}, got {len(d)}")
    c_in_a = cg * gate_w(d, ("XPC", "XNC"), "A")
    c_inv_co = cg * gate_w(d, ("XPI1", "XNI1"), "COb")
    c_sum_cob = cg * gate_w(d, ("XPS", "XNS"), "COb")
    c_carry_ci = cg * gate_w(d, ("XPC", "XNC"), "CI")
    c_sum_ci = cg * gate_w(d, ("XPS", "XNS"), "CI")

    g = [2.0, 1.0, 2.0, 1.0]
    b1 = (c_inv_co + c_sum_cob) / c_inv_co
    b2 = (c_carry_ci + c_sum_ci) / c_carry_ci
    b = [b1, b2, b1, 1.0]
    N = 4
    H = c_load / c_in_a
    F = path_effort(g, b, H)
    fhat = stage_effort(F, N)
    p_carry = p_carry_tau(s1, tau)
    P = 2 * p_carry + 2 * pinv
    D_tau = N * fhat + P
    G, B = 4.0, b1 * b2 * b1

    sizes = optimal_sizes(g, b, c_in_a, c_load)
    m_co = sizes[3] / (cg * (wn_u + wp_u))  # last-stage inverter, in multiples of the unit inverter
    wn2, wp2 = round(wn_u * m_co, 2), round(wp_u * m_co, 2)
    s2 = FA / "fa_cell_s2.spice"
    txt = s1.read_text().replace("sizing S1 (", "sizing S2 = S1 + LE-sized CO inverter (")
    txt = re.sub(r"^(XPI1 .* W=)[0-9.]+", rf"\g<1>{wp2}", txt, flags=re.M)
    txt = re.sub(r"^(XNI1 .* W=)[0-9.]+", rf"\g<1>{wn2}", txt, flags=re.M)
    txt = txt.replace("* ---- output inverters (unit) ----",
                      f"* ---- output inverters: CO inverter = {m_co:.2f} x unit (optimal_sizes, stage 4) ----")
    s2.write_text(txt)

    d1, d2 = path_delay_ps(s1), path_delay_ps(s2)
    area1 = sum(x["w"] for x in d)
    area2 = sum(x["w"] for x in devices(s2))
    if abs(d1 - d2) / min(d1, d2) < 0.03:
        chosen = "S1" if area1 <= area2 else "S2"
    else:
        chosen = "S1" if d1 < d2 else "S2"
    shutil.copyfile(s1 if chosen == "S1" else s2, FA / "fa_cell.spice")

    out = {
        "le.p_carry": round(p_carry, 3),
        "le.G": G, "le.B": round(B, 3), "le.H": round(H, 3), "le.F": round(F, 3), "le.N": N,
        "le.fhat": round(fhat, 3), "le.D_est_tau": round(D_tau, 3), "le.D_est_ps": round(D_tau * tau, 2),
        "fa.s1.delay_pre_ps": round(d1, 2), "fa.s2.delay_pre_ps": round(d2, 2),
        "fa.sizing_chosen": chosen,
    }
    print(f"Cg = {cg:.3f} fF/um; C_in(A) = {c_in_a:.2f} fF; C_load = {c_load:.2f} fF")
    print(f"b1 = b3 = {b1:.3f}, b2 = {b2:.3f}; stage input caps (fF) = {[round(x, 2) for x in sizes]}")
    print(f"S2 CO inverter = {m_co:.2f} x unit (Wn={wn2}, Wp={wp2}); sum W: S1={area1:.2f} S2={area2:.2f} um")
    for k, v in out.items():
        metrics.set_metric(k, v)
        print(f"{k} = {v}")


if __name__ == "__main__":
    main()
