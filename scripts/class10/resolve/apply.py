"""Applies the Class 10 unresolved-content resolution to EduOS staging.

Idempotent. Every write is either append-only evidence or a content change that
is first captured in `question_content_revisions` with before/after fingerprints.

  python3 scripts/class10/resolve/apply.py
"""

from __future__ import annotations

import hashlib
import json
import os
import sys
from datetime import date

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)


from lib_rest import insert, req, select  # noqa: E402
from marking_specs import SPECS  # noqa: E402
from rewrites import CONTENT_FIXES, CURRICULUM_SOURCE, REWRITES, SOURCES  # noqa: E402
from originality import originality_report  # noqa: E402

ORG = "458d3caf-5dc4-486b-b499-02124d0da319"
RESOLUTION_ID = "CLASS10-2627-UNRESOLVED-RESOLUTION-V1"
EVIDENCE = os.path.join(HERE, "evidence")
os.makedirs(EVIDENCE, exist_ok=True)


def sha(obj) -> str:
    return hashlib.sha256(
        json.dumps(obj, sort_keys=True, ensure_ascii=False).encode()
    ).hexdigest()


def content_hash(q: dict) -> str:
    return sha(
        {
            "prompt": q["prompt"],
            "stimulus": q.get("stimulus"),
            "options": q.get("options"),
            "correct_answer": q["correct_answer"],
            "explanation": q["explanation"],
        }
    )


def page(path: str) -> list[dict]:
    out, i = [], 0
    while True:
        chunk = select(f"{path}&limit=500&offset={i * 500}")
        if not chunk:
            return out
        out += chunk
        i += 1


QFIELDS = (
    "id,external_ref,subject:kind,kind,difficulty,prompt,stimulus,options,"
    "correct_answer,explanation,outcome_id,status,verification_state,updated_at"
)


def fetch_questions(refs: list[str]) -> dict[str, dict]:
    out: dict[str, dict] = {}
    for i in range(0, len(refs), 40):
        part = refs[i : i + 40]
        rows = select(
            "question_bank?select=id,external_ref,kind,difficulty,prompt,stimulus,options,"
            "correct_answer,explanation,outcome_id,status,verification_state,updated_at"
            "&external_ref=in.(" + ",".join(part) + ")"
        )
        for r in rows:
            out[r["external_ref"]] = r
    return out


def subject_of(ref: str) -> str:
    return "Mathematics" if "-MATH-" in ref else "Science"


