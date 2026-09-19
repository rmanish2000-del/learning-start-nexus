"""Post-import validation, idempotency, rollback/reapply and no-change checks."""
import hashlib, json, subprocess, sys
sys.path.insert(0, "/tmp/stage3")
from lib_rest import select, req

ORG = "458d3caf-5dc4-486b-b499-02124d0da319"
PKG_SHA = "6b01f2b202647a5ab415a02353c8bb44c9de5c538ee9e032c80752d03dda7f16"
res, fails = {}, []


def page(path):
    out, i = [], 0
    while True:
        chunk = select(f"{path}&limit=500&offset={i*500}")
        if not chunk:
            return out
        out += chunk
        i += 1


def check(name, cond, detail=""):
    res[name] = {"status": "PASS" if cond else "FAIL", "detail": detail}
    if not cond:
        fails.append(name)


def active():
    return page("automated_provisional_outcomes?select=*&superseded_at=is.null&order=queue_row_key")


def state_hash(rows):
    return hashlib.sha256(json.dumps(
        sorted([[r["queue_row_key"], r["provisional_outcome"], r["content_sha256"],
                 r["package_sha256"], r["decision_class"]] for r in rows]),
        sort_keys=True).encode()).hexdigest()


rows = active()
check("queue_row_advisory_records_196", len(rows) == 196, f"{len(rows)} rows")
by_out = {}
for r in rows:
    by_out[r["provisional_outcome"]] = by_out.get(r["provisional_outcome"], 0) + 1
check("outcome_counts", by_out == {"AUTOMATED_PROVISIONAL_PASS": 148,
                                   "AUTOMATED_PROVISIONAL_CONTENT_FIX": 1,
                                   "AUTOMATED_UNRESOLVED": 47}, json.dumps(by_out))
qview = page("automated_provisional_question_outcomes?select=*&order=question_id")
check("distinct_questions_195", len(qview) == 195, f"{len(qview)} questions")
qout = {}
for r in qview:
    qout[r["provisional_outcome"]] = qout.get(r["provisional_outcome"], 0) + 1
check("distinct_question_outcome_counts", qout == {"AUTOMATED_PROVISIONAL_PASS": 148,
                                                   "AUTOMATED_PROVISIONAL_CONTENT_FIX": 1,
                                                   "AUTOMATED_UNRESOLVED": 46}, json.dumps(qout))
check("zero_human_identities",
      all(r["reviewer_identity"] is None and r["reviewer_qualification"] is None
          and r["human_signature"] is None and r["automated_not_human"] for r in rows))
check("decision_class_uniform",
      all(r["decision_class"] == "FOUNDER_AUTHORIZED_AUTOMATED_PROVISIONAL" for r in rows))
blob = json.dumps(rows).lower()
check("no_certification_language",
      not any(t in blob for t in ["copyright clearance granted", "named_sme", "human certification",
                                  "production approved", "cbse certified"]))

# C2 --------------------------------------------------------------------
c2 = [r for r in rows if (r["external_ref"] or "").endswith("REQ024-DIAG-004")]
c2q = [r for r in qview if (r["external_ref"] or "").endswith("REQ024-DIAG-004")]
res["C2"] = {"queue_rows": len(c2), "question_level_rows": len(c2q),
             "outcomes": sorted({r["provisional_outcome"] for r in c2}),
             "routing_reasons": sorted(r["queue_routing_reason"] for r in c2),
             "subjects": sorted({r["subject"] for r in c2})}
check("C2_two_routing_one_question",
      len(c2) == 2 and len(c2q) == 1 and {r["provisional_outcome"] for r in c2} == {"AUTOMATED_UNRESOLVED"}
      and {r["subject"] for r in c2} == {"Mathematics"}, json.dumps(res["C2"]))
c2queue = page("sme_review_queue?select=*&external_ref=eq.C10-2627-MATH-REQ024-DIAG-004")
res["C2_queue_evidence"] = [{"routing_reason": r["routing_reason"], "subject": r["subject"],
                             "evidence_keys": sorted(r["evidence"].keys())} for r in c2queue]
check("C2_contamination_routing_preserved",
      len(c2queue) == 2 and any("CONTAMINATION" in r["routing_reason"] for r in c2queue))

