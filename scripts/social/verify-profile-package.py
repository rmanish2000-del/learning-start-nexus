#!/usr/bin/env python3
"""Independent verifier for social-profile-package/ and the launch ZIP.

Deliberately shares no code with build-profile-package.py: it re-reads the
manifest, recomputes every SHA-256, re-measures every raster with Pillow,
checks the ZIP byte-for-byte against the folder, and guards against blank or
off-brand placeholders. Exit 0 only when every check passes.

Run: python3 scripts/social/verify-profile-package.py
"""
from __future__ import annotations

import hashlib
import json
import sys
import zipfile
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "social-profile-package"
ZIP = ROOT / "EduOS_Social_Profile_Launch_Package.zip"
EXPECTED_CANONICAL = 28
ORANGE = (0xF9, 0x73, 0x16)


def sha(p: Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()


def has_brand_orange(im: Image.Image) -> bool:
    # Sample at a resolution that keeps a 6px rule on a 2560px canvas visible.
    rgb = im.convert("RGB")
    rgb.thumbnail((512, 512))
    for r, g, b in set(rgb.getdata()):
        if abs(r - ORANGE[0]) < 40 and abs(g - ORANGE[1]) < 40 and abs(b - ORANGE[2]) < 60:
            return True
    return False


def main() -> int:
    fails: list[str] = []
    m = json.loads((OUT / "asset-manifest.json").read_text())
    sums = {l.split("  ", 1)[1]: l[:64] for l in (OUT / "SHA256SUMS.txt").read_text().splitlines()}
    items = m["assets"] + m["variants"]

    if len(m["assets"]) != EXPECTED_CANONICAL:
        fails.append(f"canonical asset count {len(m['assets'])} != {EXPECTED_CANONICAL}")
    if m["counts"] != {"canonical_assets": len(m["assets"]), "jpg_variants": len(m["variants"]),
                       "files": len(items), "previews": len(m["previews"])}:
        fails.append("counts field disagrees with asset lists")

    for a in items:
        p = OUT / a["file"]
        if not p.exists():
            fails.append(f"missing {a['file']}")
            continue
        digest = sha(p)
        if digest != a["sha256"]:
            fails.append(f"manifest sha mismatch {a['file']}")
        if sums.get(a["file"]) != digest:
            fails.append(f"SHA256SUMS mismatch {a['file']}")
        if a["format"] == "svg":
            t = p.read_text()
            if "<svg" not in t or ("#F97316" not in t and "currentColor" not in t):
                fails.append(f"svg content {a['file']}")
            continue
        with Image.open(p) as im:
            if im.size != (a["width"], a["height"]):
                fails.append(f"dimensions {a['file']}: {im.size} != {(a['width'], a['height'])}")
            fmt = (im.format or "").lower().replace("jpeg", "jpg")
            if fmt != a["format"]:
                fails.append(f"format {a['file']}: {fmt} != {a['format']}")
            ext = im.convert("RGB").getextrema()
            if all(lo == hi for lo, hi in ext):
                fails.append(f"blank image {a['file']}")
            # Watermarks are single-colour (white / navy) by design.
            if a["kind"] != "watermark" and not has_brand_orange(im):
                fails.append(f"no brand orange in {a['file']}")

    for prev in m["previews"]:
        if not (OUT / prev).exists():
            fails.append(f"missing preview {prev}")

    disk = {p.relative_to(OUT).as_posix() for p in OUT.rglob("*") if p.is_file() and p.name != "SHA256SUMS.txt"}
    if disk != set(sums):
        fails.append(f"SHA256SUMS coverage differs: {sorted(disk ^ set(sums))}")

    if not ZIP.exists():
        fails.append("ZIP missing")
    else:
        z = zipfile.ZipFile(ZIP)
        names = [n for n in z.namelist() if not n.endswith("/")]
        inzip = {n.split("/", 1)[1] for n in names}
        if inzip != disk | {"SHA256SUMS.txt"}:
            fails.append(f"zip vs folder differs: {sorted(inzip ^ (disk | {'SHA256SUMS.txt'}))}")
        for n in names:
            if hashlib.sha256(z.read(n)).hexdigest() != sha(OUT / n.split("/", 1)[1]):
                fails.append(f"zip content differs {n}")

    v = m["validation"]
    if not v["all_text_inside_safe_areas"]:
        fails.append("text outside safe areas")

    print(f"canonical={len(m['assets'])} variants={len(m['variants'])} previews={len(m['previews'])} "
          f"safe-area-checks={len(v['safe_area_checks'])} zip-entries={len(names) if ZIP.exists() else 0}")
    print("VERIFY:", "PASS" if not fails else "FAIL")
    for f in fails:
        print("  -", f)
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
