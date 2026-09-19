"""Stage 3 remediation: 150 corrections, null-ref handling, legacy quarantine, C1, C2,
engine rerun evidence, SME queues, paid-pool exclusions. Append-only evidence throughout."""
import json, sys, uuid
sys.path.insert(0, "/tmp/stage3")
from lib_rest import insert, patch, select

PKG = "/tmp/rem/EDUOS_REMEDIATION_PACKAGE_V1_CORRECTED"
ORG = "458d3caf-5dc4-486b-b499-02124d0da319"
RUN = str(uuid.uuid5(uuid.UUID("3f2a6d1e-0f3c-4a6b-9d4e-8c7b5a1f2e30"), "stage3-remediation-run-1"))

items = json.load(open(f"{PKG}/EDUOS_ALL_329_ITEM_EXPORT_VALIDATED.json"))["items"]
by_id = {i["database_id"]: i for i in items}
corr = json.load(open(f"{PKG}/EDUOS_APPROVED_FLAG_CORRECTIONS.json"))["rows"]
extref = json.load(open(f"{PKG}/EDUOS_EXTERNAL_REF_CORRECTIONS.json"))["rows"]
legacy = json.load(open(f"{PKG}/EDUOS_210_LEGACY_VERIFICATION_REVIEW.json"))["items"]
contam = json.load(open(f"{PKG}/EDUOS_CONTAMINATION_REPORT.json"))
rerun = json.load(open("/tmp/stage3/out/engine_rerun.json"))
rerun_by_id = {v["questionId"]: v for v in rerun}

actions = []


def act(kind, qid, ref, subject, prior, new, reason, evidence=None):
    actions.append({
        "org_id": ORG, "run_id": RUN, "action_type": kind, "question_id": qid,
        "external_ref": ref, "subject": subject, "prior_value": prior, "new_value": new,
        "reason": reason, "evidence": evidence or {},
    })


# ---------- 1. exactly 150 misleading approved-state corrections ----------------
assert len(corr) == 150
corrected_ids, already_correct = [], []
for row in corr:
    qid = row["database_id"]
    cur = select(f"question_bank?select=id,status,verification_state,verification_note&id=eq.{qid}")
    assert len(cur) == 1, qid
    prior = cur[0]
    if prior["status"] == row["proposed_status"] and prior["verification_state"] == "unverified":
        already_correct.append(qid)   # idempotent re-run
        corrected_ids.append(qid)
        continue
    assert prior["status"] == row["current_status"], (qid, prior["status"])
    note = ("Stage 3 remediation: status corrected to draft — Engine v1.0.0 quarantined this item "
            "and no named-SME decision exists. Prior note: " + (prior.get("verification_note") or "none"))
    patch("question_bank", f"id=eq.{qid}", {
        "status": row["proposed_status"], "verification_state": "unverified",
        "verification_tier": None, "verification_note": note,
    })
    act("APPROVED_FLAG_CORRECTION", qid, row["external_ref"], row["subject"],
        {"status": prior["status"], "verification_state": prior["verification_state"],
         "verification_note": prior.get("verification_note")},
        {"status": row["proposed_status"], "verification_state": "unverified",
         "verification_tier": None, "verification_note": note},
        row["reason"], {"engine_outcome": row["engine_outcome"], "package": "V1_CORRECTED"})
    corrected_ids.append(qid)
print("corrections applied:", len(corrected_ids), "already-correct (idempotent):", len(already_correct))


