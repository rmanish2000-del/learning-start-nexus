"""Stage 3 rollback tests: (A) item-level rollback, (B) full restore of the 24-item synthetic state."""
import json, subprocess, sys, uuid
sys.path.insert(0, "/tmp/stage3")
from lib_rest import insert, patch, delete, select

ORG = "458d3caf-5dc4-486b-b499-02124d0da319"
SNAP = "/mnt/documents/eduos-staging/stage3"
RUN = str(uuid.uuid5(uuid.UUID("3f2a6d1e-0f3c-4a6b-9d4e-8c7b5a1f2e30"), "stage3-rollback-test"))
results = {}

# ---------- A. item-level rollback ----------
a = select("remediation_actions?select=*&action_type=eq.APPROVED_FLAG_CORRECTION&limit=1&order=external_ref")[0]
qid = a["question_id"]
before = select(f"question_bank?select=id,status,verification_state,verification_note&id=eq.{qid}")[0]
patch("question_bank", f"id=eq.{qid}", {
    "status": a["prior_value"]["status"],
    "verification_state": a["prior_value"]["verification_state"],
    "verification_note": a["prior_value"]["verification_note"],
})
rolled = select(f"question_bank?select=id,status,verification_state&id=eq.{qid}")[0]
ok_a1 = rolled["status"] == a["prior_value"]["status"]
# re-apply
patch("question_bank", f"id=eq.{qid}", {
    "status": a["new_value"]["status"], "verification_state": a["new_value"]["verification_state"],
    "verification_note": a["new_value"]["verification_note"],
})
reapplied = select(f"question_bank?select=id,status,verification_state&id=eq.{qid}")[0]
ok_a2 = reapplied["status"] == before["status"] and reapplied["verification_state"] == before["verification_state"]
insert("remediation_actions", [{
    "org_id": ORG, "run_id": RUN, "action_type": "ITEM_ROLLBACK_TEST", "question_id": qid,
    "external_ref": a["external_ref"], "subject": a["subject"],
    "prior_value": a["new_value"], "new_value": a["new_value"],
    "reason": "Tested item-level rollback to the recorded prior value and re-application.",
    "evidence": {"rolled_back_to": a["prior_value"], "restored": reapplied},
}])
results["item_level_rollback"] = {"question_id": qid, "rolled_back": ok_a1, "reapplied": ok_a2}

# ---------- B. full restore of the synthetic 24-item state ----------
qb_pre = json.load(open(f"{SNAP}/snapshot_question_bank_pre.json"))
dep_pre = json.load(open(f"{SNAP}/snapshot_dependencies_pre.json"))

delete("question_bank", f"org_id=eq.{ORG}")            # cascades exclusions/queue/engine rows
delete("legacy_verification_quarantine", f"org_id=eq.{ORG}")
after_delete = select("question_bank?select=id")
insert("question_bank", qb_pre)
insert("assessment_question_map", dep_pre["assessment_question_map"])
restored_q = select("question_bank?select=id,external_ref")
restored_map = select("assessment_question_map?select=question_id")
results["full_restore"] = {
    "cleared_to": len(after_delete),
    "restored_question_bank": len(restored_q),
    "restored_assessment_question_map": len(restored_map),
    "external_refs_match": sorted(r["external_ref"] for r in restored_q) ==
                           sorted(r["external_ref"] for r in qb_pre),
}
insert("remediation_actions", [{
    "org_id": ORG, "run_id": RUN, "action_type": "FULL_ROLLBACK_TEST", "question_id": None,
    "external_ref": None, "subject": None, "prior_value": {"rows": 329}, "new_value": {"rows": 24},
    "reason": "Tested complete restoration of the pre-Stage-3 synthetic staging state from snapshot.",
    "evidence": results["full_restore"],
}])

# ---------- C. re-establish the remediated state ----------
for script in ("import_corpus2.py", "remediate.py"):
    out = subprocess.run([sys.executable, f"/tmp/stage3/{script}"], capture_output=True, text=True)
    if out.returncode != 0:
        raise SystemExit(f"{script} failed: {out.stderr[-1500:]}")
    print(script, "->", out.stdout.strip().splitlines()[-1])

results["reestablished"] = {
    "question_bank": len(select("question_bank?select=id&limit=1000")),
    "sme_queue": len(select("sme_review_queue?select=id&limit=1000")),
    "engine_rerun": len(select("engine_rerun_results?select=id&limit=1000")),
    "legacy_quarantine": len(select("legacy_verification_quarantine?select=id&limit=1000")),
    "paid_exclusions": len(select("question_pool_exclusions?select=id&limit=1000")),
}
json.dump(results, open("/tmp/stage3/out/rollback_test.json", "w"), indent=2)
print(json.dumps(results, indent=2))
