"""Stage 3: replace the 24 synthetic staging items with the canonical 329-item corpus."""
import hashlib, json, sys, uuid
sys.path.insert(0, "/tmp/stage3")
from lib_rest import insert, delete, select, req

PKG = "/tmp/rem/EDUOS_REMEDIATION_PACKAGE_V1_CORRECTED"
ORG = "458d3caf-5dc4-486b-b499-02124d0da319"
SYNTH_BOOK = "eac51178-65a1-4695-a88a-a0dc0620ba49"
NS = uuid.UUID("3f2a6d1e-0f3c-4a6b-9d4e-8c7b5a1f2e30")

corpus = json.load(open(f"{PKG}/EDUOS_ALL_329_ITEM_EXPORT_VALIDATED.json"))
items = corpus["items"]

# ---- 1. snapshot record (files already written + checksummed) -----------------
snapdir = "/mnt/documents/eduos-staging/stage3"
def sha(p):
    return hashlib.sha256(open(p, "rb").read()).hexdigest()

qb_pre = json.load(open(f"{snapdir}/snapshot_question_bank_pre.json"))
dep_pre = json.load(open(f"{snapdir}/snapshot_dependencies_pre.json"))
assert len(qb_pre) == 24, len(qb_pre)

insert("remediation_snapshots", [{
    "org_id": ORG,
    "label": "pre-stage3-synthetic-corpus",
    "scope": "question_bank (24 synthetic rows) + assessment_question_map + curriculum tree",
    "checksum": sha(f"{snapdir}/snapshot_question_bank_pre.json"),
    "location": f"{snapdir}/snapshot_question_bank_pre.json",
    "payload": {
        "question_bank": qb_pre,
        "dependencies": dep_pre,
        "dependencies_checksum": sha(f"{snapdir}/snapshot_dependencies_pre.json"),
    },
}])

# ---- 2. remove synthetic corpus ----------------------------------------------
removed_map = delete("assessment_question_map", f"question_id=in.({','.join(r['id'] for r in qb_pre)})")
removed_q = delete("question_bank", f"book_id=eq.{SYNTH_BOOK}")
print("removed assessment_question_map:", len(removed_map), "question_bank:", len(removed_q))
assert len(removed_q) == 24

# ---- 3. curriculum tree for the canonical books -------------------------------
units, chapters, topics, outcomes = {}, {}, {}, {}
for it in items:
    book = it["provenance"]["source_reference"]["book_id"]
    unit_title = it["unit_title"] or "Unmapped"
    ukey = (book, unit_title)
    if ukey not in units:
        uid = str(uuid.uuid5(NS, f"unit|{book}|{unit_title}"))
        units[ukey] = uid
        cid = str(uuid.uuid5(NS, f"chapter|{book}|{unit_title}"))
        chapters[ukey] = cid
        tid = str(uuid.uuid5(NS, f"topic|{book}|{unit_title}"))
        topics[ukey] = tid
    oid = it["outcome_id"]
    if oid not in outcomes:
        outcomes[oid] = {
            "id": oid, "org_id": ORG, "book_id": book, "topic_id": topics[ukey],
            "text": f"{it['outcome_code']} — {it['outcome_title']}",
            "position": len(outcomes), "status": "approved",
        }

insert("curriculum_units", [
    {"id": uid, "org_id": ORG, "book_id": b, "title": t, "position": i, "status": "approved"}
    for i, ((b, t), uid) in enumerate(units.items())
], upsert=True)
insert("curriculum_chapters", [
    {"id": chapters[(b, t)], "org_id": ORG, "book_id": b, "unit_id": uid, "title": t, "position": i,
     "status": "approved"}
    for i, ((b, t), uid) in enumerate(units.items())
], upsert=True)
insert("curriculum_topics", [
    {"id": topics[(b, t)], "org_id": ORG, "book_id": b, "chapter_id": chapters[(b, t)], "title": t,
     "position": i, "status": "approved"}
    for i, ((b, t), uid) in enumerate(units.items())
], upsert=True)
insert("curriculum_outcomes", list(outcomes.values()), upsert=True)
print("units", len(units), "outcomes", len(outcomes))

# ---- 4. canonical question rows ------------------------------------------------
rows = []
for it in items:
    q, cf = it["question"], it["current_flags"]
    rows.append({
        "id": it["database_id"],
        "org_id": ORG,
        "book_id": it["provenance"]["source_reference"]["book_id"],
        "outcome_id": it["outcome_id"],
        "kind": q["type"],
        "difficulty": q["difficulty"],
        "prompt": q["text"],
        "stimulus": q.get("stimulus"),
        "options": q.get("options"),
        "correct_answer": q["correct_answer"],
        "explanation": q["explanation"],
        "status": cf["status"],
        "source": it["provenance"]["source_reference"].get("question_bank_source", "import"),
        "verification_state": cf["verification_state"],
        "verification_tier": cf.get("verification_tier"),
        "verified_at": cf.get("verified_at"),
        "verification_note": cf.get("verification_note"),
        "external_ref": it["external_ref"],
        "created_at": it["provenance"]["created_at"],
        "updated_at": it["provenance"]["updated_at"],
    })
insert("question_bank", rows)

# ---- 5. stored engine evidence (historic, as exported) --------------------------
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
print("engine evidence rows", len(ev))

# ---- 6. post-import counts ------------------------------------------------------
print(json.dumps(select("question_bank?select=id&limit=1"), indent=0)[:0] or "")
