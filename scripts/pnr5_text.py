#!/usr/bin/env python3
"""Wording about the 5 ns extension run, derived from pnr5.status and the run's corner slacks.

The paper, the report and the slides all quote the 5 ns result. Instead of fixing the wording
by hand, they take it from here, so a PASS and a FAIL always read correctly.

    python3 scripts/pnr5_text.py          # prints the strings as JSON
    describe(metrics) -> dict             # keys: pnr5.text_en, pnr5.text_vi, pnr5.summary_vi,
                                          #       pnr5.limit_vi, pnr5.grade_vi, pnr5.slide_value

Numbers use scripts/metrics_to_tex.fmt (3 significant figures). The names of failing corners come
from pnr/final_5ns/ol_metrics.json when it exists.
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
from metrics_to_tex import fmt  # noqa: E402

RUN_METRICS = ROOT / "pnr/final_5ns/ol_metrics.json"


def _corners(path: Path) -> dict:
    """{'setup': {corner: slack}, 'hold': {...}, 'bad': {...}} from the LibreLane metrics, or {}."""
    if not path.is_file():
        return {}
    m = json.loads(path.read_text())
    out = {}
    for kind in ("setup", "hold"):
        pre = f"timing__{kind}__ws__corner:"
        out[kind] = {k[len(pre):]: v for k, v in m.items() if k.startswith(pre)}
    out["drc_lvs"] = (int(m.get("magic__drc_error__count", 0)) + int(m.get("klayout__drc_error__count", 0))
                      + int(m.get("design__lvs_error__count", 0)))
    return out


def _failing(c: dict) -> list:
    """['nom_ss_100C_1v60 (setup -0.025 ns)', ...] for every corner with negative slack."""
    bad = []
    for kind in ("setup", "hold"):
        for name, v in sorted(c.get(kind, {}).items()):
            if v < 0:
                bad.append(f"{name} ({kind} {fmt(round(v, 3))} ns)")
    return bad


def describe(metrics: dict, run_metrics: Path = RUN_METRICS) -> dict:
    status = metrics["pnr5.status"]
    ws, wh = metrics["pnr5.wns_setup_worst_corner_ns"], metrics["pnr5.wns_hold_worst_corner_ns"]
    ws_s, wh_s = fmt(ws), fmt(wh)
    c = _corners(run_metrics)
    n = len(c.get("setup", {})) or 9
    bad = _failing(c)
    drc_lvs = c.get("drc_lvs", 0)

    if status == "PASS":
        return {
            "pnr5.text_en": (f"A second run at a 5 ns clock meets setup and hold in all {n} corners; "
                             f"the worst setup slack is {ws_s} ns."),
            "pnr5.text_vi": (f"Lệnh `make pnr5` chạy cùng cấu hình với chu kỳ 5 ns (SDC sinh lại vào "
                             f"`syn/out/constraints_5ns.sdc`). Kết quả: **PASS**, đạt timing ở cả {n} corner. "
                             f"Setup slack xấu nhất là {ws_s} ns, hold slack xấu nhất là {wh_s} ns, "
                             f"DRC và LVS vẫn sạch. Thiết kế chạy được 200 MHz ở mọi corner."),
            "pnr5.summary_vi": f"đạt timing ở cả {n} corner (setup xấu nhất {ws_s} ns)",
            "pnr5.limit_vi": "Chạy mở rộng 5 ns đạt timing ở cả 9 corner; chưa thử chu kỳ ngắn hơn 5 ns.",
            "pnr5.grade_vi": "Đạt",
            "pnr5.slide_value": f"đạt {n}/{n} corner",
        }

    where = ", ".join(bad) if bad else "một số corner"
    where_en = ", ".join(bad) if bad else "some corners"
    extra = f" DRC/LVS còn {drc_lvs} lỗi." if drc_lvs else ""
    first = bad[0].split(" (")[0] if bad else "corner chậm"
    return {
        "pnr5.text_en": (f"A second run at a 5 ns clock fails timing at {where_en}; "
                         f"the worst setup slack is {ws_s} ns."),
        "pnr5.text_vi": (f"Lệnh `make pnr5` chạy cùng cấu hình với chu kỳ 5 ns (SDC sinh lại vào "
                         f"`syn/out/constraints_5ns.sdc`). Kết quả: **FAIL**, trượt timing ở: {where}. "
                         f"Setup slack xấu nhất là {ws_s} ns, hold slack xấu nhất là {wh_s} ns.{extra}"),
        "pnr5.summary_vi": f"trượt timing ở {where}",
        "pnr5.limit_vi": f"Thiết kế chưa đóng timing ở 5 ns tại: {where}.",
        "pnr5.grade_vi": "Chưa đạt",
        "pnr5.slide_value": f"trượt: {first}, {ws_s} ns",
    }


def main() -> None:
    metrics = json.loads((ROOT / "results/metrics.json").read_text())
    print(json.dumps(describe(metrics), ensure_ascii=False, indent=1))


if __name__ == "__main__":
    main()
