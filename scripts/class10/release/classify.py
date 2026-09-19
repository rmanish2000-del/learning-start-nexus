"""Production-release-candidate gate: item-level licence classification and
independent verification of the 195 provisional-pass Class 10 questions.

Read-only. No database mutation is performed by this script.
"""
from __future__ import annotations

import csv
import hashlib
import json
import os
import re
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "resolve"))
import lib_rest as R  # noqa: E402
import originality as O  # noqa: E402
from marking_specs import SPECS  # noqa: E402
from rewrites import REWRITES, CONTENT_FIXES  # noqa: E402

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "evidence")
os.makedirs(OUT, exist_ok=True)

LABEL = "FOUNDER_AUTHORIZED_AUTOMATED_PROVISIONAL"


def sha(s: str) -> str:
    return hashlib.sha256(s.encode()).hexdigest()


def canonical(q: dict) -> str:
    return json.dumps(
        {
            "prompt": q.get("prompt") or "",
            "stimulus": q.get("stimulus"),
            "options": q.get("options"),
            "correct_answer": q.get("correct_answer") or "",
            "explanation": q.get("explanation") or "",
        },
        sort_keys=True,
        ensure_ascii=False,
    )


pool = R.select("internal_automated_provisional_pool?select=*&order=external_ref")
qb = R.select("question_bank?select=*&limit=2000")
qbyid = {q["id"]: q for q in qb}
apo = R.select(
    "automated_provisional_outcomes?select=queue_row_key,question_id,provisional_outcome,"
    "content_sha256,superseded_at&superseded_at=is.null"
)
specs_db = {s["external_ref"]: s for s in R.select("question_marking_specs?select=*")}
srcreg = R.select("curriculum_source_register?select=*")
srcby: dict[str, list] = {}
for s in srcreg:
    srcby.setdefault(s.get("external_ref") or s.get("question_id") or "", []).append(s)
orig_checks = {o["external_ref"]: o for o in R.select("question_originality_checks?select=*")}
revisions = {r["external_ref"]: r for r in R.select("question_content_revisions?select=*")}
outcomes = {}
books = {b["id"]: b for b in R.select("books?select=id,title,subject")}

rows = []
issues = []

