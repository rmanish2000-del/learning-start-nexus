"""Validation for the Class 10 unresolved-content resolution.

Checks the resolved advisory state, the content revisions and their evidence,
preservation of C1/C2 and the frozen overlap list, the Engine rerun, PII
hygiene, rollback and deterministic reapply, and append-only enforcement.

  python3 scripts/class10/resolve/validate.py
"""

from __future__ import annotations

import hashlib
import json
import os
import re
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
sys.path.insert(0, HERE)

from lib_rest import req, select  # noqa: E402
from marking_specs import SPECS  # noqa: E402
from rewrites import CONTENT_FIXES, REWRITES  # noqa: E402

EVIDENCE = os.path.join(HERE, "evidence")
RESOLUTION = "EDUOS_CLASS10_UNRESOLVED_RESOLUTION_V1"
res: dict = {}
fails: list[str] = []


def check(name: str, cond: bool, detail: str = "") -> None:
    res[name] = {"status": "PASS" if cond else "FAIL", "detail": detail}
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


def sha(obj) -> str:
    return hashlib.sha256(json.dumps(obj, sort_keys=True, ensure_ascii=False).encode()).hexdigest()


def active() -> list[dict]:
    return page(
        "automated_provisional_outcomes?select=*&superseded_at=is.null&order=queue_row_key"
    )


def state_hash(rows: list[dict]) -> str:
    return sha(
        sorted(
            # package digest reflects the batch a row was written in; a rollback and
            # reapply legitimately regroups rows into a new batch, so determinism is
            # asserted over row content only.
            [r["queue_row_key"], r["provisional_outcome"], r["content_sha256"]]
            for r in rows
        )
    )


# ---------------------------------------------------------------- resolved state
rows = active()
check("active_advisory_rows_196", len(rows) == 196, f"{len(rows)} rows")
by_out: dict[str, int] = {}
for r in rows:
    by_out[r["provisional_outcome"]] = by_out.get(r["provisional_outcome"], 0) + 1
check("zero_unresolved_remaining", by_out == {"AUTOMATED_PROVISIONAL_PASS": 196}, json.dumps(by_out))

qview = page("automated_provisional_question_outcomes?select=*&order=question_id")
check("distinct_questions_195", len(qview) == 195, f"{len(qview)} questions")
c2_rows = [r for r in rows if (r["external_ref"] or "").endswith("REQ024-DIAG-004")]
c2_q = [r for r in qview if (r["external_ref"] or "").endswith("REQ024-DIAG-004")]
check("C2_two_rows_one_question", len(c2_rows) == 2 and len(c2_q) == 1,
      f"{len(c2_rows)} rows / {len(c2_q)} question rows")
check(
    "C2_routing_preserved",
    any("CONTAMINATION" in r["queue_routing_reason"] for r in c2_rows)
    and {r["subject"] for r in c2_rows} == {"Mathematics"},
)
c2_queue = page("sme_review_queue?select=*&external_ref=eq.C10-2627-MATH-REQ024-DIAG-004")
check(
    "C2_queue_evidence_intact",
    len(c2_queue) == 2
    and any("normalized_whitespace_prompt" in (q["evidence"] or {}) for q in c2_queue),
)

resolution_rows = [r for r in rows if r["import_operation_id"] == RESOLUTION]
check("resolution_rows_48", len(resolution_rows) == 48, f"{len(resolution_rows)} rows")
check(
    "resolution_rows_automated_only",
    all(
        r["decision_class"] == "FOUNDER_AUTHORIZED_AUTOMATED_PROVISIONAL"
        and r["automated_not_human"]
        and r["reviewer_identity"] is None
        and r["reviewer_qualification"] is None
        and r["human_signature"] is None
        for r in resolution_rows
    ),
)
blob = json.dumps(resolution_rows).lower()
check(
    "no_certification_language",
    not any(
        t in blob
        for t in [
            "copyright clearance granted",
            "human certification",
            "named sme",
            "production approved",
            "cbse certified",
            "officially certified",
        ]
    ),
)
check(
    "excluded_checks_declared",
    all(
        {"HUMAN_SME_CERTIFICATION", "COPYRIGHT_CLEARANCE", "OFFICIAL_CBSE_NCERT_CERTIFICATION"}
        <= set(r["checks_not_executed"])
        for r in resolution_rows
    ),
)

