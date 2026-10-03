#!/usr/bin/env python3
"""Generate the forward-only staging reconciliation migration from main's
own applied migrations. Every statement is rewritten into an idempotent,
data-preserving form; no applied migration is read for anything but text.

Usage: python3 scripts/db/generate-reconciliation-migration.py > supabase/migrations/<ts>_staging_reconciliation_forward_only.sql
"""
import re, sys, pathlib

ROOT = pathlib.Path(__file__).resolve().parents[2]
MIG = ROOT / "supabase/migrations"

SOURCES = [
    "20260919175712_8a16e7d2-73e0-40d7-908e-d07bd538e2fa.sql",  # 14 remediation/automation tables
    "20260919175907_a6cec947-baea-4506-9661-db7cef48a32a.sql",  # exclusions / work item inserts (already ON CONFLICT DO NOTHING)
    "20260919195620_b30e9647-5517-4603-9c1c-6d244ee2c4b3.sql",  # question_commercial_release + production_release_pool
    "20260919195651_fdde1774-86cb-44f5-9172-ac6398190072.sql",  # view security_invoker
    "20261002045629_be60915e-3ad8-4dbe-9bbb-314f7edca414.sql",  # pilot_leads columns + founder_access_denials (already IF NOT EXISTS)
    "20261002050331_7ac11e74-e65e-4d5e-9ab7-443ab74e82ce.sql",  # is_platform_owner confirmed-email (CREATE OR REPLACE)
]

def split_statements(sql: str):
    """Split on ';' outside dollar-quoted strings and '--' comments."""
    stmts, buf, i, n = [], [], 0, len(sql)
    tag = None
    in_str = False
    while i < n:
        ch = sql[i]
        if tag is None and in_str:
            buf.append(ch); i += 1
            if ch == "'":
                if i < n and sql[i] == "'":
                    buf.append("'"); i += 1  # escaped quote
                else:
                    in_str = False
            continue
        if tag is None and ch == "'":
            in_str = True; buf.append(ch); i += 1; continue
        if tag is None and sql.startswith("--", i):
            j = sql.find("\n", i)
            j = n if j == -1 else j
            buf.append(sql[i:j]); i = j; continue
        if tag is None:
            m = re.match(r"\$[A-Za-z_]*\$", sql[i:])
            if m:
                tag = m.group(0); buf.append(tag); i += len(tag); continue
            if ch == ";":
                s = "".join(buf).strip()
                if s: stmts.append(s)
                buf = []; i += 1; continue
        else:
            if sql.startswith(tag, i):
                buf.append(tag); i += len(tag); tag = None; continue
        buf.append(ch); i += 1
    s = "".join(buf).strip()
    if s: stmts.append(s)
    return stmts

def strip_leading_comments(s: str) -> str:
    lines = s.split("\n")
    while lines and (lines[0].strip().startswith("--") or not lines[0].strip()):
        lines.pop(0)
    return "\n".join(lines)

def guard(cond_sql: str, body: str) -> str:
    body = body.replace("$guard$", "$guard_$")
    return ("DO $do$\nBEGIN\n  IF NOT EXISTS (" + cond_sql + ") THEN\n    EXECUTE $guard$" + body + "$guard$;\n  END IF;\nEND\n$do$")

def relation_guard(table: str, body: str) -> str:
    body = body.replace("$guard$", "$guard_$")
    return ("DO $do$\nBEGIN\n  IF to_regclass('public." + table + "') IS NOT NULL THEN\n    EXECUTE $guard$" + body + "$guard$;\n  END IF;\nEND\n$do$")