def main() -> None:
    unresolved = page(
        "automated_provisional_outcomes?select=*&superseded_at=is.null"
        "&provisional_outcome=eq.AUTOMATED_UNRESOLVED&order=queue_row_key"
    )
    assert unresolved, "expected at least one unresolved row to resolve"

    changed_refs = sorted(set(REWRITES) | set(CONTENT_FIXES))
    spec_refs = sorted(SPECS)
    all_refs = sorted(set(changed_refs) | set(spec_refs))
    questions = fetch_questions(all_refs)
    missing = [r for r in all_refs if r not in questions]
    assert not missing, f"missing questions: {missing}"

    snapshot = {
        ref: {
            "id": q["id"],
            "updated_at": q["updated_at"],
            "status": q["status"],
            "verification_state": q["verification_state"],
            "content_sha256": content_hash(q),
            "prompt": q["prompt"],
            "stimulus": q["stimulus"],
            "options": q["options"],
            "correct_answer": q["correct_answer"],
            "explanation": q["explanation"],
        }
        for ref, q in questions.items()
    }
    snap_path = os.path.join(EVIDENCE, "pre_resolution_snapshot.json")
    if not os.path.exists(snap_path):
        json.dump(snapshot, open(snap_path, "w"), indent=1, ensure_ascii=False)

    # ---------------------------------------------------------------- content
    revisions: list[dict] = []
    originality: list[dict] = []
    applied_changes: list[dict] = []

    for ref in changed_refs:
        q = questions[ref]
        before = {
            "prompt": q["prompt"],
            "stimulus": q["stimulus"],
            "options": q["options"],
            "correct_answer": q["correct_answer"],
            "explanation": q["explanation"],
        }
        if ref in REWRITES:
            spec = REWRITES[ref]
            after = {
                "prompt": spec["prompt"],
                "stimulus": spec["stimulus"],
                "options": spec["options"],
                "correct_answer": spec["correct_answer"],
                "explanation": spec["explanation"],
            }
            kind, reason = "ORIGINAL_EDUOS_REWRITE", (
                "Frozen overlap-list row rewritten in original EduOS language; "
                "only the concept, formula and curriculum objective were retained. "
                "No copyright clearance is claimed."
            )
        else:
            fix = CONTENT_FIXES[ref]
            after = dict(before, explanation=fix["explanation"])
            kind, reason = "EXPLANATION_FIX", fix["reason"]

        before_sha, after_sha = sha(before), sha(after)
        already = before_sha == after_sha
        revisions.append(
            {
                "org_id": ORG,
                "question_id": q["id"],
                "external_ref": ref,
                "subject": subject_of(ref),
                "revision_reason": reason,
                "revision_kind": kind,
                "before_content": before,
                "after_content": after,
                "before_sha256": before_sha,
                "after_sha256": after_sha,
                "applied": True,
            }
        )
        applied_changes.append(
            {
                "external_ref": ref,
                "question_id": q["id"],
                "kind": kind,
                "before_sha256": before_sha,
                "after_sha256": after_sha,
                "no_op": already,
            }
        )

        if ref in REWRITES:
            rep = originality_report(ref, before, after)
            originality.append(
                {
                    "org_id": ORG,
                    "question_id": q["id"],
                    "external_ref": ref,
                    "subject": subject_of(ref),
                    "matched_shingle": rep["matched_shingle"],
                    "exact_match": rep["exact_match"],
                    "normalized_match": rep["normalized_match"],
                    "max_shingle_overlap": rep["max_shingle_overlap"],
                    "semantic_similarity": rep["semantic_similarity"],
                    "verdict": rep["verdict"],
                    "copyright_clearance_claimed": False,
                    "evidence": rep["evidence"],
                }
            )
            assert rep["verdict"] == "ORIGINAL_EDUOS_REWRITE_VERIFIED", (ref, rep)

    # Evidence is recorded before any content is touched.
    existing_rev = {
        (r["external_ref"], r["after_sha256"])
        for r in page("question_content_revisions?select=external_ref,after_sha256&order=id")
    }
    new_rev = [r for r in revisions if (r["external_ref"], r["after_sha256"]) not in existing_rev]
    if new_rev:
        insert("question_content_revisions", new_rev)

    for change, rev in zip(applied_changes, revisions):
        if not change["no_op"]:
            req(
                "PATCH",
                f"question_bank?id=eq.{rev['question_id']}",
                rev["after_content"],
                prefer="return=minimal",
            )

    existing_orig = {
        r["external_ref"]
        for r in page("question_originality_checks?select=external_ref&order=id")
    }
    new_orig = [o for o in originality if o["external_ref"] not in existing_orig]
    if new_orig:
        insert("question_originality_checks", new_orig)

    # --------------------------------------------------------- marking specs
    fresh = fetch_questions(all_refs)
    existing_specs = {
        r["external_ref"] for r in page("question_marking_specs?select=external_ref&order=id")
    }
    spec_rows = []
    for ref in spec_refs:
        if ref in existing_specs:
            continue
        q = fresh[ref]
        s = SPECS[ref]
        body = {k: s[k] for k in sorted(s)}
        spec_rows.append(
            {
                "org_id": ORG,
                "question_id": q["id"],
                "external_ref": ref,
                "subject": subject_of(ref),
                "spec_version": 1,
                "content_sha256": content_hash(q),
                "expected_conclusion": s["expected_conclusion"],
                "required_reasoning": s["required_reasoning"],
                "acceptable_equivalents": s["acceptable_equivalents"],
                "terminology": s["terminology"],
                "units": s["units"],
                "tolerance": s["tolerance"],
                "common_mistakes": s["common_mistakes"],
                "minimum_passing_evidence": s["minimum_passing_evidence"],
                "spec_sha256": sha(body),
            }
        )
    if spec_rows:
        insert("question_marking_specs", spec_rows)

    # -------------------------------------------------------- source register
    existing_src = {
        (r["external_ref"], r["source_title"])
        for r in page("curriculum_source_register?select=external_ref,source_title&order=id")
    }
    src_rows = []
    outcome_ids = sorted({fresh[r]["outcome_id"] for r in all_refs})
    outcomes = select(
        "assessment_outcomes?select=id,code,title&id=in.(" + ",".join(outcome_ids) + ")"
    )
    ocode = {o["id"]: (o["code"], o["title"]) for o in outcomes}
    for ref in all_refs:
        q = fresh[ref]
        subj = subject_of(ref)
        code, title = ocode[q["outcome_id"]]
        for src in (SOURCES[subj], CURRICULUM_SOURCE):
            if (ref, src["source_title"]) in existing_src:
                continue
            src_rows.append(
                {
                    "org_id": ORG,
                    "question_id": q["id"],
                    "external_ref": ref,
                    "subject": subj,
                    "source_title": src["source_title"],
                    "source_url": src["source_url"],
                    "section_ref": f"{subj} Class X syllabus — outcome {code}: {title}",
                    "accessed_at": src["accessed_at"],
                    "checksum_sha256": src["checksum_sha256"],
                    "alignment_note": (
                        "Item content is aligned to the syllabus topic for this outcome. "
                        "No substantial wording is taken from the official source."
                    ),
                    "licence_status": "NOT_ASSESSED",
                    "verbatim_copying": False,
                }
            )
    if src_rows:
        insert("curriculum_source_register", src_rows)

    out = {
        "resolution_id": RESOLUTION_ID,
        "run_date": date.today().isoformat(),
        "unresolved_rows_in": len(unresolved),
        "content_changes": applied_changes,
        "marking_specs_authored": len(SPECS),
        "marking_specs_inserted_this_run": len(spec_rows),
        "originality_checks": [
            {k: o[k] for k in ("external_ref", "exact_match", "normalized_match", "max_shingle_overlap", "semantic_similarity", "verdict")}
            for o in originality
        ],
        "source_rows_inserted_this_run": len(src_rows),
    }
    json.dump(out, open(os.path.join(EVIDENCE, "apply_result.json"), "w"), indent=1)
    print(json.dumps(out, indent=1)[:3000])


if __name__ == "__main__":
    main()