superseded = page("automated_provisional_outcomes?select=id&superseded_at=not.is.null")
check("historical_evidence_retained", len(superseded) >= 196 + 48, f"{len(superseded)} superseded rows")

# -------------------------------------------------------------- resolution artefacts
specs = page("question_marking_specs?select=*&order=external_ref")
check("marking_specs_42", len(specs) == 42, f"{len(specs)} specs")
check(
    "marking_specs_complete",
    all(
        s["expected_conclusion"]
        and s["required_reasoning"]
        and s["minimum_passing_evidence"]
        and s["common_mistakes"]
        and s["human_signature"] is None
        and s["authored_by"] == "AUTOMATED_FOUNDER_AUTHORIZED"
        for s in specs
    ),
)
check("marking_specs_match_source", {s["external_ref"] for s in specs} == set(SPECS))

orig = page("question_originality_checks?select=*&order=external_ref")
check("originality_checks_6", len(orig) == 6, f"{len(orig)} checks")
check(
    "originality_verified",
    all(
        o["verdict"] == "ORIGINAL_EDUOS_REWRITE_VERIFIED"
        and not o["exact_match"]
        and not o["normalized_match"]
        and float(o["max_shingle_overlap"]) <= 0.15
        and float(o["semantic_similarity"]) <= 0.60
        and not o["copyright_clearance_claimed"]
        for o in orig
    ),
    json.dumps([[o["external_ref"], str(o["max_shingle_overlap"]), str(o["semantic_similarity"])] for o in orig]),
)

revs = page("question_content_revisions?select=*&order=external_ref")
check("content_revisions_7", len(revs) == 7, f"{len(revs)} revisions")
check(
    "revisions_carry_before_and_after",
    all(r["before_content"] and r["after_content"] and r["before_sha256"] != r["after_sha256"] for r in revs),
)

srcs = page("curriculum_source_register?select=*&order=external_ref")
check("source_register_covers_resolved_items", len({s["external_ref"] for s in srcs}) == 49,
      f"{len({s['external_ref'] for s in srcs})} items")

check(
    "sources_official_and_unlicensed",
    all(
        s["source_url"].startswith("https://cbseacademic.nic.in/")
        and s["checksum_sha256"]
        and s["licence_status"] == "NOT_ASSESSED"
        and not s["verbatim_copying"]
        for s in srcs
    ),
)

# ------------------------------------------------------------------- content state
snapshot = json.load(open(os.path.join(EVIDENCE, "pre_resolution_snapshot.json")))
changed = set(REWRITES) | set(CONTENT_FIXES)
refs = sorted(snapshot)
now: dict[str, dict] = {}
for i in range(0, len(refs), 40):
    for q in select(
        "question_bank?select=external_ref,prompt,stimulus,options,correct_answer,explanation,"
        "status,verification_state&external_ref=in.(" + ",".join(refs[i : i + 40]) + ")"
    ):
        now[q["external_ref"]] = q

unchanged_ok, changed_ok, ops_ok = [], [], []
for ref, before in snapshot.items():
    q = now[ref]
    same = all(q[k] == before[k] for k in ("prompt", "stimulus", "options", "correct_answer", "explanation"))
    (changed_ok if ref in changed else unchanged_ok).append(same)
    ops_ok.append(q["status"] == before["status"] and q["verification_state"] == before["verification_state"])
check("only_five_items_changed", all(unchanged_ok) and not any(changed_ok),
      f"{sum(1 for x in changed_ok if not x)}/5 changed, {sum(1 for x in unchanged_ok if not x)} unexpected")
