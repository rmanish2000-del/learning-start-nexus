"""Item-level reconciliation: staging question_bank vs canonical package (content immutable)."""
import hashlib, json, sys
sys.path.insert(0, "/tmp/stage3")
from lib_rest import select

PKG = "/tmp/rem/EDUOS_REMEDIATION_PACKAGE_V1_CORRECTED"
items = json.load(open(f"{PKG}/EDUOS_ALL_329_ITEM_EXPORT_VALIDATED.json"))["items"]

db = []
page = 0
while True:
    chunk = select(
        "question_bank?select=id,external_ref,kind,difficulty,prompt,stimulus,options,"
        f"correct_answer,explanation,status,verification_state,verification_tier,outcome_id,book_id"
        f"&order=id&limit=200&offset={page*200}"
    )
    if not chunk:
        break
    db.extend(chunk)
    page += 1
by_id = {r["id"]: r for r in db}


def h(*parts):
    return hashlib.sha256("\u241f".join("" if p is None else str(p) for p in parts).encode()).hexdigest()


mismatch, matched = [], 0
for it in items:
    r = by_id.get(it["database_id"])
    if not r:
        mismatch.append({"id": it["database_id"], "why": "missing in staging"})
        continue
    q = it["question"]
    a = h(q["text"], q.get("stimulus"), q["type"], q["difficulty"],
          json.dumps(q.get("options"), ensure_ascii=False), q["correct_answer"], q["explanation"])
    b = h(r["prompt"], r["stimulus"], r["kind"], r["difficulty"],
          json.dumps(r["options"], ensure_ascii=False), r["correct_answer"], r["explanation"])
    if a != b:
        mismatch.append({"id": it["database_id"], "ref": it["external_ref"], "why": "content hash"})
    elif r["external_ref"] != it["external_ref"] or r["outcome_id"] != it["outcome_id"]:
        mismatch.append({"id": it["database_id"], "why": "identity fields"})
    else:
        matched += 1

report = {
    "staging_rows": len(db),
    "package_rows": len(items),
    "content_matched": matched,
    "mismatches": mismatch,
}
json.dump(report, open("/tmp/stage3/out/reconciliation.json", "w"), indent=2)
print(json.dumps({**report, "mismatches": mismatch[:5]}, indent=2))
