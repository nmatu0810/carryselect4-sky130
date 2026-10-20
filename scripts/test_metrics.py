import sys
from pathlib import Path
import pytest

# Ensure scripts directory is on sys.path
scripts_dir = Path(__file__).resolve().parent
if str(scripts_dir) not in sys.path:
    sys.path.insert(0, str(scripts_dir))

from metrics import set, get, check


@pytest.fixture
def tmp_metrics(tmp_path, monkeypatch):
    p = tmp_path / "metrics.json"
    p.write_text("{}")
    monkeypatch.setenv("METRICS_FILE", str(p))
    return p


def test_set_get_number(tmp_metrics):
    set("a.b", "1.5")
    assert get("a.b") == 1.5


def test_set_string(tmp_metrics):
    set("x", "abc -> d")
    assert get("x") == "abc -> d"


def test_check_ops(tmp_metrics):
    set("w", "0.3")
    assert check("w", ">=", "0") == 0 and check("w", "<", "0") == 1


def test_missing_key(tmp_metrics):
    assert check("nope", "==", "1") == 2