# C1 --------------------------------------------------------------------
c1_refs = ["C10-2627-MATH-REQ001-DIAG-001", "C10-2627-MATH-REQ001-DIAG-005",
           "C10-2627-MATH-REQ001-DIAG-009"]
exc = page("question_pool_exclusions?select=external_ref,pool,active,work_item_ref&"
           "external_ref=in.(" + ",".join(c1_refs) + ")")
wi = page("remediation_work_items?select=*&ref=eq.REASSESSMENT-146ec7c8-POOL-BREACH")
res["C1"] = {"exclusions": exc, "work_item": wi}
check("C1_preserved", len(exc) == 3 and all(e["active"] for e in exc)
      and len(wi) == 1 and wi[0]["status"] == "open")

# REQ043-REASS-002 -------------------------------------------------------
fix = [r for r in rows if (r["external_ref"] or "").endswith("REQ043-REASS-002")]
res["REQ043_REASS_002"] = [{"external_ref": r["external_ref"], "outcome": r["provisional_outcome"],
                            "advisory_note": r["advisory_note"], "subject": r["subject"],
                            "content_sha256": r["content_sha256"]} for r in fix]
check("content_fix_advisory_present",
      len(fix) == 1 and fix[0]["provisional_outcome"] == "AUTOMATED_PROVISIONAL_CONTENT_FIX"
      and "not derive" in (fix[0]["advisory_note"] or ""))

# No operational field change -------------------------------------------
pre = json.load(open("/tmp/imp/snapshot_pre_import.json"))
now_q = page("question_bank?select=id,external_ref,updated_at,status,verification_state,"
             "verification_tier,prompt,stimulus,options,correct_answer,explanation&order=id")
for r in now_q:
    r["content_sha256"] = hashlib.sha256(json.dumps({
        "prompt": r["prompt"], "stimulus": r.get("stimulus"), "options": r.get("options"),
        "correct_answer": r["correct_answer"], "explanation": r["explanation"],
    }, sort_keys=True, ensure_ascii=False).encode()).hexdigest()
    for k in ("prompt", "stimulus", "options", "correct_answer", "explanation"):
        r.pop(k)
check("question_bank_unchanged", now_q == pre["question_versions"], "content/approval/version drift")
check("queue_unchanged", page("sme_review_queue?select=*&order=id") == pre["sme_review_queue"])
check("engine_evidence_unchanged",
      page("question_auto_verifications?select=id,question_id,run_id,engine_version,outcome,confidence&order=id")
      == pre["question_auto_verifications"])
check("pool_exclusions_unchanged",
      page("question_pool_exclusions?select=*&order=id") == pre["question_pool_exclusions"])
check("zero_human_sme_decisions", len(page("question_verifications?select=id&order=id")) == 0)

# Paid-selection exclusion ----------------------------------------------
excl_ids = {e["question_id"] for e in page("question_pool_exclusions?select=question_id,active&active=is.true")}
pass_ids = [r["question_id"] for r in qview if r["provisional_outcome"] == "AUTOMATED_PROVISIONAL_PASS"]
not_excluded = [q for q in pass_ids if q not in excl_ids]
check("provisional_pass_not_paid_selectable", not not_excluded,
      f"{len(not_excluded)} provisional-pass items missing a paid-pool exclusion")
pool = page("internal_automated_provisional_pool?select=*")
check("internal_pool_labelled",
      len(pool) == 148 and all(p["pool_label"] == "INTERNAL_AUTOMATED_PROVISIONAL"
                               and not p["paid_selection_eligible"]
                               and not p["production_export_eligible"] for p in pool),
      f"{len(pool)} rows")

# Subject isolation & referential integrity ------------------------------
check("subject_isolation",
      sum(1 for r in rows if r["subject"] == "Mathematics") == 143
      and sum(1 for r in rows if r["subject"] == "Science") == 53)
qids = {r["id"] for r in now_q}
check("referential_integrity",
      all(r["question_id"] in qids and r["queue_routing_id"] for r in rows))

base_hash = state_hash(rows)
res["state_hash_after_import"] = base_hash

