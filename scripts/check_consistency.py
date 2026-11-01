#!/usr/bin/env python3
"""Task 20 step 3: the 5 headline numbers must appear, identically rounded, in paper, report and slides.

Numbers are formatted with scripts/metrics_to_tex.fmt (3 significant figures, at most 3 decimals),
the same rule used by report/build_docx.mjs and slides/build_slides.mjs.
Texts: pdftotext of the paper; word/document.xml of the .docx and ppt/slides/*.xml + charts of the
.pptx with XML tags removed.
"""
import json
import re
import subprocess
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
from metrics_to_tex import fmt  # noqa: E402

KEYS = ["pnr.wns_setup_ns", "synth.top.nand2_eq", "pnr.fmax_mhz", "le.D_est_ps", "spice.D_post_ps"]


def xml_text(path: Path, pattern: str) -> str:
    with zipfile.ZipFile(path) as z:
        parts = [z.read(n).decode("utf8") for n in sorted(z.namelist()) if re.match(pattern, n)]
    return re.sub(r"<[^>]+>", " ", " ".join(parts))


def main() -> int:
    m = json.loads((ROOT / "results/metrics.json").read_text())
    docs = {
        "paper": subprocess.run(["pdftotext", str(ROOT / "paper/CarrySelect4_IEEE.pdf"), "-"],
                                capture_output=True, text=True, check=True).stdout,
        "report": xml_text(ROOT / "report/baocao_CarrySelect4.docx", r"word/document\.xml$"),
        "slides": xml_text(ROOT / "slides/CarrySelect4_BaoVe.pptx", r"ppt/(slides/slide\d+|charts/chart\d+)\.xml$"),
    }
    bad = 0
    for k in KEYS:
        s = fmt(m[k])
        pat = re.compile(rf"(?<![\d.]){re.escape(s)}(?![\d])")
        where = {d: bool(pat.search(t)) for d, t in docs.items()}
        ok = all(where.values())
        bad += not ok
        print(f"  {'ok  ' if ok else 'FAIL'}  {k} = {s}: " + ", ".join(f"{d} {'yes' if v else 'NO'}" for d, v in where.items()))
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