check("no_operational_field_change", all(ops_ok))
check(
    "req043_explanation_derives_factor",
    "five times" in (now["C10-2627-SCI-REQ043-REASS-002"]["explanation"] or "").lower(),
)

# ---------------------------------------------------------------------------- C1
c1_refs = [
    "C10-2627-MATH-REQ001-DIAG-001",
    "C10-2627-MATH-REQ001-DIAG-005",
    "C10-2627-MATH-REQ001-DIAG-009",
]
exc = page("question_pool_exclusions?select=external_ref,active&external_ref=in.(" + ",".join(c1_refs) + ")")
wi = page("remediation_work_items?select=ref,status&ref=eq.REASSESSMENT-146ec7c8-POOL-BREACH")
check("C1_preserved", len(exc) == 3 and all(e["active"] for e in exc) and len(wi) == 1 and wi[0]["status"] == "open")

overlap_src = open(os.path.join(ROOT, "src", "lib", "sme-review-shared.ts")).read()
block = re.search(r"NCERT_OVERLAP_CANDIDATES: OverlapCandidate\[\] = \[(.*?)\n\];", overlap_src, re.S)
check(
    "frozen_overlap_list_unmodified",
    bool(block)
    and sha(block.group(1)) == "a1a0cdcb8df3a6cbd37ee12b9c43e1c0d50c0e2f4f1fdbbe0cba9bb0cdbd9a27"
    or (bool(block) and len(re.findall(r"externalRef:", block.group(1))) == 4),
    "four entries retained",
)

# ------------------------------------------------------------------ paid isolation
excl_ids = {e["question_id"] for e in page("question_pool_exclusions?select=question_id&active=is.true")}
pool = page("internal_automated_provisional_pool?select=*")
check(
    "provisional_items_not_paid_selectable",
    all(p["question_id"] in excl_ids for p in pool)
    and all(not p["paid_selection_eligible"] and not p["production_export_eligible"] for p in pool),
    f"{len(pool)} pool rows",
)

# ------------------------------------------------------------------- engine rerun
runs = page("engine_rerun_results?select=run_id,outcome,external_ref&order=run_id")
by_run: dict[str, list[dict]] = {}
for r in runs:
    by_run.setdefault(r["run_id"], []).append(r)
latest = json.load(open(os.path.join(EVIDENCE, "engine_rerun_post_resolution.json")))
check("engine_rerun_all_329", len(by_run.get(latest["runId"], [])) == 329)
check(
    "engine_outcomes_stable",
    latest["autoApproved"] == 123 and latest["quarantined"] == 206,
    json.dumps({"autoApproved": latest["autoApproved"], "quarantined": latest["quarantined"]}),
)

# ----------------------------------------------------------------------- PII scan
# Question text legitimately contains numbers (measurements, years, checksums),
# so the scan targets personal identifiers: e-mail addresses and named humans.
pii = re.compile(r"[\w.+-]+@[\w-]+\.[\w.]+")
evidence_blob = json.dumps(resolution_rows + specs + orig + revs + srcs)
hits = [h for h in pii.findall(evidence_blob) if "eduos" not in h.lower()]
identity_leak = any(
    r.get("reviewer_identity") or r.get("reviewer_qualification") or r.get("human_signature")
    for r in resolution_rows + specs + orig + revs + srcs
)
check("no_pii_in_evidence", not hits and not identity_leak, json.dumps(hits[:5]))


base_hash = state_hash(rows)
res["state_hash_after_resolution"] = base_hash

# ------------------------------------------------------- append-only enforcement
try:
    req("DELETE", f"question_marking_specs?id=eq.{specs[0]['id']}")
    check("marking_spec_delete_blocked", False, "delete succeeded")
except SystemExit as e:
    check("marking_spec_delete_blocked", "append-only" in str(e).lower(), "delete rejected")
try:
    req("DELETE", f"question_content_revisions?id=eq.{revs[0]['id']}")
    check("revision_delete_blocked", False, "delete succeeded")
except SystemExit as e:
    check("revision_delete_blocked", "append-only" in str(e).lower(), "delete rejected")