# Idempotency ------------------------------------------------------------
out = subprocess.run([sys.executable, "/tmp/imp/import.py"], capture_output=True, text=True)
second = active()
check("idempotent_second_import",
      out.returncode == 0 and len(second) == 196 and state_hash(second) == base_hash
      and len(page("automated_provisional_question_outcomes?select=question_id")) == 195,
      out.stdout.strip()[:200])
req("POST", "automated_review_rollback_events", [{
    "org_id": ORG, "import_id": rows[0]["import_id"], "event_type": "IDEMPOTENCY_TEST",
    "package_sha256": PKG_SHA, "affected_rows": 0, "state_hash": base_hash,
    "detail": {"result": "second import produced no new active advisory rows"},
}], prefer="return=minimal")

# Rollback & reapply -----------------------------------------------------
req("PATCH", f"automated_provisional_outcomes?package_sha256=eq.{PKG_SHA}&superseded_at=is.null",
    {"superseded_at": "now()"}, prefer="return=minimal")
req("PATCH", f"automated_review_imports?package_sha256=eq.{PKG_SHA}&state=eq.active",
    {"state": "rolled_back", "rolled_back_at": "now()"}, prefer="return=minimal")
after_rb = active()
req("POST", "automated_review_rollback_events", [{
    "org_id": ORG, "import_id": rows[0]["import_id"], "event_type": "ROLLBACK",
    "package_sha256": PKG_SHA, "affected_rows": 196, "state_hash": base_hash,
    "detail": {"method": "supersede active advisory rows; evidence retained append-only"},
}], prefer="return=minimal")
check("rollback_clears_active_state", len(after_rb) == 0
      and len(page("automated_provisional_question_outcomes?select=question_id")) == 0
      and len(page("internal_automated_provisional_pool?select=question_id")) == 0,
      f"{len(after_rb)} active rows remain")
check("rollback_preserves_append_only_evidence",
      len(page("automated_provisional_outcomes?select=id")) == 196)

out2 = subprocess.run([sys.executable, "/tmp/imp/import.py"], capture_output=True, text=True)
reapplied = active()
check("reapply_deterministic",
      out2.returncode == 0 and len(reapplied) == 196 and state_hash(reapplied) == base_hash,
      out2.stdout.strip()[:200])
req("POST", "automated_review_rollback_events", [{
    "org_id": ORG, "import_id": reapplied[0]["import_id"], "event_type": "REAPPLY",
    "package_sha256": PKG_SHA, "affected_rows": len(reapplied), "state_hash": state_hash(reapplied),
    "detail": {"identical_to_pre_rollback_state": state_hash(reapplied) == base_hash},
}], prefer="return=minimal")

qview2 = page("automated_provisional_question_outcomes?select=*")
check("post_reapply_counts", len(qview2) == 195 and len(reapplied) == 196)
check("no_count_inflation_from_C2",
      len([r for r in qview2 if (r["external_ref"] or "").endswith("REQ024-DIAG-004")]) == 1)

# Append-only enforcement ------------------------------------------------
try:
    req("DELETE", f"automated_provisional_outcomes?id=eq.{reapplied[0]['id']}")
    check("delete_blocked", False, "delete succeeded")
except SystemExit as e:
    check("delete_blocked", "append-only" in str(e), "delete rejected")

res["provisional_pass_ids"] = sorted(
    r["external_ref"] or r["question_id"] for r in reapplied
    if r["provisional_outcome"] == "AUTOMATED_PROVISIONAL_PASS")
res["unresolved_rows"] = sorted(
    ({"external_ref": r["external_ref"], "queue_row_key": r["queue_row_key"],
      "subject": r["subject"], "routing_reason": r["queue_routing_reason"],
      "reason": (r["pass_c_evidence"].get("reasons") or [""])[0]}
     for r in reapplied if r["provisional_outcome"] == "AUTOMATED_UNRESOLVED"),
    key=lambda x: (x["subject"], x["external_ref"] or "", x["routing_reason"]))
res["final_state_hash"] = state_hash(reapplied)
res["verdict"] = "PASS" if not fails else "FAIL"
res["failures"] = fails
json.dump(res, open("/tmp/imp/validation.json", "w"), indent=2)
print(json.dumps({k: v for k, v in res.items()
                  if k not in ("provisional_pass_ids", "unresolved_rows")}, indent=2))
