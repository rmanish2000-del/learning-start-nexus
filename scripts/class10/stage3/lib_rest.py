import json, os, urllib.request

BASE = os.environ["SUPABASE_URL"].rstrip("/") + "/rest/v1/"
KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
HDRS = {
    "apikey": KEY,
    "Authorization": "Bearer " + KEY,
    "Content-Type": "application/json",
}


def req(method, path, body=None, prefer=None):
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


def insert(table, rows, chunk=200, upsert=False, ignore_dupes=False):
    prefer = "return=minimal"
    if ignore_dupes:
        prefer += ",resolution=ignore-duplicates"
    elif upsert:
        prefer += ",resolution=merge-duplicates"
    for i in range(0, len(rows), chunk):
        req("POST", table, rows[i : i + chunk], prefer=prefer)
    return len(rows)


def patch(table, query, body):
    return req("PATCH", f"{table}?{query}", body, prefer="return=representation")


def delete(table, query):
    return req("DELETE", f"{table}?{query}", prefer="return=representation")


def select(path):
    return req("GET", path)
