"""Originality checks for the EduOS rewrites of the frozen-overlap-list items.

Four independent measures are computed against both the recorded matched
shingle and the full superseded text:

  exact_match          identical strings after trimming
  normalized_match     identical after case folding, punctuation and whitespace
                       normalisation and digit stripping
  max_shingle_overlap  highest proportion of any 6-word window of the reference
                       text that also appears as a 6-word window of the rewrite
  semantic_similarity  cosine similarity over content-word frequency vectors

A rewrite is verified only when every measure sits under its threshold.
Passing these checks is an originality signal. It is not a copyright clearance,
a licence grant, or a legal opinion, and is never recorded as one.
"""

from __future__ import annotations

import math
import re
from collections import Counter

# Frozen overlap list — mirrors NCERT_OVERLAP_CANDIDATES in src/lib/sme-review-shared.ts.
# This module reads it; it never modifies it.
MATCHED_SHINGLES: dict[str, str] = {
    "C10-2627-MATH-REQ024-DIAG-004": "tower casts a shadow 28 m long. find the height of the",
    "C10-2627-MATH-REQ022-DIAG-009": "find the coordinates of the points of trisection of the line segment",
    "C10-2627-MATH-REQ032-DIAG-001": "the angle of elevation of the top of a tower from a",
    "C10-2627-MATH-REQ034-REASS-005": "cm subtends a right angle at the centre. find the area of",
}

THRESHOLDS = {"max_shingle_overlap": 0.15, "semantic_similarity": 0.60}

STOPWORDS = {
    "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "in", "is", "it",
    "its", "of", "on", "or", "that", "the", "their", "them", "then", "this", "to",
    "with", "which", "you", "your", "so", "if", "into", "has", "have", "was", "were",
}

N = 6


def normalize(text: str) -> str:
    t = re.sub(r"[^a-z0-9\s]", " ", text.lower())
    t = re.sub(r"\d+(\.\d+)?", " ", t)
    return re.sub(r"\s+", " ", t).strip()


def shingles(text: str, n: int = N) -> set[str]:
    words = normalize(text).split()
    if len(words) < n:
        return {" ".join(words)} if words else set()
    return {" ".join(words[i : i + n]) for i in range(len(words) - n + 1)}


def overlap(reference: str, candidate: str) -> float:
    ref, cand = shingles(reference), shingles(candidate)
    if not ref:
        return 0.0
    return len(ref & cand) / len(ref)


def cosine(a: str, b: str) -> float:
    va = Counter(w for w in normalize(a).split() if w not in STOPWORDS)
    vb = Counter(w for w in normalize(b).split() if w not in STOPWORDS)
    if not va or not vb:
        return 0.0
    dot = sum(va[w] * vb[w] for w in va.keys() & vb.keys())
    na = math.sqrt(sum(v * v for v in va.values()))
    nb = math.sqrt(sum(v * v for v in vb.values()))
    return round(dot / (na * nb), 4) if na and nb else 0.0


def _text(content: dict) -> str:
    parts = [content.get("prompt") or "", content.get("stimulus") or "", content.get("explanation") or ""]
    opts = content.get("options")
    if isinstance(opts, list):
        parts += [str(o) for o in opts]
    return "\n".join(p for p in parts if p)


def originality_report(external_ref: str, before: dict, after: dict) -> dict:
    shingle = MATCHED_SHINGLES[external_ref]
    old_text, new_text = _text(before), _text(after)

    exact = old_text.strip() == new_text.strip() or shingle.strip() in new_text.strip()
    normalized = normalize(old_text) == normalize(new_text) or normalize(shingle) in normalize(new_text)
    shingle_vs_flag = overlap(shingle, new_text)
    shingle_vs_old = overlap(old_text, new_text)
    max_overlap = round(max(shingle_vs_flag, shingle_vs_old), 4)
    sem = max(cosine(shingle, new_text), cosine(old_text, new_text))

    ok = (
        not exact
        and not normalized
        and max_overlap <= THRESHOLDS["max_shingle_overlap"]
        and sem <= THRESHOLDS["semantic_similarity"]
    )
    return {
        "matched_shingle": shingle,
        "exact_match": exact,
        "normalized_match": normalized,
        "max_shingle_overlap": max_overlap,
        "semantic_similarity": sem,
        "verdict": "ORIGINAL_EDUOS_REWRITE_VERIFIED" if ok else "REWRITE_REJECTED_OVERLAP",
        "evidence": {
            "shingle_size_words": N,
            "overlap_vs_matched_shingle": round(shingle_vs_flag, 4),
            "overlap_vs_superseded_text": round(shingle_vs_old, 4),
            "cosine_vs_matched_shingle": cosine(shingle, new_text),
            "cosine_vs_superseded_text": cosine(old_text, new_text),
            "thresholds": THRESHOLDS,
            "copyright_clearance_claimed": False,
            "licence_status": "NOT_ASSESSED",
        },
    }
