import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from pnr5_text import describe  # noqa: E402

BASE = {"pnr5.wns_setup_worst_corner_ns": 0.211, "pnr5.wns_hold_worst_corner_ns": 0.151}


def run_file(tmp_path, setup):
    m = {f"timing__setup__ws__corner:{c}": v for c, v in setup.items()}
    m.update({f"timing__hold__ws__corner:{c}": 0.15 for c in setup})
    p = tmp_path / "ol.json"
    p.write_text(json.dumps(m))
    return p


def test_pass_mentions_all_corners(tmp_path):
    d = describe({**BASE, "pnr5.status": "PASS"}, run_file(tmp_path, {f"c{i}": 0.2 for i in range(9)}))
    assert "all 9 corners" in d["pnr5.text_en"] and "misses" not in d["pnr5.text_en"]
    assert d["pnr5.grade_vi"] == "Đạt" and "cả 9 corner" in d["pnr5.text_vi"]


def test_fail_names_the_failing_corner(tmp_path):
    m = {**BASE, "pnr5.status": "FAIL", "pnr5.wns_setup_worst_corner_ns": -0.045}
    d = describe(m, run_file(tmp_path, {"max_ss_100C_1v60": -0.045, "nom_tt_025C_1v80": 1.4}))
    assert "max_ss_100C_1v60" in d["pnr5.text_en"] and "max_ss_100C_1v60" in d["pnr5.text_vi"]
    assert d["pnr5.grade_vi"] == "Chưa đạt"
