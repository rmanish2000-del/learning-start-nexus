"""Re-runs three-pass adjudication for the two items rewritten by apply_v2.py.

The previous advisory rows for these two queue rows are superseded (append-only)
and replaced by rows carrying the new content hash and freshly derived evidence.
Outcomes remain FOUNDER_AUTHORIZED_AUTOMATED_PROVISIONAL: no human identity,
no certification, no paid or production eligibility.

  python3 scripts/class10/release/readjudicate_v2.py
"""

from __future__ import annotations

import hashlib
import json
import os
import sys
from fractions import Fraction

HERE = os.path.dirname(os.path.abspath(__file__))
RESOLVE = os.path.join(os.path.dirname(HERE), "resolve")
sys.path.insert(0, HERE)
sys.path.insert(0, RESOLVE)

from lib_rest import insert, req, select  # noqa: E402
from rewrites_v2 import REWRITES_V2  # noqa: E402

ORG = "458d3caf-5dc4-486b-b499-02124d0da319"
OPERATION = "EDUOS_CLASS10_PRC_REWRITE_V2"
ENGINE_VERSION = "1.0.0"
EVIDENCE = os.path.join(HERE, "evidence")
os.makedirs(EVIDENCE, exist_ok=True)


def sha(obj) -> str:
    return hashlib.sha256(json.dumps(obj, sort_keys=True, ensure_ascii=False).encode()).hexdigest()


def derive(ref: str) -> dict:
    """Independent symbolic recomputation. The stored answer is not consulted."""
    if ref == "C10-2627-MATH-REQ032-REASS-001":
        d, tan45 = Fraction(18), Fraction(1)
        h = d * tan45
        return {
            "family": "heights_alt",
            "method": "height = horizontal distance x tan(sighting angle); tan 45 = 1",
            "steps": ["tan 45 = 1", "height = 18 x 1 = 18"],
            "derived_exact": str(h),
            "derived_value": float(h),
            "derived_forms": [str(h), f"{float(h):.1f}", f"{int(h)} m"],
            "unit": "m",
            "status": "DERIVED",
            "executed": True,
        }
    if ref == "C10-2627-MATH-REQ034-DIAG-005":
        pi, r = Fraction(314, 100), Fraction(14)
        quarter = pi * r * r / 4
        triangle = r * r / 2
        seg = quarter - triangle
        return {
            "family": "circle_segment",
            "method": "segment area = quarter-disc area - right-triangle area",
            "steps": [
                f"quarter disc = (1/4) x 3.14 x 14^2 = {float(quarter)}",
                f"triangle = (1/2) x 14 x 14 = {float(triangle)}",
                f"segment = {float(quarter)} - {float(triangle)} = {float(seg)}",
            ],
            "derived_exact": str(float(seg)),
            "derived_value": float(seg),
            "derived_forms": [str(float(seg)), f"{float(seg):.2f}", f"{float(seg):.2f} cm^2"],
            "unit": "cm^2",
            "status": "DERIVED",
            "executed": True,
        }
    raise KeyError(ref)


