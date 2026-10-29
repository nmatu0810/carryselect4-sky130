#!/usr/bin/env python3
import argparse
from pathlib import Path

# Case 1 test triples: (a, b, cin)
CASE1_TRIPLES: list[tuple[int, int, int]] = [
    (0, 0, 0),
    (15, 15, 1),
    (15, 1, 0),
    (15, 0, 1),
    (1, 1, 0),
    (3, 1, 0),
]


def add4(a: int, b: int, cin: int) -> tuple[int, int]:
    """4-bit addition returning (sum, cout).

    Raises ValueError if inputs are out of bounds:
    a: 0..15, b: 0..15, cin: 0..1.
    """
    if not (0 <= a <= 15):
        raise ValueError(f"a out of range (0..15): {a}")
    if not (0 <= b <= 15):
        raise ValueError(f"b out of range (0..15): {b}")
    if not (0 <= cin <= 1):
        raise ValueError(f"cin out of range (0..1): {cin}")

    total = a + b + cin
    return total % 16, total // 16


def pack_word(a: int, b: int, cin: int) -> int:
    """Pack inputs and expected outputs into a 14-bit word:

    {data_in[8:0], exp[4:0]} where:
      data_in = (cin << 8) | (b << 4) | a
      exp     = (cout << 4) | sum
    word = (data_in << 5) | exp
    """
    s, cout = add4(a, b, cin)
    exp = (cout << 4) | s
    data_in = (cin << 8) | (b << 4) | a
    return (data_in << 5) | exp


def exhaustive_triples() -> list[tuple[int, int, int]]:
    """Return all 512 triples in order: i = cin*256 + b*16 + a."""
    triples: list[tuple[int, int, int]] = []
    for cin in range(2):
        for b in range(16):
            for a in range(16):
                triples.append((a, b, cin))
    return triples


def write_hex(path: str | Path, triples: list[tuple[int, int, int]]) -> None:
    """Write triples as 4-digit lowercase hex words separated by newline."""
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    with open(p, "w", encoding="utf-8", newline="\n") as f:
        for a, b, cin in triples:
            word = pack_word(a, b, cin)
            f.write(f"{word:04x}\n")


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description="Golden model for CSLA 4-bit and test vector generator")
    parser.add_argument(
        "--outdir",
        default="verif/vectors",
        help="Output directory for generated hex files (default: verif/vectors)",
    )
    args = parser.parse_args(argv)

    outdir = Path(args.outdir)
    write_hex(outdir / "exhaustive.hex", exhaustive_triples())
    write_hex(outdir / "case1.hex", CASE1_TRIPLES)


if __name__ == "__main__":
    main()