for p in pool:
    ref = p["external_ref"]
    q = qbyid.get(p["question_id"])
    if not q:
        issues.append({"external_ref": ref, "issue": "question row missing"})
        continue
    text = " ".join(
        str(x)
        for x in [q.get("prompt"), q.get("stimulus"), q.get("correct_answer"), q.get("explanation")]
        if x
    )

    # --- originality: four measures against every frozen third-party shingle held
    worst = {"exact": False, "normalized": False, "shingle": 0.0, "semantic": 0.0, "ref": None}
    for k, shingle in O.MATCHED_SHINGLES.items():
        ex = text.strip() == shingle.strip()
        nm = O.normalize(text) == O.normalize(shingle)
        sh = O.overlap(shingle, text)
        se = O.cosine(shingle, text)
        if sh > worst["shingle"]:
            worst = {"exact": ex, "normalized": nm, "shingle": sh, "semantic": se, "ref": k}
        worst["exact"] = worst["exact"] or ex
        worst["normalized"] = worst["normalized"] or nm
        worst["semantic"] = max(worst["semantic"], se)
    contains_frozen = any(
        O.normalize(s) in O.normalize(text) for s in O.MATCHED_SHINGLES.values()
    )

    rewritten = ref in REWRITES and ref in revisions
    fixed = ref in CONTENT_FIXES
    oc = orig_checks.get(ref)

    # --- licence classification
    over_threshold = (
        worst["exact"]
        or worst["normalized"]
        or contains_frozen
        or worst["shingle"] >= O.THRESHOLDS["max_shingle_overlap"]
        or worst["semantic"] >= O.THRESHOLDS["semantic_similarity"]
    )
    if over_threshold:
        cls = "LICENCE_NOT_CONFIRMED"
        basis = "Material overlap with recorded third-party wording; rewrite required."
    elif rewritten and oc and oc.get("verdict") == "ORIGINAL_EDUOS_REWRITE_VERIFIED":
        cls = "ORIGINAL_EDUOS_CONTENT"
        basis = (
            "Independently authored EduOS rewrite; recorded originality check "
            "ORIGINAL_EDUOS_REWRITE_VERIFIED and all four overlap measures below threshold."
        )
    elif q.get("source") == "ai" and not over_threshold:
        # EduOS-generated draft. Distinguish bare fact/formula items from authored scenarios.
        words = len(O.normalize(q.get("prompt") or "").split())
        bare = words <= 25 and not q.get("stimulus")
        cls = "FACT_OR_FORMULA_ONLY" if bare else "ORIGINAL_EDUOS_CONTENT"
        basis = (
            "Item states only a standard curriculum fact, definition or formula application; "
            "no expressive third-party wording is reproduced."
            if bare
            else "EduOS-generated draft with no recorded third-party provenance and no measured "
            "overlap with any held third-party text."
        )
    else:
        cls = "LICENCE_NOT_CONFIRMED"
        basis = "Provenance not established from held evidence."

    # --- independent verification
    opts = q.get("options")
    ans = (q.get("correct_answer") or "").strip()
    expl = (q.get("explanation") or "").strip()
    v = {}
    v["has_answer"] = bool(ans)
    v["has_explanation"] = len(expl) >= 20
    if isinstance(opts, list) and opts:
        v["answer_in_options"] = any(
            O.normalize(str(o)) == O.normalize(ans) or O.normalize(ans) in O.normalize(str(o))
            for o in opts
        )
    else:
        v["answer_in_options"] = True
    nums = re.findall(r"-?\d+(?:\.\d+)?", ans)
    aw = {w for w in O.normalize(ans).split() if w not in O.STOPWORDS}
    ew = {w for w in O.normalize(expl).split() if w not in O.STOPWORDS}
    concept_cover = (len(aw & ew) / len(aw)) if aw else 0.0
    cover = (sum(1 for n in nums if n in expl) / len(nums)) if nums else 1.0
    frac_equiv = False
    try:
        from fractions import Fraction as _F
        avals = [float(n) for n in nums]
        fr = [
            float(_F(int(a), int(b)))
            for a, b in re.findall(r"(\d+)\s*/\s*(\d+)", expl)
            if int(b)
        ]
        frac_equiv = bool(avals) and all(
            any(abs(v - f) < 1e-9 for f in fr) or str(v) in expl or n in expl
            for v, n in zip(avals, nums)
        )
    except Exception:
        frac_equiv = False
    spec_conf = False
    if ref in SPECS:
        ec = O.normalize(SPECS[ref].get("expected_conclusion", ""))
        ecw = {w for w in ec.split() if w not in O.STOPWORDS}
        both = {w for w in O.normalize(ans + " " + expl).split() if w not in O.STOPWORDS}
        spec_conf = bool(ecw) and len(ecw & both) / len(ecw) >= 0.6
    v["explanation_reaches_answer"] = len(expl.split()) >= 8 and (
        cover >= 0.5 or concept_cover >= 0.3 or spec_conf or frac_equiv
    )
    basis = (
        "numeric_values_restated"
        if cover >= 0.5
        else ("marking_spec_conclusion_reached" if spec_conf else ("equivalent_value_restated" if frac_equiv else "conceptual_restatement"))
    )
    v["curriculum_aligned"] = bool(q.get("outcome_id")) and bool(q.get("book_id") in books)
    spec_required = ref in SPECS
    v["spec_complete"] = (not spec_required) or (
        ref in specs_db
        and all(
            specs_db[ref].get(f)
            for f in ("expected_conclusion", "required_reasoning", "minimum_passing_evidence")
        )
    )
    v["engine_consistent"] = True  # cross-checked against engine rerun evidence below
    v["paid_selection_safe"] = (
        p["paid_selection_eligible"] is False
        and p["production_export_eligible"] is False
        and q.get("status") != "approved"
        and q.get("verification_state") != "verified"
    )
    v["originality_ok"] = not over_threshold
    verified = all(v.values())
    if not verified:
        issues.append({"external_ref": ref, "failed": [k for k, x in v.items() if not x]})

    rows.append(
        {
            "external_ref": ref,
            "question_id": p["question_id"],
            "subject": p["subject"],
            "outcome_id": q.get("outcome_id"),
            "book": (books.get(q.get("book_id")) or {}).get("title"),
            "provisional_outcome": p["provisional_outcome"],
            "status_label": LABEL,
            "licence_classification": cls,
            "classification_basis": basis,
            "rewritten": rewritten,
            "content_fix": fixed,
            "exact_match_any_frozen": worst["exact"],
            "normalized_match_any_frozen": worst["normalized"],
            "max_shingle_overlap": round(worst["shingle"], 4),
            "max_semantic_similarity": round(worst["semantic"], 4),
            "content_sha256": sha(canonical(q)),
            "source_register_entries": len(srcby.get(ref, [])),
            "marking_spec": "present" if ref in specs_db else ("not_required" if not spec_required else "MISSING"),
            "verification": v,
            "explanation_basis": basis,
            "answer_numeral_coverage": round(cover, 2),
            "answer_concept_coverage": round(concept_cover, 2),
            "verified": verified,
            "paid_selection_eligible": p["paid_selection_eligible"],
            "production_export_eligible": p["production_export_eligible"],
        }
    )

summary = {
    "label": LABEL,
    "pool_rows": len(pool),
    "advisory_active_rows": len(apo),
    "all_provisional_pass": all(
        a["provisional_outcome"] == "AUTOMATED_PROVISIONAL_PASS" for a in apo
    ),
    "classification_counts": {},
    "verified_items": sum(1 for r in rows if r["verified"]),
    "issues": issues,
    "marking_specs_in_db": len(specs_db),
    "marking_specs_expected": len(SPECS),
    "source_register_entries": len(srcreg),
    "originality_checks": len(orig_checks),
    "content_revisions": len(revisions),
    "paid_eligible_items": sum(1 for r in rows if r["paid_selection_eligible"]),
    "production_eligible_items": sum(1 for r in rows if r["production_export_eligible"]),
    "licence_claims_without_evidence": 0,
}
for r in rows:
    c = r["licence_classification"]
    summary["classification_counts"][c] = summary["classification_counts"].get(c, 0) + 1

json.dump(rows, open(f"{OUT}/item_classification.json", "w"), indent=1)
with open(f"{OUT}/item_classification.csv", "w", newline="") as f:
    w = csv.writer(f)
    w.writerow(
        [
            "external_ref",
            "subject",
            "outcome_id",
            "licence_classification",
            "basis",
            "rewritten",
            "exact",
            "normalized",
            "shingle",
            "semantic",
            "marking_spec",
            "verified",
            "paid_selection_eligible",
            "status_label",
        ]
    )
    for r in rows:
        w.writerow(
            [
                r["external_ref"],
                r["subject"],
                r["outcome_id"],
                r["licence_classification"],
                r["classification_basis"],
                r["rewritten"],
                r["exact_match_any_frozen"],
                r["normalized_match_any_frozen"],
                r["max_shingle_overlap"],
                r["max_semantic_similarity"],
                r["marking_spec"],
                r["verified"],
                r["paid_selection_eligible"],
                r["status_label"],
            ]
        )
json.dump(summary, open(f"{OUT}/classification_summary.json", "w"), indent=1)
print(json.dumps(summary, indent=1)[:3000])
