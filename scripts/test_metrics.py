import json
import os
import subprocess
import sys
from pathlib import Path
import pytest

# Ensure scripts directory is on sys.path
scripts_dir = Path(__file__).resolve().parent
if str(scripts_dir) not in sys.path:
    sys.path.insert(0, str(scripts_dir))

from metrics import set_metric, get_metric, check_metric


@pytest.fixture
def tmp_metrics(tmp_path, monkeypatch):
    p = tmp_path / "metrics.json"
    p.write_text("{}")
    monkeypatch.setenv("METRICS_FILE", str(p))
    return p


def test_set_get_number(tmp_metrics):
    set_metric("a.b", "1.5")
    assert get_metric("a.b") == 1.5


def test_set_string(tmp_metrics):
    set_metric("x", "abc -> d")
    assert get_metric("x") == "abc -> d"


def test_check_ops(tmp_metrics):
    set_metric("w", "0.3")
    assert check_metric("w", ">=", "0") == 0 and check_metric("w", "<", "0") == 1


def test_missing_key(tmp_metrics):
    assert check_metric("nope", "==", "1") == 2


def test_concurrent_set(tmp_metrics):
    script = scripts_dir / "metrics.py"
    env = dict(os.environ, METRICS_FILE=str(tmp_metrics))
    procs = [
        subprocess.Popen([sys.executable, str(script), "set", f"k{i}", str(i)], env=env)
        for i in range(40)
    ]
    assert all(p.wait() == 0 for p in procs)
    assert len(json.loads(tmp_metrics.read_text())) == 40
