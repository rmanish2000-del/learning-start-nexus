"""Pre-import rollback snapshot: advisory tables, queue routing, review evidence, versions, hashes."""
import hashlib, json, sys
sys.path.insert(0, "/tmp/stage3")
from lib_rest import select


def page(path):
    out, i = [], 0
    while True:
        chunk = select(f"{path}&limit=500&offset={i*500}")
        if not chunk:
            return out
        out += chunk
        i += 1


snap = {
    "automated_review_imports": page("automated_review_imports?select=*&order=id"),
    "automated_provisional_outcomes": page("automated_provisional_outcomes?select=*&order=id"),
    "automated_review_rollback_events": page("automated_review_rollback_events?select=*&order=id"),
    "sme_review_queue": page("sme_review_queue?select=*&order=id"),
    "question_verifications": page("question_verifications?select=*&order=id"),
    "question_auto_verifications": page("question_auto_verifications?select=id,question_id,run_id,engine_version,outcome,confidence&order=id"),
    "question_pool_exclusions": page("question_pool_exclusions?select=*&order=id"),
    "remediation_work_items": page("remediation_work_items?select=*&order=id"),
    "question_versions": page(
        "question_bank?select=id,external_ref,updated_at,status,verification_state,"
        "verification_tier,prompt,stimulus,options,correct_answer,explanation&order=id"),
}
for r in snap["question_versions"]:
    r["content_sha256"] = hashlib.sha256(json.dumps({
        "prompt": r["prompt"], "stimulus": r.get("stimulus"), "options": r.get("options"),
        "correct_answer": r["correct_answer"], "explanation": r["explanation"],
    }, sort_keys=True, ensure_ascii=False).encode()).hexdigest()
    for k in ("prompt", "stimulus", "options", "correct_answer", "explanation"):
        r.pop(k)

path = sys.argv[1] if len(sys.argv) > 1 else "/tmp/imp/snapshot_pre_import.json"
json.dump(snap, open(path, "w"), indent=1, sort_keys=True)
digest = hashlib.sha256(open(path, "rb").read()).hexdigest()
print(json.dumps({"path": path, "sha256": digest,
                  "counts": {k: len(v) for k, v in snap.items()}}, indent=2))
