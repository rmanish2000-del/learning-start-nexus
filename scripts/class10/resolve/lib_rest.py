"""Minimal PostgREST helper for the staging resolution scripts.

Uses the staging service role from the environment. Read/write only against the
staging database; these scripts are never pointed at production.
"""

from __future__ import annotations

import json
import os
import urllib.error
import urllib.request

BASE = os.environ["SUPABASE_URL"].rstrip("/") + "/rest/v1/"
KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
HDRS = {"apikey": KEY, "Authorization": "Bearer " + KEY, "Content-Type": "application/json"}


def req(method: str, path: str, body=None, prefer: str | None = None):
    h = dict(HDRS)
    if prefer:
        h["Prefer"] = prefer
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(BASE + path, data=data, headers=h, method=method)
    try:
        with urllib.request.urlopen(r) as resp:
            raw = resp.read().decode()
            return json.loads(raw) if raw.strip() else []
    except urllib.error.HTTPError as e:
        raise SystemExit(f"{method} {path} -> {e.code}: {e.read().decode()[:800]}")


def insert(table: str, rows: list[dict], chunk: int = 200, ignore_dupes: bool = False) -> int:
    prefer = "return=minimal"
    if ignore_dupes:
        prefer += ",resolution=ignore-duplicates"
    for i in range(0, len(rows), chunk):
        req("POST", table, rows[i : i + chunk], prefer=prefer)
    return len(rows)


def select(path: str):
    return req("GET", path)
