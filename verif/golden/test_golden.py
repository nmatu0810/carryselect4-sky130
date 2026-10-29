import sys
from pathlib import Path
import pytest

# Ensure verif/golden is in sys.path
golden_dir = Path(__file__).resolve().parent
if str(golden_dir) not in sys.path:
    sys.path.insert(0, str(golden_dir))

from golden import (
    CASE1_TRIPLES,
    add4,
    pack_word,
    exhaustive_triples,
    write_hex,
    main,
)


def test_add4_extremes():
    assert add4(0, 0, 0) == (0, 0)
    assert add4(15, 15, 1) == (15, 1)  # 31 = 0b1_1111
    assert add4(15, 1, 0) == (0, 1)
    assert add4(15, 0, 1) == (0, 1)


def test_add4_range():
    with pytest.raises(ValueError):
        add4(16, 0, 0)
    with pytest.raises(ValueError):
        add4(0, 0, 2)
    with pytest.raises(ValueError):
        add4(-1, 0, 0)
    with pytest.raises(ValueError):
        add4(0, -1, 0)
    with pytest.raises(ValueError):
        add4(0, 0, -1)
    with pytest.raises(ValueError):
        add4(0, 16, 0)


def test_pack_word():
    assert pack_word(0, 0, 0) == 0x0000
    assert pack_word(15, 15, 1) == 0x3FFF
    assert pack_word(15, 1, 0) == 0x03F0


def test_exhaustive_order():
    t = exhaustive_triples()
    assert len(t) == 512 and t[0] == (0, 0, 0) and t[17] == (1, 1, 0) and t[256] == (0, 0, 1)


def test_case1_covers_both_c2():
    c2 = {((a & 3) + (b & 3) + c) >> 2 for a, b, c in CASE1_TRIPLES}
    assert c2 == {0, 1}


def test_files(tmp_path):
    main(["--outdir", str(tmp_path)])
    ex_file = tmp_path / "exhaustive.hex"
    case1_file = tmp_path / "case1.hex"
    assert ex_file.exists()
    assert case1_file.exists()

    lines = ex_file.read_text(encoding="utf-8").splitlines()
    assert len(lines) == 512
    assert lines[0] == "0000"
    assert lines[511] == "3fff"

    c1_lines = case1_file.read_text(encoding="utf-8").splitlines()
    assert len(c1_lines) == len(CASE1_TRIPLES)
