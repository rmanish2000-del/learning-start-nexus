"""Reconcile the 196 enhanced-review queue rows against current staging."""
import hashlib, json, sys
sys.path.insert(0, "/tmp/stage3")
from lib_rest import select

PKG = "/tmp/imp/pkg"
items = []
for f in ("EDUOS_MATHS_143_ENHANCED_AUTOMATED_REVIEW.json",
          "EDUOS_SCIENCE_53_ENHANCED_AUTOMATED_REVIEW.json"):
    items += json.load(open(f"{PKG}/{f}"))["items"]


def page(path):
    out, i = [], 0
    while True:
        chunk = select(f"{path}&limit=500&offset={i*500}")
        if not chunk:
            return out
        out += chunk
        i += 1


queue = page("sme_review_queue?select=id,subject,question_id,external_ref,routing_reason,evidence&order=id")
qb = page("question_bank?select=id,external_ref,prompt,stimulus,options,correct_answer,explanation,updated_at,status,verification_state,verification_tier&order=id")
by_q = {r["id"]: r for r in qb}
by_key = {f'{r["question_id"]}#{r["routing_reason"]}': r for r in queue}


def content_sha(r):
    return hashlib.sha256(json.dumps({
        "prompt": r["prompt"], "stimulus": r.get("stimulus"), "options": r.get("options"),
        "correct_answer": r["correct_answer"], "explanation": r["explanation"],
    }, sort_keys=True, ensure_ascii=False).encode()).hexdigest()


problems = []
matched = []
for it in items:
    key = it["queue_row"]
    qrow = by_key.get(key)
    if not qrow:
        problems.append({"key": key, "why": "queue row missing"}); continue
    q = by_q.get(it["question_id"])
    if not q:
        problems.append({"key": key, "why": "question missing"}); continue
    if qrow["subject"] != it["subject"]:
        problems.append({"key": key, "why": "subject drift"}); continue
    if (qrow["external_ref"] or None) != it["external_ref"] or (q["external_ref"] or None) != it["external_ref"]:
        problems.append({"key": key, "why": "external_ref drift"}); continue
    if q["updated_at"] != it["item_version"]["updated_at"]:
        problems.append({"key": key, "why": f'version drift {q["updated_at"]}'}); continue
    sha = content_sha(q)
    if sha != it["item_version"]["content_sha256"]:
        problems.append({"key": key, "why": "content hash drift"}); continue
    matched.append({"key": key, "queue_id": qrow["id"], "question_id": q["id"],
                    "external_ref": q["external_ref"], "subject": qrow["subject"],
                    "routing_reason": qrow["routing_reason"], "content_sha256": sha,
                    "updated_at": q["updated_at"], "outcome": it["outcome"]})

outcomes = {}
for m in matched:
    outcomes[m["outcome"]] = outcomes.get(m["outcome"], 0) + 1
distinct = {}
for m in matched:
    distinct.setdefault(m["question_id"], set()).add(m["outcome"])

report = {
    "package_rows": len(items),
    "reconciled": len(matched),
    "problems": problems,
    "queue_total_in_db": len(queue),
    "by_subject": {s: sum(1 for m in matched if m["subject"] == s) for s in ("Mathematics", "Science")},
    "queue_row_outcomes": outcomes,
    "distinct_questions": len(distinct),
    "distinct_question_outcomes": {
        o: sum(1 for v in distinct.values() if v == {o}) for o in sorted(outcomes)
    },
    "multi_outcome_questions": {k: sorted(v) for k, v in distinct.items() if len(v) > 1},
}
json.dump({"report": report, "matched": matched}, open("/tmp/imp/reconciliation.json", "w"), indent=2)
print(json.dumps(report, indent=2)[:3000])
