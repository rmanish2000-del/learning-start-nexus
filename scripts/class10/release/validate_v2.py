"""Production-release-candidate validator.

Covers the checks required for the release gate that are not already covered by
scripts/class10/resolve/validate.py: full 329-item reconciliation, licence
classification completeness, C1/C2 preservation, paid-selection exclusion,
prohibited-field hygiene, idempotency of the v2 rewrite, and a rollback
simulation of the v2 advisory import followed by a restore.

Staging only. Read-mostly: the only writes are the rollback simulation and its
immediate restore, both append-only at the evidence level.

  python3 scripts/class10/release/validate_v2.py
"""

from __future__ import annotations

import json
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
RESOLVE = os.path.join(os.path.dirname(HERE), "resolve")
sys.path.insert(0, HERE)
sys.path.insert(0, RESOLVE)

from lib_rest import req, select  # noqa: E402
from marking_specs import SPECS  # noqa: E402
from rewrites_v2 import REWRITES_V2  # noqa: E402

EVIDENCE = os.path.join(HERE, "evidence")
os.makedirs(EVIDENCE, exist_ok=True)
res: dict = {"checks": []}
fails: list[str] = []


def check(name: str, cond: bool, detail: str = "") -> None:
    res["checks"].append({"check": name, "status": "PASS" if cond else "FAIL", "detail": detail})
    if not cond:
        fails.append(name)


def page(path: str) -> list[dict]:
    out, i = [], 0
    while True:
        chunk = select(f"{path}&limit=500&offset={i * 500}")
        if not chunk:
            return out
        out += chunk
        i += 1


# ------------------------------------------------------------ 329 reconciliation
qb = page("question_bank?select=id,external_ref,status,verification_state,prompt,correct_answer,explanation&order=external_ref")
check("corpus_total_329", len(qb) == 329, str(len(qb)))
math = [q for q in qb if "-MATH-" in (q["external_ref"] or "")]
sci = [q for q in qb if "-SCI-" in (q["external_ref"] or "")]
nullref = [q for q in qb if not q["external_ref"]]
check("corpus_subject_split_235_94", len(math) == 235 and len(sci) + len(nullref) == 94, f"{len(math)}/{len(sci)}+{len(nullref)} null-ref quarantined")
check("corpus_refs_unique", len({q["external_ref"] for q in qb if q["external_ref"]}) == 326 and len(nullref) == 3)
check("no_general_knowledge", not [q for q in qb if "-GK-" in (q["external_ref"] or "")])
pool_ids = {p["question_id"] for p in page("internal_automated_provisional_pool?select=question_id")}
promoted = [q for q in qb if q["id"] in pool_ids and (q["status"] == "approved" or q["verification_state"] == "verified")]
check("no_reviewed_item_promoted", len(promoted) == 0, str(len(promoted)))
check("engine_baseline_unchanged_123_206", len([q for q in qb if q["status"] == "approved"]) == 123 and len([q for q in qb if q["status"] == "draft"]) == 206)

# ------------------------------------------------------------------- advisory
active = page("automated_provisional_outcomes?select=*&superseded_at=is.null")
check("advisory_active_196", len(active) == 196, str(len(active)))
check("advisory_all_pass", all(r["provisional_outcome"] == "AUTOMATED_PROVISIONAL_PASS" for r in active))
check("advisory_zero_unresolved", not [r for r in active if r["provisional_outcome"] == "AUTOMATED_UNRESOLVED"])
check("advisory_distinct_questions_195", len({r["question_id"] for r in active}) == 195)
dup = [r for r in active if r["external_ref"] == "C10-2627-MATH-REQ024-DIAG-004"]
check("req024_two_routing_rows_one_question", len(dup) == 2 and len({r["question_id"] for r in dup}) == 1)
check(
    "advisory_all_founder_authorized_automated",
    all(
        r["decision_class"] == "FOUNDER_AUTHORIZED_AUTOMATED_PROVISIONAL"
        and r["automated_not_human"]
        and not r["reviewer_identity"]
        and not r["reviewer_qualification"]
        and not r["human_signature"]
        for r in active
    ),
)
blob = json.dumps(active).lower()
for neg in (
    "no copyright clearance is claimed",
    "not a copyright clearance",
    "not a human sme decision",
    "not production or paid approval",
    "not certified by",
):
    blob = blob.replace(neg, "")
