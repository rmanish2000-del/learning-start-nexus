"""Applies the production-release-candidate rewrites for the two items that the
item-level licence classification returned as LICENCE_NOT_CONFIRMED.

Staging only. Idempotent: content is patched only when the recorded after-hash
differs from the current content hash, and evidence rows are inserted once.

  python3 scripts/class10/release/apply_v2.py
"""

from __future__ import annotations

import hashlib
import json
import os
import sys
from datetime import date

HERE = os.path.dirname(os.path.abspath(__file__))
RESOLVE = os.path.join(os.path.dirname(HERE), "resolve")
sys.path.insert(0, HERE)
sys.path.insert(0, RESOLVE)

import originality as O  # noqa: E402
from lib_rest import insert, req, select  # noqa: E402
from rewrites_v2 import REWRITES_V2  # noqa: E402

ORG = "458d3caf-5dc4-486b-b499-02124d0da319"
EVIDENCE = os.path.join(HERE, "evidence")
os.makedirs(EVIDENCE, exist_ok=True)
SOURCE_URL = "https://cbseacademic.nic.in/web_material/CurriculumMain26/Sec/Maths_Sec_2025-26.pdf"
SOURCE_TITLE = "CBSE Mathematics (041) syllabus, Secondary, session 2025-26"
SOURCE_SHA = "2a2c03e9f66a24dd0980d5b07d2ea70bc00ca72fa95cf7c48d2eec224218921e"


def sha(obj) -> str:
    return hashlib.sha256(json.dumps(obj, sort_keys=True, ensure_ascii=False).encode()).hexdigest()


def report(before: dict, after: dict) -> dict:
    text = " ".join(str(v) for v in after.values() if v)
    old = " ".join(str(v) for v in before.values() if v)
    per = {}
    worst_sh = worst_se = 0.0
    exact = normalized = False
    for key, shingle in O.MATCHED_SHINGLES.items():
        sh, se = O.overlap(shingle, text), O.cosine(shingle, text)
        per[key] = {"shingle": round(sh, 4), "cosine": round(se, 4)}
        worst_sh, worst_se = max(worst_sh, sh), max(worst_se, se)
        exact = exact or text.strip() == shingle.strip()
        normalized = normalized or O.normalize(text) == O.normalize(shingle)
    contains = any(O.normalize(s) in O.normalize(text) for s in O.MATCHED_SHINGLES.values())
    ok = (
        not exact
        and not normalized
        and not contains
        and worst_sh < O.THRESHOLDS["max_shingle_overlap"]
        and worst_se < O.THRESHOLDS["semantic_similarity"]
    )
    return {
        "exact_match": exact,
        "normalized_match": normalized,
        "contains_frozen_shingle": contains,
        "max_shingle_overlap": round(worst_sh, 4),
        "semantic_similarity": round(worst_se, 4),
        "overlap_vs_superseded_text": round(O.overlap(old, text), 4),
        "cosine_vs_superseded_text": round(O.cosine(old, text), 4),
        "per_frozen_shingle": per,
        "verdict": "ORIGINAL_EDUOS_REWRITE_VERIFIED" if ok else "REWRITE_NOT_VERIFIED",
        "thresholds": O.THRESHOLDS,
        "shingle_size_words": O.N,
        "licence_status": "NOT_ASSESSED",
        "copyright_clearance_claimed": False,
    }


