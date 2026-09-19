"""Stage 3 import, part 2: assessment outcomes + 329 canonical questions + stored evidence."""
import json, sys, uuid
sys.path.insert(0, "/tmp/stage3")
from lib_rest import insert, delete, select

PKG = "/tmp/rem/EDUOS_REMEDIATION_PACKAGE_V1_CORRECTED"
ORG = "458d3caf-5dc4-486b-b499-02124d0da319"
NS = uuid.UUID("3f2a6d1e-0f3c-4a6b-9d4e-8c7b5a1f2e30")

items = json.load(open(f"{PKG}/EDUOS_ALL_329_ITEM_EXPORT_VALIDATED.json"))["items"]

# curriculum_outcomes rows written in part 1 are not the linkage table; drop them.
delete("curriculum_outcomes", f"org_id=eq.{ORG}")

units = {}
for it in items:
    book = it["provenance"]["source_reference"]["book_id"]
    unit_title = it["unit_title"] or "Unmapped"
    units.setdefault((book, unit_title), str(uuid.uuid5(NS, f"unit|{book}|{unit_title}")))

# collision guard: one (book, code) per outcome_id
seen = {}
for it in items:
    book = it["provenance"]["source_reference"]["book_id"]
    key = (book, it["outcome_code"])
    prev = seen.setdefault(key, it["outcome_id"])
    if prev != it["outcome_id"]:
        raise SystemExit(f"outcome code collision {key}: {prev} vs {it['outcome_id']}")

outcomes = {}
for it in items:
    oid = it["outcome_id"]
    if oid in outcomes:
        continue
    book = it["provenance"]["source_reference"]["book_id"]
    unit_title = it["unit_title"] or "Unmapped"
    outcomes[oid] = {
        "id": oid, "org_id": ORG, "book_id": book, "unit_id": units[(book, unit_title)],
        "code": it["outcome_code"], "title": it["outcome_title"],
        "category": "curriculum", "bloom_level": "understand", "difficulty": 3,
        "diagnostic_weight": 1, "question_types": [], "intervention_strategy": "",
        "status": "active",
    }
insert("assessment_outcomes", list(outcomes.values()), upsert=True)
print("assessment_outcomes", len(outcomes))

rows = []
for it in items:
    q, cf = it["question"], it["current_flags"]
    rows.append({
        "id": it["database_id"], "org_id": ORG,
        "book_id": it["provenance"]["source_reference"]["book_id"],
        "outcome_id": it["outcome_id"], "kind": q["type"], "difficulty": q["difficulty"],
        "prompt": q["text"], "stimulus": q.get("stimulus"), "options": q.get("options"),
        "correct_answer": q["correct_answer"], "explanation": q["explanation"],
        "status": cf["status"],
        "source": it["provenance"]["source_reference"].get("question_bank_source", "import"),
        "verification_state": cf["verification_state"],
        "verification_tier": cf.get("verification_tier"),
        "verified_at": cf.get("verified_at"), "verification_note": cf.get("verification_note"),
        "external_ref": it["external_ref"],
        "created_at": it["provenance"]["created_at"], "updated_at": it["provenance"]["updated_at"],
    })
insert("question_bank", rows, upsert=True)
print("question_bank inserted", len(rows))

ev = []
for it in items:
    e = it.get("engine_evidence_stored") or {}
    if not e.get("run_id"):
        continue
    ev.append({
        "org_id": ORG, "question_id": it["database_id"], "run_id": e["run_id"],
        "engine_version": e["engine_version"], "outcome": e["outcome"],
        "confidence": e.get("confidence", 0), "checks": e.get("checks", []),
        "created_at": e.get("recorded_at"),
    })
insert("question_auto_verifications", ev, upsert=True)
print("stored engine evidence", len(ev))