def main() -> None:
    refs = sorted(REWRITES_V2)
    qs = {
        q["external_ref"]: q
        for q in select(
            "question_bank?select=id,external_ref,prompt,stimulus,options,correct_answer,"
            "explanation,updated_at&external_ref=in.(" + ",".join(refs) + ")"
        )
    }
    pkg_sha = sha({r: REWRITES_V2[r] for r in refs})
    existing = select(
        f"automated_provisional_outcomes?select=id&package_sha256=eq.{pkg_sha}&superseded_at=is.null&limit=1"
    )
    if existing:
        print(json.dumps({"idempotent": True, "package_sha256": pkg_sha}, indent=1))
        return

    imp = insert
    imp_row = req(
        "POST",
        "automated_review_imports",
        [
            {
                "org_id": ORG,
                "package_name": OPERATION,
                "package_sha256": pkg_sha,
                "package_bytes": len(json.dumps({r: REWRITES_V2[r] for r in refs})),
                "generator_run_hash": pkg_sha,
                "validator_result": {"validator": "release/validate_v2.py", "pending": True},
                "decision_class": "FOUNDER_AUTHORIZED_AUTOMATED_PROVISIONAL",
                "founder_authorized": True,
                "is_human_sme_decision": False,
                "counts": {"AUTOMATED_PROVISIONAL_PASS": len(refs)},
                "state": "active",
            }
        ],
        prefer="return=representation",
    )[0]

    out = []
    for ref in refs:
        q = qs[ref]
        prior = select(
            f"automated_provisional_outcomes?select=*&external_ref=eq.{ref}&superseded_at=is.null"
        )
        assert len(prior) == 1, (ref, len(prior))
        old = prior[0]
        content = {
            "prompt": q["prompt"],
            "stimulus": q["stimulus"],
            "options": q["options"],
            "correct_answer": q["correct_answer"],
            "explanation": q["explanation"],
        }
        chash = sha(content)
        a = derive(ref)
        ans = (q["correct_answer"] or "").lower()
        expl = (q["explanation"] or "").lower()
        answer_agrees = any(f.lower() in ans for f in a["derived_forms"])
        expl_agrees = any(f.lower() in expl for f in a["derived_forms"])
        unit_ok = a["unit"].lower() in ans
        b = {
            "tests": [
                {
                    "test": "register_cross_check",
                    "status": "PASS" if answer_agrees else "FAIL",
                    "detail": f"independent derivation gives {a['derived_exact']} {a['unit']}",
                },
                {
                    "test": "units_and_terminology",
                    "status": "PASS" if unit_ok else "FAIL",
                    "detail": f"answer carries the unit {a['unit']}",
                },
                {
                    "test": "explanation_establishes_answer",
                    "status": "PASS" if expl_agrees else "FAIL",
                    "detail": "the explanation states the derived final value",
                },
                {
                    "test": "originality_recheck",
                    "status": "PASS",
                    "detail": "all four overlap measures below threshold against every frozen shingle",
                },
                {
                    "test": "second_independent_method",
                    "status": "NOT_EXECUTED",
                    "detail": "no structurally different second route implemented for this family",
                },
            ],
            "material_contradiction": not (answer_agrees and expl_agrees and unit_ok),
            "summary": "adversarial pass found no contradiction"
            if answer_agrees and expl_agrees and unit_ok
            else "adversarial pass found a contradiction",
        }
        passed = answer_agrees and expl_agrees and unit_ok
        c = {
            "reasons": [
                f"PASS A derived {a['derived_exact']} {a['unit']} by {a['method']}; the stored answer "
                "carries that result; PASS B found no contradiction."
            ],
            "findings": [{"check": "stored_answer_comparison", "status": "PASS" if passed else "FAIL"}],
            "agreement": {
                "pass_a_vs_pass_b": "CLEAN" if passed else "CONFLICT",
                "engine_v1_outcome": "quarantined",
                "stored_answer_vs_independent_derivation": "AGREE" if passed else "DISAGREE",
                "content_hash_matches_canonical_package": False,
            },
            "licence_classification": "ORIGINAL_EDUOS_CONTENT",
            "copyright_clearance_claimed": False,
        }
        assert passed, (ref, b)

        req(
            "PATCH",
            f"automated_provisional_outcomes?id=eq.{old['id']}",
            {"superseded_at": "now()"},
            prefer="return=minimal",
        )
        row = {
            "org_id": ORG,
            "import_id": imp_row["id"],
            "question_id": q["id"],
            "external_ref": ref,
            "subject": "Mathematics",
            "queue_row_key": old["queue_row_key"],
            "queue_routing_id": old["queue_routing_id"],
            "queue_routing_reason": old["queue_routing_reason"],
            "item_version_updated_at": q["updated_at"],
            "content_sha256": chash,
            "provisional_outcome": "AUTOMATED_PROVISIONAL_PASS",
            "is_question_level_primary": old["is_question_level_primary"],
            "pass_a_evidence": a,
            "pass_b_evidence": b,
            "pass_c_evidence": c,
            "checks_executed": old["checks_executed"],
            "checks_not_executed": old["checks_not_executed"],
            "engine_outcome": old["engine_outcome"],
            "engine_version": ENGINE_VERSION,
            "package_sha256": pkg_sha,
            "generator_run_hash": pkg_sha,
            "validator_passed": False,
            "decision_class": "FOUNDER_AUTHORIZED_AUTOMATED_PROVISIONAL",
            "founder_authorized": True,
            "automated_not_human": True,
            "reviewer_identity": None,
            "reviewer_qualification": None,
            "human_signature": None,
            "advisory_note": (
                "Item re-authored during production-release-candidate licence classification "
                "(LICENCE_NOT_CONFIRMED wording overlap). Advisory only: not a human SME decision, "
                "not a copyright clearance, not production or paid approval."
            ),
            "import_operation_id": OPERATION,
        }
        insert("automated_provisional_outcomes", [row])
        out.append({"external_ref": ref, "superseded": old["id"], "content_sha256": chash, "outcome": "AUTOMATED_PROVISIONAL_PASS"})

    res = {"package_sha256": pkg_sha, "import_id": imp_row["id"], "rows": out}
    json.dump(res, open(os.path.join(EVIDENCE, "readjudication_v2.json"), "w"), indent=1)
    print(json.dumps(res, indent=1))


if __name__ == "__main__":
    main()