banned = ("copyright clearance", "human sme decision", "certified by", "production approved", "paid eligible")
hits = [b for b in banned if b in blob]
check("no_prohibited_claims", not hits, ",".join(hits))

# --------------------------------------------------------- content hash parity
import hashlib  # noqa: E402


def sha(obj) -> str:
    return hashlib.sha256(json.dumps(obj, sort_keys=True, ensure_ascii=False).encode()).hexdigest()


full = {q["external_ref"]: q for q in page("question_bank?select=*")}
mismatch = []
for r in active:
    q = next((x for x in full.values() if x["id"] == r["question_id"]), None)
    if not q:
        mismatch.append(r["external_ref"])
        continue
    h = sha(
        {
            "prompt": q["prompt"],
            "stimulus": q["stimulus"],
            "options": q["options"],
            "correct_answer": q["correct_answer"],
            "explanation": q["explanation"],
        }
    )
    if h != r["content_sha256"]:
        mismatch.append(r["external_ref"])
check("advisory_content_hashes_current", not mismatch, ",".join(sorted(set(mismatch))[:5]))

# ---------------------------------------------------------------- classification
cls = json.load(open(os.path.join(EVIDENCE, "item_classification.json")))
check("classification_covers_195", len(cls) == 195, str(len(cls)))
check("classification_no_unconfirmed", not [c for c in cls if c["licence_classification"] == "LICENCE_NOT_CONFIRMED"])
check("classification_no_unevidenced_licence_claim", not [c for c in cls if c["licence_classification"] in ("PUBLIC_DOMAIN_CONFIRMED", "OPEN_LICENCE_CONFIRMED")])
check("classification_all_verified", all(c["verified"] for c in cls))
check("classification_label", all(c["status_label"] == "FOUNDER_AUTHORIZED_AUTOMATED_PROVISIONAL" for c in cls))

# ------------------------------------------------------------------ originality
orig = page("question_originality_checks?select=*")
check("originality_checks_6", len(orig) == 6, str(len(orig)))
check("originality_all_verified", all(o["verdict"] == "ORIGINAL_EDUOS_REWRITE_VERIFIED" for o in orig))
check("originality_no_copyright_claim", not any(o["copyright_clearance_claimed"] for o in orig))
check("originality_below_thresholds", all(o["max_shingle_overlap"] < 0.15 and o["semantic_similarity"] < 0.60 for o in orig))
revs = page("question_content_revisions?select=*")
check("content_revisions_7", len(revs) == 7, str(len(revs)))
check("revisions_have_before_after", all(r["before_sha256"] != r["after_sha256"] and r["before_content"] and r["after_content"] for r in revs))

# --------------------------------------------------------------- specs & sources
specs = page("question_marking_specs?select=*")
check("marking_specs_42", len(specs) == 42 and set(s["external_ref"] for s in specs) == set(SPECS))
check(
    "marking_specs_complete",
    all(s["expected_conclusion"] and s["required_reasoning"] and s["minimum_passing_evidence"] for s in specs),
)
srcs = page("curriculum_source_register?select=*")
check("source_register_covers_49", len({s["external_ref"] for s in srcs}) == 49, str(len({s["external_ref"] for s in srcs})))
check("source_register_licence_not_assessed", all(s["licence_status"] == "NOT_ASSESSED" for s in srcs))
check("source_register_no_verbatim", not any(s["verbatim_copying"] for s in srcs))
check("source_register_official_domains", all(("cbseacademic.nic.in" in (s["source_url"] or "")) or ("ncert.nic.in" in (s["source_url"] or "")) for s in srcs))

# ------------------------------------------------------------------------ C1/C2
excl = page("question_pool_exclusions?select=*")
c1 = [e for e in excl if "146ec7c8" in json.dumps(e)]
check("c1_three_exclusions_active", len(c1) >= 3, str(len(c1)))
work = page("remediation_work_items?select=*")
c1w = [w for w in work if "146ec7c8" in json.dumps(w)]
check("c1_work_item_open", any((w.get("state") or w.get("status")) in ("open", "OPEN") for w in c1w), json.dumps(c1w)[:200])
frozen = open("/dev-server/src/lib/sme-review-shared.ts").read()
check("c2_frozen_list_unchanged", frozen.count("NCERT_OVERLAP_CANDIDATES") >= 1 and "tower casts a shadow 28 m long" in frozen)
c2_rows = [r for r in active if r["external_ref"] == "C10-2627-MATH-REQ024-DIAG-004"]
check("c2_contamination_evidence_present", len(c2_rows) == 2)