# ---------- 2. three null external_ref Science rows ------------------------------
nullref_handling = []
for row in extref:
    qid = row["database_id"]
    cur = select(f"question_bank?select=id,status,verification_state,external_ref&id=eq.{qid}")[0]
    assert cur["external_ref"] is None
    note = ("Stage 3 remediation: external_ref left NULL. Pool (DIAGNOSTIC/REASSESSMENT) cannot be "
            "derived from verified evidence; the package proposal requires unsupported pool inference. "
            f"Crosswalk requirement: {row['crosswalk_requirement_id']} "
            f"({', '.join(row['official_requirement_ids'])}). Routed to the Science SME queue.")
    patch("question_bank", f"id=eq.{qid}", {
        "status": "draft", "verification_state": "unverified", "verification_tier": None,
        "verification_note": note,
    })
    act("NULL_EXTERNAL_REF_QUARANTINE", qid, None, "Science",
        {"status": cur["status"], "verification_state": cur["verification_state"], "external_ref": None},
        {"status": "draft", "verification_state": "unverified", "external_ref": None},
        "Pool inference unsupported; external_ref not written. Quarantined and routed to Science SME.",
        {"crosswalk": row["official_requirement_ids"],
         "package_proposal": row["proposed_external_ref"],
         "package_write_status": row["write_status"],
         "applied": "NOT_APPLIED_POOL_INFERENCE_UNSUPPORTED"})
    nullref_handling.append({"id": qid, "outcome_code": row["outcome_code"],
                             "handling": "external_ref left NULL, quarantined, Science SME queue"})

# ---------- 3. legacy verification quarantine (210, metadata-only) ----------------
assert len(legacy) == 210
gk = [l for l in legacy if l["subject"] not in ("Mathematics", "Science")]
assert not gk
insert("legacy_verification_quarantine?on_conflict=legacy_database_id", [{
    "org_id": ORG, "legacy_database_id": l["database_id"], "external_ref": l["external_ref"],
    "subject": l["subject"], "legacy_status": l["status"], "legacy_verified_at": l["verified_at"],
    "legacy_verification_note": l["verification_note"],
    "evidence": {"package_evidence": l["evidence"], "content_checks": l["content_checks"],
                 "pool_separation": l["pool_separation"], "disposition": l["disposition"],
                 "content_available_in_package": False},
} for l in legacy], ignore_dupes=True)
print("legacy quarantine rows:", len(legacy))

# ---------- 4. paid-pool exclusions for every unsupported item --------------------
unsupported = [v for v in rerun if v["outcome"] == "quarantined"]
insert("question_pool_exclusions?on_conflict=question_id,pool", [{
    "org_id": ORG, "question_id": v["questionId"], "external_ref": v["externalRef"],
    "pool": "paid", "reason": "Engine v1.0.0 quarantined; no named-SME approval. Not eligible for paid selection.",
    "work_item_ref": None, "active": True,
} for v in unsupported], upsert=True)
print("paid exclusions:", len(unsupported))

# ---------- 5. C1 — reassessment 146ec7c8 pool breach ------------------------------
C1_REFS = ["C10-2627-MATH-REQ001-DIAG-001", "C10-2627-MATH-REQ001-DIAG-005",
           "C10-2627-MATH-REQ001-DIAG-009"]
c1_rows = []
for ref in C1_REFS:
    got = select(f"question_bank?select=id,external_ref,status&external_ref=eq.{ref}")
    assert len(got) == 1, ref
    c1_rows.append(got[0])
insert("remediation_work_items?on_conflict=ref", [{
    "org_id": ORG, "ref": "REASSESSMENT-146ec7c8-POOL-BREACH", "severity": "P0", "status": "open",
    "title": "Published reassessment 146ec7c8 served diagnostic-pool items (REQ001-DIAG-001/005/009)",
    "details": {
        "reassessment_id": "146ec7c8",
        "requirements": ["REQ001-DIAG-001", "REQ001-DIAG-005", "REQ001-DIAG-009"],
        "external_refs": C1_REFS,
        "question_ids": [r["id"] for r in c1_rows],
        "condition": "C1",
        "action_taken": "excluded from paid diagnostic capacity in staging",
        "not_done": ["no deletion", "no silent pool reclassification"],
        "resolution_required_before": "paid diagnostic reuse",
    },
}], upsert=True)
insert("question_pool_exclusions?on_conflict=question_id,pool", [{
    "org_id": ORG, "question_id": r["id"], "external_ref": r["external_ref"],
    "pool": "paid_diagnostic",
    "reason": "C1: served inside published reassessment 146ec7c8; excluded from paid diagnostic capacity "
              "until the pool breach is resolved.",
    "work_item_ref": "REASSESSMENT-146ec7c8-POOL-BREACH", "active": True,
} for r in c1_rows], upsert=True)
for r in c1_rows:
    act("C1_PAID_DIAGNOSTIC_EXCLUSION", r["id"], r["external_ref"], "Mathematics",
        {"paid_diagnostic_eligible": True}, {"paid_diagnostic_eligible": False},
        "C1 pool breach in published reassessment 146ec7c8",
        {"work_item": "REASSESSMENT-146ec7c8-POOL-BREACH"})

