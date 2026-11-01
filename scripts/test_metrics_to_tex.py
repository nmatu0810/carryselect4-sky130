import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from metrics_to_tex import fmt, to_tex  # noqa: E402


def test_three_significant_figures():
    assert "{1.23}" in to_tex({"a.b": 1.23456})


def test_formats():
    assert fmt(3418.13) == "3420"
    assert fmt(0.342) == "0.342"
    assert fmt(-0.045) == "-0.045"
    assert fmt(4.0) == "4"
    assert fmt(2.005) == "2.00"
    assert fmt(4.799) == "4.80"
    assert fmt(0.0334) == "0.033"
    assert fmt(512) == "512"
    assert fmt("a_q[0] -> cout_q") == r"a\_q[0] -> cout\_q"
    assert fmt(True) == "true"