def transform(stmt: str) -> str:
    s = strip_leading_comments(stmt)
    head = s.lstrip().upper()
    if head.startswith("CREATE TABLE PUBLIC."):
        return re.sub(r"^\s*CREATE TABLE public\.", "CREATE TABLE IF NOT EXISTS public.", s, count=1)
    if head.startswith("CREATE UNIQUE INDEX "):
        return re.sub(r"^\s*CREATE UNIQUE INDEX ", "CREATE UNIQUE INDEX IF NOT EXISTS ", s, count=1)
    if head.startswith("CREATE INDEX "):
        return re.sub(r"^\s*CREATE INDEX ", "CREATE INDEX IF NOT EXISTS ", s, count=1)
    if head.startswith("CREATE POLICY "):
        m = re.match(r'\s*CREATE POLICY "([^"]+)" ON public\.(\w+)', s)
        assert m, s[:80]
        name, table = m.group(1), m.group(2)
        return guard(f"SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = '{table}' AND policyname = '{name}'", s)
    if head.startswith("CREATE TRIGGER "):
        m = re.match(r"\s*CREATE TRIGGER (\w+)[\s\S]*? ON public\.(\w+)", s)
        assert m, s[:80]
        name, table = m.group(1), m.group(2)
        return guard(f"SELECT 1 FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = '{table}' AND t.tgname = '{name}' AND NOT t.tgisinternal", s)
    if head.startswith("CREATE VIEW "):
        return re.sub(r"^\s*CREATE VIEW ", "CREATE OR REPLACE VIEW ", s, count=1)
    if head.startswith("ALTER VIEW PUBLIC.PRODUCTION_RELEASE_POOL"):
        return ("DO $do$\nBEGIN\n  IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'production_release_pool') THEN\n    EXECUTE $guard$" + s + "$guard$;\n  END IF;\nEND\n$do$")
    if head.startswith(("GRANT ", "REVOKE ")) and " ON FUNCTION " in head:
        return s  # the function is created by CREATE OR REPLACE just above
    if head.startswith(("GRANT ", "REVOKE ")):
        # Grants on relations the migration does not itself create (feedback,
        # guidance, invitations) must not fail on a database lacking them.
        m = re.search(r" ON (?:TABLE )?public\.(\w+)", s)
        assert m, s[:80]
        return relation_guard(m.group(1), s)
    if head.startswith("ALTER TABLE PUBLIC."):
        if ("DROP COLUMN" in head or "DROP CONSTRAINT" in head) and "IF EXISTS" not in head:
            raise SystemExit("refusing destructive ALTER: " + s[:120])
        m = re.match(r"\s*ALTER TABLE public\.(\w+)", s)
        return relation_guard(m.group(1), s)
    if head.startswith("DROP TRIGGER IF EXISTS "):
        m = re.search(r" ON public\.(\w+)", s)
        return relation_guard(m.group(1), s)
    if head.startswith(("CREATE OR REPLACE FUNCTION", "INSERT INTO ", "CREATE TABLE IF NOT EXISTS")):
        return s
    raise SystemExit("unhandled statement kind: " + s[:120])

FORBIDDEN = re.compile(r"\b(DROP\s+TABLE|TRUNCATE|DELETE\s+FROM|DROP\s+COLUMN|DROP\s+SCHEMA|DROP\s+DATABASE)\b", re.I)

out = []
out.append("""-- Forward-only staging reconciliation (generated by scripts/db/generate-reconciliation-migration.py)
--
-- Purpose: make a database that followed the staging history (full
-- 20260915161655 remediation DDL, the hardened PR #5 20261002052550, the
-- renamed 20260905100552/100631/100711 copies) converge on canonical main's
-- schema WITHOUT touching any applied migration and WITHOUT deleting or
-- overwriting a single row. Every statement is idempotent:
--   CREATE TABLE/INDEX ... IF NOT EXISTS, policies and triggers created only
--   when absent, views CREATE OR REPLACE, functions CREATE OR REPLACE,
--   inserts ON CONFLICT DO NOTHING, grants/revokes re-asserted.
-- On a database that already followed main this migration is a no-op.
-- It never DROPs a table or column, never TRUNCATEs, never DELETEs.
--
-- It does NOT and cannot mark main-only migration names as applied on
-- staging; that is a migration-ledger operation (see
-- verification/staging-migration-reconciliation/VERIFICATION_REPORT.md).
""")
for name in SOURCES:
    text = (MIG / name).read_text(encoding="utf8")
    out.append(f"\n-- ===== from {name} =====")
    for st in split_statements(text):
        t = transform(st)
        if FORBIDDEN.search(re.sub(r"--[^\n]*", "", t)):
            raise SystemExit("forbidden destructive statement produced: " + t[:120])
        out.append(t + ";")

# PR #5 hardened staging behaviour (20261002052550): the owner policies on
# pilot_leads exist on both histories; re-assert them only when absent.
out.append("\n-- ===== PR #5 hardened owner policies on pilot_leads (ensure present) =====")
for pol, body in [
    ("Platform owner reads pilot applications", 'CREATE POLICY "Platform owner reads pilot applications" ON public.pilot_leads FOR SELECT TO authenticated USING (private.is_platform_owner())'),
    ("Platform owner updates pilot applications", 'CREATE POLICY "Platform owner updates pilot applications" ON public.pilot_leads FOR UPDATE TO authenticated USING (private.is_platform_owner()) WITH CHECK (private.is_platform_owner())'),
]:
    out.append(guard(f"SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'pilot_leads' AND policyname = '{pol}'", body) + ";")

sys.stdout.write("\n".join(out) + "\n")
