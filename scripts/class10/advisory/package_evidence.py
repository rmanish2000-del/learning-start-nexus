"""Build the downloadable evidence package for the advisory import."""
import csv, hashlib, json, os, subprocess, sys, zipfile
sys.path.insert(0, "/tmp/stage3")
from lib_rest import select

OUT = "/tmp/imp/evidence"
os.makedirs(OUT, exist_ok=True)


def page(path):
    out, i = [], 0
    while True:
        chunk = select(f"{path}&limit=500&offset={i*500}")
        if not chunk:
            return out
        out += chunk
        i += 1


rows = page("automated_provisional_outcomes?select=*&superseded_at=is.null&order=queue_row_key")
qview = page("automated_provisional_question_outcomes?select=*&order=question_id")
val = json.load(open("/tmp/imp/validation.json"))
recon = json.load(open("/tmp/imp/reconciliation.json"))["report"]

json.dump(rows, open(f"{OUT}/EDUOS_ADVISORY_IMPORT_RECORDS.json", "w"), indent=1, sort_keys=True)
json.dump({"reconciliation": recon, "validation": val},
          open(f"{OUT}/EDUOS_ADVISORY_IMPORT_VALIDATION.json", "w"), indent=2, sort_keys=True)

with open(f"{OUT}/EDUOS_ADVISORY_PROVISIONAL_PASS_ITEMS.csv", "w", newline="") as f:
    w = csv.writer(f)
    w.writerow(["question_id", "external_ref", "subject", "queue_routing_reason",
                "content_sha256", "decision_class", "paid_selection_eligible"])
    for r in rows:
        if r["provisional_outcome"] == "AUTOMATED_PROVISIONAL_PASS":
            w.writerow([r["question_id"], r["external_ref"], r["subject"],
                        r["queue_routing_reason"], r["content_sha256"],
                        r["decision_class"], "false"])

with open(f"{OUT}/EDUOS_ADVISORY_UNRESOLVED_ITEMS.csv", "w", newline="") as f:
    w = csv.writer(f)
    w.writerow(["queue_row_key", "external_ref", "subject", "queue_routing_reason", "reason"])
    for r in rows:
        if r["provisional_outcome"] == "AUTOMATED_UNRESOLVED":
            w.writerow([r["queue_row_key"], r["external_ref"], r["subject"],
                        r["queue_routing_reason"],
                        (r["pass_c_evidence"].get("reasons") or [""])[0]])

with open(f"{OUT}/EDUOS_ADVISORY_QUESTION_LEVEL_OUTCOMES.csv", "w", newline="") as f:
    w = csv.writer(f)
    w.writerow(["question_id", "external_ref", "subject", "queue_rows", "provisional_outcome"])
    for r in qview:
        w.writerow([r["question_id"], r["external_ref"], r["subject"],
                    r["queue_rows"], r["provisional_outcome"]])

open(f"{OUT}/README.md", "w").write(
    "# EduOS staging automated provisional advisory import\n\n"
    "These are automated provisional decisions created under founder authorization. They are "
    "not named-human SME decisions, copyright clearance, official CBSE/NCERT certification, or "
    "production approval.\n\n"
    f"- Source package: EDUOS_196_ENHANCED_AUTOMATED_REVIEW_PACKAGE.zip, 70019 bytes, "
    "SHA-256 6b01f2b202647a5ab415a02353c8bb44c9de5c538ee9e032c80752d03dda7f16\n"
    f"- Queue rows imported: {len(rows)}; distinct questions: {len(qview)}\n"
    "- Outcomes (queue rows): 148 AUTOMATED_PROVISIONAL_PASS, 1 AUTOMATED_PROVISIONAL_CONTENT_FIX, "
    "47 AUTOMATED_UNRESOLVED\n"
    "- Outcomes (distinct questions): 148 / 1 / 46 (REQ024-DIAG-004 has two routing rows, one question)\n"
    "- Every record is labelled FOUNDER_AUTHORIZED_AUTOMATED_PROVISIONAL with no human identity, "
    "qualification or signature, and no approval, verification, certification, content, pool or "
    "Engine v1.0.0 field was changed.\n"
    "- Provisional-pass items remain excluded from paid selection and production export.\n\n"
    "## Rollback\n\n"
    "Staging: mark the advisory rows superseded and the import rolled_back, then append a ROLLBACK "
    "event (`scripts/class10/advisory/validate.py` exercises this); re-running "
    "`scripts/class10/advisory/import.py` restores an identical state hash.\n"
    "Repository: `git revert <commit>` — non-destructive, leaves the append-only evidence intact.\n")

files = sorted(os.listdir(OUT))
files = [f for f in files if f != "SHA256SUMS.txt"]
with open(f"{OUT}/SHA256SUMS.txt", "w") as f:
    for name in files:
        f.write(f"{hashlib.sha256(open(f'{OUT}/{name}','rb').read()).hexdigest()}  {name}\n")

zip_path = "/mnt/documents/EDUOS_ADVISORY_IMPORT_EVIDENCE.zip"
with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as z:
    for name in files + ["SHA256SUMS.txt"]:
        z.write(f"{OUT}/{name}", name)

print(json.dumps({
    "zip": zip_path, "bytes": os.path.getsize(zip_path),
    "sha256": hashlib.sha256(open(zip_path, "rb").read()).hexdigest(),
    "files": {n: hashlib.sha256(open(f"{OUT}/{n}", "rb").read()).hexdigest()
              for n in files + ["SHA256SUMS.txt"]},
}, indent=2))