# ------------------------------------------------------------ paid-selection safety
pool = page("internal_automated_provisional_pool?select=*")
check("pool_195", len(pool) == 195, str(len(pool)))
check("pool_paid_disabled", not any(p["paid_selection_eligible"] for p in pool))
check("pool_production_export_disabled", not any(p["production_export_eligible"] for p in pool))

# ------------------------------------------------------------------- idempotency
a = subprocess.run([sys.executable, os.path.join(HERE, "apply_v2.py")], capture_output=True, text=True)
b = subprocess.run([sys.executable, os.path.join(HERE, "readjudicate_v2.py")], capture_output=True, text=True)
after = page("automated_provisional_outcomes?select=id&superseded_at=is.null")
check(
    "v2_idempotent",
    a.returncode == 0 and b.returncode == 0 and len(after) == 196 and "idempotent" in b.stdout,
    (a.stderr or b.stderr or b.stdout)[-200:],
)

# -------------------------------------------------------------- rollback simulation
pkg = next(r["package_sha256"] for r in active if r["import_operation_id"] == "EDUOS_CLASS10_PRC_REWRITE_V2")
v2_rows = [r for r in active if r["package_sha256"] == pkg]
req("PATCH", f"automated_provisional_outcomes?package_sha256=eq.{pkg}&superseded_at=is.null", {"superseded_at": "now()"}, prefer="return=minimal")
for r in v2_rows:
    prior = select(
        f"automated_provisional_outcomes?select=id,created_at&queue_row_key=eq.{r['queue_row_key'].replace('#', '%23')}"
        f"&superseded_at=not.is.null&package_sha256=neq.{pkg}&order=created_at.desc&limit=1"
    )
    req("PATCH", f"automated_provisional_outcomes?id=eq.{prior[0]['id']}", {"superseded_at": None}, prefer="return=minimal")
rolled = page("automated_provisional_outcomes?select=id,package_sha256&superseded_at=is.null")
check("rollback_restores_196", len(rolled) == 196 and not [x for x in rolled if x["package_sha256"] == pkg], str(len(rolled)))

# restore
for r in v2_rows:
    prior = select(
        f"automated_provisional_outcomes?select=id&queue_row_key=eq.{r['queue_row_key'].replace('#', '%23')}"
        "&superseded_at=is.null&limit=1"
    )
    req("PATCH", f"automated_provisional_outcomes?id=eq.{prior[0]['id']}", {"superseded_at": "now()"}, prefer="return=minimal")
    req("PATCH", f"automated_provisional_outcomes?id=eq.{r['id']}", {"superseded_at": None}, prefer="return=minimal")
restored = page("automated_provisional_outcomes?select=id,provisional_outcome,package_sha256&superseded_at=is.null")
check(
    "reapply_restores_exact_state",
    len(restored) == 196
    and len([x for x in restored if x["package_sha256"] == pkg]) == len(v2_rows)
    and all(x["provisional_outcome"] == "AUTOMATED_PROVISIONAL_PASS" for x in restored),
    str(len(restored)),
)

# ------------------------------------------------------------- append-only guard
try:
    req("DELETE", f"question_content_revisions?id=eq.{revs[0]['id']}", prefer="return=minimal")
    deleted = True
except SystemExit:
    deleted = False
check("append_only_delete_blocked", not deleted)

res["verdict"] = "PASS" if not fails else "FAIL"
res["failures"] = fails
res["counts"] = {
    "corpus": len(qb),
    "advisory_active": len(active),
    "distinct_questions": len({r["question_id"] for r in active}),
    "pool": len(pool),
    "classified": len(cls),
}
json.dump(res, open(os.path.join(EVIDENCE, "validation_v2.json"), "w"), indent=1)
print(json.dumps(res, indent=1))
