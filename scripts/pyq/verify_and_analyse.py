"""Provenance-verified classification and ORIGINAL structural pattern analysis of
the officially downloaded CBSE Class 10 Mathematics Standard (041) and Science
(086) main-examination papers, 2022-2026.

    python3 scripts/pyq/verify_and_analyse.py

Reads only the private evidence tree written by
scripts/pyq/acquire-cbse-class10.ts. No question text is copied into the
repository or into EduOS: only counts, marks, page and section structure are
retained. Papers that are not Mathematics Standard / Science main papers
(for example Mathematics Basic files shipped inside an official archive) are
quarantined and reported, never analysed.
"""

from __future__ import annotations

import csv
import hashlib
import json
import os
import re
from collections import Counter, defaultdict

from pypdf import PdfReader

EVIDENCE = "/mnt/documents/eduos-private-evidence/cbse-class10-pyq"
REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

EXCLUDE_PATTERNS = [
    (r"basic", "MATHEMATICS_BASIC_241"),
    (r"compartment|second\s*board", "COMPARTMENT_OR_SECOND_BOARD"),
    (r"marking\s*scheme|^ms[_-]", "MARKING_SCHEME"),
    (r"sample|sqp", "SAMPLE_PAPER"),
]


def classify(name: str, first_page: str) -> tuple[str, str]:
    hay = f"{name} {first_page[:1500]}"
    for pattern, reason in EXCLUDE_PATTERNS:
        if re.search(pattern, hay, re.I):
            return "QUARANTINED", reason
    return "ACCEPTED", ""


def sha256_file(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def main() -> None:
    rows = []
    for year in sorted(os.listdir(EVIDENCE)):
        ydir = os.path.join(EVIDENCE, year)
        if not (year.isdigit() and os.path.isdir(ydir)):
            continue
        for root, _dirs, files in os.walk(ydir):
            for fname in sorted(files):
                if not fname.lower().endswith(".pdf"):
                    continue
                path = os.path.join(root, fname)
                subject = "Mathematics Standard" if "041_" in path else "Science"
                reader = PdfReader(path)
                head = reader.pages[0].extract_text() or ""
                status, reason = classify(fname, head)
                marks = re.search(r"Maximum\s*Marks\s*:?\s*(\d+)", head, re.I)
                series = re.search(r"\b(\d{2,3}[/-][A-Z0-9]{1,3}[/-]\d)\b", fname + " " + head)
                rows.append(
                    {
                        "year": int(year),
                        "subject": subject,
                        "subject_code": "041" if subject.startswith("Math") else "086",
                        "archive": os.path.relpath(path, EVIDENCE).split(os.sep)[1],
                        "pdf_entry": os.path.relpath(path, EVIDENCE),
                        "pages": len(reader.pages),
                        "max_marks": marks.group(1) if marks else "",
                        "set_series": series.group(1).replace("-", "/") if series else "",
                        "language": "Punjabi" if re.search(r"punjabi", fname, re.I) else "English/Hindi",
                        "exam_type": "MAIN" if status == "ACCEPTED" else "EXCLUDED",
                        "status": status,
                        "exclusion_reason": reason,
                        "sha256": sha256_file(path),
                    }
                )

    with open(os.path.join(REPO, "CBSE_CLASS10_PYQ_EXTRACTION_INVENTORY.csv"), "w", newline="") as fh:
        writer = csv.DictWriter(fh, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)

    accepted = [r for r in rows if r["status"] == "ACCEPTED"]
    quarantined = [r for r in rows if r["status"] == "QUARANTINED"]

    by_cell = Counter((r["year"], r["subject"]) for r in accepted)
    marks_by_year = defaultdict(Counter)
    pages_by_cell = defaultdict(list)
    for r in accepted:
        marks_by_year[(r["year"], r["subject"])][r["max_marks"] or "unstated"] += 1
        pages_by_cell[(r["year"], r["subject"])].append(r["pages"])

    summary = {
        "acceptedPdfs": len(accepted),
        "quarantinedPdfs": len(quarantined),
        "byYearSubject": {f"{y} {s}": n for (y, s), n in sorted(by_cell.items())},
        "maxMarksDistribution": {
            f"{y} {s}": dict(c) for (y, s), c in sorted(marks_by_year.items())
        },
        "medianPages": {
            f"{y} {s}": sorted(v)[len(v) // 2] for (y, s), v in sorted(pages_by_cell.items())
        },
        "quarantine": [
            {"pdf": r["pdf_entry"], "reason": r["exclusion_reason"]} for r in quarantined
        ],
    }
    with open(os.path.join(REPO, "CBSE_CLASS10_PYQ_PATTERN_SUMMARY.json"), "w") as fh:
        json.dump(summary, fh, indent=2)
        fh.write("\n")
    print(json.dumps(summary["byYearSubject"], indent=2))
    print("quarantined:", len(quarantined))


if __name__ == "__main__":
    main()
