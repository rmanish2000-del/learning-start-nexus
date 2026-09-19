"""Import the enhanced automated provisional outcomes as append-only staging advisory evidence.

Idempotent: a re-run over the same package SHA writes no new active rows.
Touches no approval, verification, content, pool or Engine field.
"""
import hashlib, json, os, sys, uuid
sys.path.insert(0, "/tmp/stage3")
from lib_rest import insert, select, req

PKG_DIR = "/tmp/imp/pkg"
PKG_PATH = "/mnt/documents/EDUOS_196_ENHANCED_AUTOMATED_REVIEW_PACKAGE.zip"
ORG = "458d3caf-5dc4-486b-b499-02124d0da319"
PKG_SHA = hashlib.sha256(open(PKG_PATH, "rb").read()).hexdigest()
PKG_BYTES = os.path.getsize(PKG_PATH)

items = []
for f in ("EDUOS_MATHS_143_ENHANCED_AUTOMATED_REVIEW.json",
          "EDUOS_SCIENCE_53_ENHANCED_AUTOMATED_REVIEW.json"):
    items += json.load(open(f"{PKG_DIR}/{f}"))["items"]
validation = json.load(open(f"{PKG_DIR}/EDUOS_ENHANCED_REVIEW_VALIDATION.json"))
summary = json.load(open(f"{PKG_DIR}/EDUOS_196_AUTOMATED_ADJUDICATION_SUMMARY.json"))
GEN_RUN_HASH = hashlib.sha256(
    json.dumps(items, sort_keys=True, ensure_ascii=False).encode()).hexdigest()
VALIDATOR_PASSED = str(validation.get("verdict", "")).upper().endswith("PASS") or \
    validation.get("failures") in (0, [], None)

recon = json.load(open("/tmp/imp/reconciliation.json"))["matched"]
queue_id = {m["key"]: m["queue_id"] for m in recon}
assert len(queue_id) == 196, len(queue_id)

CONTENT_FIX_NOTE = (
    "Stored answer is independently confirmed. The explanation is incomplete because it does "
    "not derive 'five times as strong'. No content modification occurs in this import stage."
)

existing = select(
    f"automated_provisional_outcomes?select=id,queue_row_key&package_sha256=eq.{PKG_SHA}"
    "&superseded_at=is.null&limit=1000")
if existing:
    print(json.dumps({"idempotent_skip": True, "existing_active_rows": len(existing),
                      "package_sha256": PKG_SHA}, indent=2))
    sys.exit(0)

op_id = str(uuid.uuid4())
counts = {
    "queue_rows": len(items),
    "distinct_questions": len({i["question_id"] for i in items}),
    "by_outcome": {o: sum(1 for i in items if i["outcome"] == o)
                   for o in sorted({i["outcome"] for i in items})},
    "by_subject": {s: sum(1 for i in items if i["subject"] == s)
                   for s in ("Mathematics", "Science")},
}
imp = req("POST", "automated_review_imports", [{
    "org_id": ORG,
    "package_name": "EDUOS_196_ENHANCED_AUTOMATED_REVIEW_PACKAGE.zip",
    "package_sha256": PKG_SHA,
    "package_bytes": PKG_BYTES,
    "generator_run_hash": GEN_RUN_HASH,
    "validator_result": validation,
    "counts": counts,
}], prefer="return=representation")[0]

rows = []
for it in items:
    ext = it["external_ref"]
    note = CONTENT_FIX_NOTE if (ext or "").endswith("REQ043-REASS-002") else None
    rows.append({
        "org_id": ORG,
        "import_id": imp["id"],
        "question_id": it["question_id"],
        "external_ref": ext,
        "subject": it["subject"],
        "queue_row_key": it["queue_row"],
        "queue_routing_id": queue_id[it["queue_row"]],
        "queue_routing_reason": it["queue_routing_reason"],
        "item_version_updated_at": it["item_version"]["updated_at"],
        "content_sha256": it["item_version"]["content_sha256"],
        "provisional_outcome": it["outcome"],
        "pass_a_evidence": it["pass_a_independent_solution"],
        "pass_b_evidence": it["pass_b_adversarial"],
        "pass_c_evidence": {**it["pass_c_adjudication"], "reasons": it["reasons"]},
        "checks_executed": it["checks_executed"],
        "checks_not_executed": it["checks_not_executed"],
        "engine_outcome": it["engine_v1_rerun"]["outcome"],
        "engine_version": it["engine_v1_rerun"]["version"],
        "package_sha256": PKG_SHA,
        "generator_run_hash": GEN_RUN_HASH,
        "validator_passed": bool(VALIDATOR_PASSED),
        "advisory_note": note,
        "import_operation_id": op_id,
    })

insert("automated_provisional_outcomes", rows, chunk=50)
print(json.dumps({
    "import_id": imp["id"], "import_operation_id": op_id,
    "package_sha256": PKG_SHA, "generator_run_hash": GEN_RUN_HASH,
    "validator_passed": bool(VALIDATOR_PASSED), "rows": len(rows), "counts": counts,
}, indent=2))