def main() -> None:
    refs = sorted(REWRITES_V2)
    rows = select(
        "question_bank?select=id,external_ref,prompt,stimulus,options,correct_answer,explanation,"
        "status,verification_state&external_ref=in.(" + ",".join(refs) + ")"
    )
    q_by_ref = {r["external_ref"]: r for r in rows}
    assert set(q_by_ref) == set(refs), (sorted(q_by_ref), refs)

    existing_rev = {
        r["after_sha256"]
        for r in select("question_content_revisions?select=after_sha256&external_ref=in.(" + ",".join(refs) + ")")
    }
    existing_orig = {
        r["external_ref"]
        for r in select("question_originality_checks?select=external_ref&external_ref=in.(" + ",".join(refs) + ")")
    }
    existing_src = {
        r["external_ref"]
        for r in select("curriculum_source_register?select=external_ref&external_ref=in.(" + ",".join(refs) + ")")
    }

    out = {"applied": [], "already_applied": [], "label": "FOUNDER_AUTHORIZED_AUTOMATED_PROVISIONAL"}
    snap_path = os.path.join(EVIDENCE, "pre_rewrite_v2_snapshot.json")
    snapshot = json.load(open(snap_path)) if os.path.exists(snap_path) else {}

    for ref in refs:
        q = q_by_ref[ref]
        spec = REWRITES_V2[ref]
        before = {k: q[k] for k in ("prompt", "stimulus", "options", "correct_answer", "explanation")}
        after = {
            "prompt": spec["prompt"],
            "stimulus": spec["stimulus"],
            "options": spec["options"],
            "correct_answer": spec["correct_answer"],
            "explanation": spec["explanation"],
        }
        before_sha, after_sha = sha(before), sha(after)
        snapshot.setdefault(ref, {"question_id": q["id"], "content": before, "sha256": before_sha})
        rep = report(before, after)
        assert rep["verdict"] == "ORIGINAL_EDUOS_REWRITE_VERIFIED", (ref, rep)

        if before_sha == after_sha:
            out["already_applied"].append({"external_ref": ref, "sha256": after_sha})
            continue

        if after_sha not in existing_rev:
            insert(
                "question_content_revisions",
                [
                    {
                        "org_id": ORG,
                        "question_id": q["id"],
                        "external_ref": ref,
                        "subject": "Mathematics",
                        "revision_reason": (
                            "Item-level licence classification returned LICENCE_NOT_CONFIRMED: a six-word "
                            "window of recorded third-party wording overlapped above threshold. Only the "
                            "fact, formula and curriculum objective were retained; all expressive wording "
                            "was independently re-authored. No copyright clearance is claimed."
                        ),
                        "revision_kind": "ORIGINAL_EDUOS_REWRITE",
                        "before_content": before,
                        "after_content": after,
                        "before_sha256": before_sha,
                        "after_sha256": after_sha,
                        "applied": True,
                    }
                ],
            )
        if ref not in existing_orig:
            insert(
                "question_originality_checks",
                [
                    {
                        "org_id": ORG,
                        "question_id": q["id"],
                        "external_ref": ref,
                        "subject": "Mathematics",
                        "matched_shingle": max(
                            O.MATCHED_SHINGLES.values(),
                            key=lambda s: O.overlap(s, " ".join(str(v) for v in before.values() if v)),
                        ),
                        "exact_match": rep["exact_match"],
                        "normalized_match": rep["normalized_match"],
                        "max_shingle_overlap": rep["max_shingle_overlap"],
                        "semantic_similarity": rep["semantic_similarity"],
                        "verdict": rep["verdict"],
                        "copyright_clearance_claimed": False,
                        "evidence": rep,
                    }
                ],
            )
        if ref not in existing_src:
            insert(
                "curriculum_source_register",
                [
                    {
                        "org_id": ORG,
                        "question_id": q["id"],
                        "external_ref": ref,
                        "subject": "Mathematics",
                        "source_title": SOURCE_TITLE,
                        "source_url": SOURCE_URL,
                        "section_ref": spec["source_section"],
                        "accessed_at": str(date.today()),
                        "checksum_sha256": SOURCE_SHA,
                        "alignment_note": (
                            "Item is aligned to this syllabus topic. No wording is taken from the official "
                            "source; the item text is original EduOS content."
                        ),
                        "licence_status": "NOT_ASSESSED",
                        "verbatim_copying": False,
                    }
                ],
            )
        req(
            "PATCH",
            f"question_bank?id=eq.{q['id']}",
            {
                "prompt": after["prompt"],
                "stimulus": after["stimulus"],
                "options": after["options"],
                "correct_answer": after["correct_answer"],
                "explanation": after["explanation"],
            },
            prefer="return=minimal",
        )
        out["applied"].append(
            {
                "external_ref": ref,
                "question_id": q["id"],
                "before_sha256": before_sha,
                "after_sha256": after_sha,
                "originality": rep,
                "status_unchanged": q["status"],
                "verification_state_unchanged": q["verification_state"],
            }
        )

    json.dump(snapshot, open(snap_path, "w"), indent=1, ensure_ascii=False)
    json.dump(out, open(os.path.join(EVIDENCE, "rewrite_v2_result.json"), "w"), indent=1, ensure_ascii=False)
    print(json.dumps(out, indent=1)[:4000])


if __name__ == "__main__":
    main()