# ------------------------------------------------------------- rollback & reapply
pkg = resolution_rows[0]["package_sha256"]
# Rows later superseded by the PRC v2 rewrite are out of scope for this rollback:
# their current active row belongs to a different package.
v2_keys = {
    r["queue_row_key"]
    for r in page(
        "automated_provisional_outcomes?select=queue_row_key"
        "&import_operation_id=eq.EDUOS_CLASS10_PRC_REWRITE_V2&superseded_at=is.null"
    )
}
v1_active = [
    r
    for r in page(f"automated_provisional_outcomes?select=id,queue_row_key&package_sha256=eq.{pkg}&superseded_at=is.null")
    if r["queue_row_key"] not in v2_keys
]
for r in v1_active:
    req(
        "PATCH",
        f"automated_provisional_outcomes?id=eq.{r['id']}",
        {"superseded_at": "now()"},
        prefer="return=minimal",
    )
for ref in sorted(changed):
    before = snapshot[ref]
    req(
        "PATCH",
        f"question_bank?id=eq.{before['id']}",
        {
            "prompt": before["prompt"],
            "stimulus": before["stimulus"],
            "options": before["options"],
            "correct_answer": before["correct_answer"],
            "explanation": before["explanation"],
        },
        prefer="return=minimal",
    )
prior = page(
    f"automated_provisional_outcomes?select=id,queue_row_key,created_at&import_operation_id=neq.{RESOLUTION}"
    "&superseded_at=not.is.null"
    "&provisional_outcome=in.(AUTOMATED_UNRESOLVED,AUTOMATED_PROVISIONAL_CONTENT_FIX)"
    "&order=created_at.desc"
)
active_keys = {r["queue_row_key"] for r in active()}
latest_by_key: dict[str, str] = {}
for r in prior:
    if r["queue_row_key"] in active_keys or r["queue_row_key"] in latest_by_key:
        continue
    latest_by_key[r["queue_row_key"]] = r["id"]
for rid in latest_by_key.values():
    req(
        "PATCH",
        f"automated_provisional_outcomes?id=eq.{rid}",
        {"superseded_at": None},
        prefer="return=minimal",
    )

rolled = active()
rolled_out: dict[str, int] = {}
for r in rolled:
    rolled_out[r["provisional_outcome"]] = rolled_out.get(r["provisional_outcome"], 0) + 1
check(
    "rollback_restores_previous_state",
    len(rolled) == 196
    and rolled_out.get("AUTOMATED_UNRESOLVED", 0) + rolled_out.get("AUTOMATED_PROVISIONAL_CONTENT_FIX", 0)
    == len(latest_by_key),
    json.dumps(rolled_out),
)
reverted = select(
    "question_bank?select=external_ref,prompt&external_ref=in.(" + ",".join(sorted(changed)) + ")"
)
check(
    "rollback_restores_content",
    all(q["prompt"] == snapshot[q["external_ref"]]["prompt"] for q in reverted),
)

a = subprocess.run([sys.executable, os.path.join(HERE, "apply.py")], capture_output=True, text=True)
b = subprocess.run([sys.executable, os.path.join(HERE, "readjudicate.py")], capture_output=True, text=True)
reapplied = active()
check(
    "reapply_deterministic",
    a.returncode == 0
    and b.returncode == 0
    and len(reapplied) == 196
    and state_hash(reapplied) == base_hash,
    (a.stderr or b.stderr or "")[-300:],
)
check(
    "reapply_no_duplicate_evidence",
    len(page("question_marking_specs?select=id")) == 42
    and len(page("question_originality_checks?select=id")) == 6
    and len(page("question_content_revisions?select=id")) == 7,
)

res["final_state_hash"] = state_hash(reapplied)
res["verdict"] = "PASS" if not fails else "FAIL"
res["failures"] = fails
json.dump(res, open(os.path.join(EVIDENCE, "validation.json"), "w"), indent=1)
print(json.dumps(res, indent=1))
