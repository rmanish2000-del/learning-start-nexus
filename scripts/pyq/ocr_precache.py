"""Parallel OCR pre-cache for image-only CBSE papers.

Fills /tmp/pyq-text-cache with OCR text for every accepted PDF whose embedded
text layer is missing or too small, so build_pattern_intelligence.py can attribute
scanned 2025/2026 papers. English-only OCR; failures leave the paper unattributed.

    python3 scripts/pyq/ocr_precache.py [workers]
"""
from __future__ import annotations

import csv, glob, os, subprocess, sys, tempfile
from concurrent.futures import ProcessPoolExecutor

import pytesseract
from PIL import Image
from pypdf import PdfReader

EVIDENCE = "/mnt/documents/eduos-private-evidence/cbse-class10-pyq"
REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
INVENTORY = os.path.join(REPO, "CBSE_CLASS10_PYQ_EXTRACTION_INVENTORY.csv")
CACHE = "/tmp/pyq-text-cache"
THRESHOLD = 2000


def cache_key(path: str) -> str:
    return os.path.join(CACHE, path.replace("/", "_") + ".txt")


def embedded(path: str) -> str:
    try:
        return "\n".join((p.extract_text() or "") for p in PdfReader(path).pages)
    except Exception:
        return ""


def ocr(path: str) -> tuple[str, int]:
    text = embedded(path)
    if len(text) >= THRESHOLD:
        with open(cache_key(path), "w") as fh:
            fh.write(text)
        return path, len(text)
    out: list[str] = []
    with tempfile.TemporaryDirectory() as tmp:
        try:
            subprocess.run(
                ["pdftoppm", "-r", "150", "-gray", "-jpeg", path, os.path.join(tmp, "p")],
                check=True, capture_output=True, timeout=900,
            )
        except Exception:
            return path, -1
        for img in sorted(glob.glob(os.path.join(tmp, "p-*.jpg"))):
            try:
                out.append(pytesseract.image_to_string(Image.open(img), lang="eng"))
            except Exception:
                continue
    joined = "\n".join(out)
    if len(joined) > len(text):
        text = joined
    with open(cache_key(path), "w") as fh:
        fh.write(text)
    return path, len(text)


def main() -> None:
    workers = int(sys.argv[1]) if len(sys.argv) > 1 else 8
    os.makedirs(CACHE, exist_ok=True)
    with open(INVENTORY, newline="") as fh:
        rows = [r for r in csv.DictReader(fh) if r["status"] == "ACCEPTED"]
    todo = []
    for r in rows:
        path = os.path.join(EVIDENCE, r["pdf_entry"])
        if not os.path.exists(path):
            continue
        k = cache_key(path)
        if os.path.exists(k) and os.path.getsize(k) >= THRESHOLD:
            continue
        todo.append(path)
    print(f"papers needing OCR: {len(todo)}", flush=True)
    done = 0
    with ProcessPoolExecutor(max_workers=workers) as ex:
        for path, size in ex.map(ocr, todo):
            done += 1
            print(f"{done}/{len(todo)} {size:>7} {os.path.basename(path)}", flush=True)


if __name__ == "__main__":
    main()