# ---------- 6. C2 — contamination routing for REQ024-DIAG-004 ----------------------
C2_REF = "C10-2627-MATH-REQ024-DIAG-004"
c2 = select(f"question_bank?select=id,external_ref,prompt&external_ref=eq.{C2_REF}")[0]
flag = next(f for f in contam["flagged_items"] if f.get("external_ref") == C2_REF)
normalised = " ".join(c2["prompt"].split())
insert("sme_review_queue?on_conflict=question_id,routing_reason", [{
    "org_id": ORG, "subject": "Mathematics", "question_id": c2["id"], "external_ref": C2_REF,
    "routing_reason": "CONTAMINATION_HIT", "priority": 1,
    "evidence": {"condition": "C2", "package_flag": flag,
                 "normalized_whitespace_prompt": normalised,
                 "frozen_overlap_list": "src/lib/sme-review-shared.ts NCERT_OVERLAP_CANDIDATES — not modified",
                 "note": "Routed as a contamination hit; the unsupported 'shingle absent' claim was not used."},
}], upsert=True)
act("C2_CONTAMINATION_ROUTING", c2["id"], C2_REF, "Mathematics", {"sme_queue": None},
    {"sme_queue": "Mathematics", "routing_reason": "CONTAMINATION_HIT"},
    "C2: contamination hit routed to the Mathematics SME queue; overlap list untouched.",
    {"normalized_whitespace_prompt": normalised})

# ---------- 7. engine rerun evidence (append-only) ---------------------------------
insert("engine_rerun_results?on_conflict=run_id,question_id", [{
    "org_id": ORG, "run_id": RUN, "engine_version": "1.0.0", "question_id": v["questionId"],
    "external_ref": v["externalRef"], "subject": v["subject"], "outcome": v["outcome"],
    "confidence": v["confidence"], "strong_signals": v["strongSignals"],
    "checks": v["checks"], "reasons": v["reasons"],
} for v in rerun], ignore_dupes=True)
print("engine rerun rows:", len(rerun))

# ---------- 8. subject-isolated SME queues (no decisions) ---------------------------
queue_rows = []
for v in rerun:
    if v["outcome"] != "quarantined":
        continue
    it = by_id[v["questionId"]]
    queue_rows.append({
        "org_id": ORG, "subject": it["subject"], "question_id": v["questionId"],
        "external_ref": v["externalRef"], "routing_reason": "ENGINE_QUARANTINED", "priority": 50,
        "evidence": {"engine_run": RUN, "engine_version": "1.0.0", "reasons": v["reasons"],
                     "disposition": it["disposition"]["primary_disposition"]},
    })
insert("sme_review_queue?on_conflict=question_id,routing_reason", queue_rows, upsert=True)
print("sme queue rows:", len(queue_rows))

# ---------- 9. append-only action log ----------------------------------------------
insert("remediation_actions", actions)
print("remediation actions logged:", len(actions))
json.dump({"run_id": RUN, "corrected_ids": corrected_ids, "nullref": nullref_handling,
           "c1": [r["id"] for r in c1_rows], "c2": c2["id"]},
          open("/tmp/stage3/out/remediation_run.json", "w"), indent=2)
