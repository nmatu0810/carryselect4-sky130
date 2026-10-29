#!/usr/bin/env python3
import fcntl
import json
import os
import sys
from contextlib import contextmanager
from pathlib import Path


def get_metrics_path() -> Path:
    env_path = os.environ.get("METRICS_FILE")
    if env_path:
        return Path(env_path).resolve()
    # Default: results/metrics.json relative to repository root
    repo_root = Path(__file__).resolve().parent.parent
    return repo_root / "results" / "metrics.json"


def load_metrics(filepath: Path | None = None) -> dict:
    p = filepath or get_metrics_path()
    if not p.exists():
        return {}
    try:
        with open(p, "r", encoding="utf-8") as f:
            content = f.read().strip()
            if not content:
                return {}
            return json.loads(content)
    except Exception:
        return {}


def save_metrics(data: dict, filepath: Path | None = None) -> None:
    p = filepath or get_metrics_path()
    p.parent.mkdir(parents=True, exist_ok=True)
    temp_file = p.with_suffix(f".tmp.{os.getpid()}")
    with open(temp_file, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, sort_keys=True)
        f.write("\n")
    os.replace(temp_file, p)


def parse_val(val_str):
    if not isinstance(val_str, str):
        return val_str
    try:
        return json.loads(val_str)
    except Exception:
        return val_str


@contextmanager
def metrics_lock():
    p = get_metrics_path()
    p.parent.mkdir(parents=True, exist_ok=True)
    with open(f"{p}.lock", "w") as lock_f:
        fcntl.flock(lock_f, fcntl.LOCK_EX)
        try:
            yield
        finally:
            fcntl.flock(lock_f, fcntl.LOCK_UN)


def set_metric(key: str, value) -> None:
    parsed = parse_val(value)
    with metrics_lock():
        data = load_metrics()
        data[key] = parsed
        save_metrics(data)


def get_metric(key: str):
    data = load_metrics()
    if key not in data:
        raise KeyError(key)
    return data[key]


def check_metric(key: str, op: str, value) -> int:
    data = load_metrics()
    if key not in data:
        return 2

    actual = data[key]
    expected = parse_val(value)

    # Numbers are always compared as float (so 1e-3 works)
    try:
        actual = float(actual)
        expected = float(expected)
    except (TypeError, ValueError):
        pass

    ops = {
        "==": lambda a, b: a == b,
        "!=": lambda a, b: a != b,
        ">=": lambda a, b: a >= b,
        "<=": lambda a, b: a <= b,
        ">": lambda a, b: a > b,
        "<": lambda a, b: a < b,
    }
    if op not in ops:
        raise ValueError(f"Unsupported operator: {op}")

    try:
        res = ops[op](actual, expected)
        return 0 if res else 1
    except Exception:
        return 1


def main():
    if len(sys.argv) < 2:
        sys.stderr.write("Usage: metrics.py <set|get|check> [args...]\n")
        sys.exit(1)

    cmd = sys.argv[1]
    if cmd == "set":
        if len(sys.argv) < 4:
            sys.stderr.write("Usage: metrics.py set <key> <value>\n")
            sys.exit(1)
        key = sys.argv[2]
        val = sys.argv[3]
        set_metric(key, val)
        sys.exit(0)

    elif cmd == "get":
        if len(sys.argv) < 3:
            sys.stderr.write("Usage: metrics.py get <key>\n")
            sys.exit(1)
        key = sys.argv[2]
        try:
            val = get_metric(key)
            if isinstance(val, bool):
                print(str(val).lower())
            elif isinstance(val, (dict, list)):
                print(json.dumps(val))
            else:
                print(val)
            sys.exit(0)
        except KeyError:
            sys.stderr.write(f"Key not found: {key}\n")
            sys.exit(2)

    elif cmd == "check":
        if len(sys.argv) < 5:
            sys.stderr.write("Usage: metrics.py check <key> <op> <value>\n")
            sys.exit(1)
        key = sys.argv[2]
        op = sys.argv[3]
        val = sys.argv[4]
        code = check_metric(key, op, val)
        sys.exit(code)

    else:
        sys.stderr.write(f"Unknown command: {cmd}\n")
        sys.exit(1)


if __name__ == "__main__":
    main()
