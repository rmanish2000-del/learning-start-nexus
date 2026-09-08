#!/usr/bin/env python3
"""Independent verifier for social-profile-package/ and the launch ZIP.

Shares no code with generate-profile-package.py. It re-reads the manifest,
recomputes every SHA-256, re-measures every raster, checks the ZIP byte-for-byte
against the folder, and then checks the things a human reviewer would:
circular avatar crops, banner and YouTube safe areas by pixel, Highlight and
grid readability, blank/placeholder images, off-brand text, secrets, and that
pricing, support email, URLs and UTM parameters match the launch kit.
Exit 0 only when every check passes.

Run: python3 scripts/social/verify-profile-package.py
"""
from __future__ import annotations

import hashlib
import json
import re
import sys
import zipfile
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "social-profile-package"
ZIP = ROOT / "EduOS_Social_Profile_Launch_Package.zip"
KIT = json.loads((ROOT / "content/social/launch-kit.json").read_text())
EXPECTED = dict(canonical=28, variants=12, previews=5)
NAVY, ORANGE = (0x0C, 0x16, 0x28), (0xF9, 0x73, 0x16)
REQUIRED_FILES = ["README.md", "asset-manifest.json", "SHA256SUMS.txt", "copy.md", "alt-text.md",
                  "upload-manifest.md", "utm-manifest.json", "DERIVED_SPECIFICATION.md",
                  "licences/OFL-Inter.txt", "licences/OFL-Outfit.txt"]
FORBIDDEN_TEXT = re.compile(r"lovable|gpt-?engineer|supabase|service[_ -]?role|api[_ -]?key|secret|password|bearer |"
                            r"sk-[a-z0-9]{8,}|eyJ[a-zA-Z0-9_-]{20,}|AKIA[0-9A-Z]{16}|BEGIN (RSA|EC|OPENSSH) PRIVATE", re.I)
UTM_SOURCES = {"instagram", "facebook", "linkedin", "youtube", "whatsapp", "x"}


def sha(p: Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()


def near(px, ref, tol=28):
    return all(abs(a - b) <= tol for a, b in zip(px, ref))


def has_orange(im: Image.Image) -> bool:
    rgb = im.convert("RGB")
    rgb.thumbnail((512, 512))
    return any(near(px, ORANGE, 40) for px in set(rgb.getdata()))


def outside_is_navy(im: Image.Image, box, step=4) -> float:
    """Fraction of pixels outside `box` that are the plain navy field."""
    rgb = im.convert("RGB")
    x0, y0, x1, y1 = box
    total = bad = 0
    for y in range(0, rgb.height, step):
        for x in range(0, rgb.width, step):
            if x0 <= x < x1 and y0 <= y < y1:
                continue
            total += 1
            if not near(rgb.getpixel((x, y)), NAVY):
                bad += 1
    return 1 - bad / max(total, 1)


def circle_safe(im: Image.Image) -> bool:
    """Every non-navy pixel of a square avatar lies inside the inscribed circle (with margin)."""
    rgb = im.convert("RGB")
    n = rgb.width
    r = n / 2 * 0.92  # 8% margin: platforms also shrink/pad the circle slightly
    cx = cy = n / 2
    for y in range(0, n, 2):
        for x in range(0, n, 2):
            if not near(rgb.getpixel((x, y)), NAVY) and (x - cx) ** 2 + (y - cy) ** 2 > r * r:
                return False
    return True


def main() -> int:
    fails: list[str] = []
    m = json.loads((OUT / "asset-manifest.json").read_text())
    sums = {l.split("  ", 1)[1]: l[:64] for l in (OUT / "SHA256SUMS.txt").read_text().splitlines()}
    items = m["assets"] + m["variants"]
    by_file = {a["file"]: a for a in items}

    # --- counts & required files -------------------------------------------
    if len(m["assets"]) != EXPECTED["canonical"]:
        fails.append(f"canonical count {len(m['assets'])} != {EXPECTED['canonical']}")
    if len(m["variants"]) != EXPECTED["variants"]:
        fails.append(f"variant count {len(m['variants'])} != {EXPECTED['variants']}")
    if len(m["previews"]) != EXPECTED["previews"]:
        fails.append(f"preview count {len(m['previews'])} != {EXPECTED['previews']}")
    if m["counts"] != {"canonical_assets": len(m["assets"]), "jpg_variants": len(m["variants"]),
                       "files": len(items), "previews": len(m["previews"])}:
        fails.append("counts field disagrees with lists")
    for f in REQUIRED_FILES:
        if not (OUT / f).exists():
            fails.append(f"required file missing: {f}")
    for lic in ("licences/OFL-Inter.txt", "licences/OFL-Outfit.txt"):
        p = OUT / lic
        if p.exists() and "SIL OPEN FONT LICENSE Version 1.1" not in p.read_text():
            fails.append(f"{lic} is not the OFL 1.1 text")

    # --- per-file integrity ------------------------------------------------
    for a in items:
        p = OUT / a["file"]
        if not p.exists():
            fails.append(f"missing {a['file']}")
            continue
        d = sha(p)
        if d != a["sha256"]:
            fails.append(f"manifest sha mismatch {a['file']}")
        if sums.get(a["file"]) != d:
            fails.append(f"SHA256SUMS mismatch {a['file']}")
        if a["format"] == "svg":
            t = p.read_text()
            if "<svg" not in t or ("#F97316" not in t and "currentColor" not in t):
                fails.append(f"svg content {a['file']}")
            if FORBIDDEN_TEXT.search(t):
                fails.append(f"forbidden text in {a['file']}")
            continue
        with Image.open(p) as im:
            if im.size != (a["width"], a["height"]):
                fails.append(f"dimensions {a['file']}: {im.size}")
            fmt = (im.format or "").lower().replace("jpeg", "jpg")
            if fmt != a["format"]:
                fails.append(f"format {a['file']}: {fmt}")
            if all(lo == hi for lo, hi in im.convert("RGB").getextrema()):
                fails.append(f"blank image {a['file']}")
            if a["kind"] != "watermark" and not has_orange(im):
                fails.append(f"no brand orange in {a['file']}")
            meta = " ".join(str(v) for v in getattr(im, "info", {}).values())
            if FORBIDDEN_TEXT.search(meta):
                fails.append(f"forbidden text in image metadata {a['file']}")
            # circular crop: avatars
            if a["kind"] == "avatar" and not circle_safe(im):
                fails.append(f"avatar mark leaves circular crop: {a['file']}")
            # safe areas by pixel: banners/covers (everything outside is navy field)
            if a["kind"] in ("banner", "cover") and a["format"] == "png":
                s = a["safe_area"]
                frac = outside_is_navy(im, (s["x0"], s["y0"], s["x1"], s["y1"]))
                if frac < 0.999:
                    fails.append(f"content outside safe area in {a['file']} ({frac:.4f} navy)")
            if a["file"].endswith("banner-youtube-2560x1440.png"):
                sx0, sy0 = (2560 - 1546) // 2, (1440 - 423) // 2
                if outside_is_navy(im, (sx0, sy0, sx0 + 1546, sy0 + 423)) < 0.999:
                    fails.append("YouTube: content outside the 1546x423 cross-device safe area")
            # Highlight covers: content inside the centred circle Instagram shows
            if a["kind"] == "highlight_cover":
                sq = im.crop((0, 420, 1080, 1500))
                if not circle_safe(sq):
                    fails.append(f"highlight content leaves circular crop: {a['file']}")

    # --- readability (from generator telemetry, thresholds are ours) ----------
    for v in m["validation"]["safe_area_checks"]:
        if not v["ok"]:
            fails.append(f"text outside safe area: {v['file']}")
        # Readability floors are on the smallest *font size* used per asset, scaled to
        # how each surface is actually viewed (grid tiles ~120px wide on a phone,
        # Highlight circles ~77px, banners at 40-60% scale on mobile).
        kind = by_file.get(v["file"], {}).get("kind")
        floor = {"instagram_grid": 32, "highlight_cover": 96, "pinned_post": 26, "banner": 20, "cover": 20}.get(kind, 16)
        if v.get("min_font_px") is not None and v["min_font_px"] < floor:
            fails.append(f"smallest font in {v['file']} is {v['min_font_px']}px < {floor}px floor")
        head_floor = {"instagram_grid": 96, "highlight_cover": 96, "pinned_post": 48}.get(kind)
        if head_floor and v.get("max_font_px") is not None and v["max_font_px"] < head_floor:
            fails.append(f"headline in {v['file']} is {v['max_font_px']}px < {head_floor}px floor")

    # --- previews, coverage, zip --------------------------------------------
    for prev in m["previews"]:
        if not (OUT / prev).exists():
            fails.append(f"missing preview {prev}")
    disk = {p.relative_to(OUT).as_posix() for p in OUT.rglob("*") if p.is_file() and p.name != "SHA256SUMS.txt"}
    if disk != set(sums):
        fails.append(f"SHA256SUMS coverage differs: {sorted(disk ^ set(sums))}")
    names: list[str] = []
    if not ZIP.exists():
        fails.append("ZIP missing")
    else:
        with zipfile.ZipFile(ZIP) as z:
            if z.testzip() is not None:
                fails.append("ZIP CRC failure")
            names = [n for n in z.namelist() if not n.endswith("/")]
            inzip = {n.split("/", 1)[1] for n in names}
            if inzip != disk | {"SHA256SUMS.txt"}:
                fails.append(f"zip vs folder differs: {sorted(inzip ^ (disk | {'SHA256SUMS.txt'}))}")
            for n in names:
                if hashlib.sha256(z.read(n)).hexdigest() != sha(OUT / n.split("/", 1)[1]):
                    fails.append(f"zip content differs {n}")

    # --- text documents: secrets, branding, facts -----------------------------
    texts = {p.relative_to(OUT).as_posix(): p.read_text(errors="replace")
             for p in OUT.rglob("*") if p.suffix in (".md", ".json", ".txt", ".svg")}
    for name, t in texts.items():
        if name.startswith("licences/"):
            continue
        for mt in FORBIDDEN_TEXT.finditer(t):
            fails.append(f"forbidden/secret-like text in {name}: '{mt.group(0)}'")
    corpus = "\n".join(texts.values())
    pr = KIT["pricing"]
    for needle in [f"₹{pr['diagnostic_inr']}", f"₹{pr['annual_plan_inr']:,}", f"₹{pr['upgrade_payable_inr']:,}",
                   f"{pr['credit_window_days']} days", KIT["support_email"], KIT["site"]]:
        if needle not in corpus:
            fails.append(f"kit fact missing from copy: {needle}")
    for bad in re.findall(r"₹\s?([\d,]+)", corpus):
        if int(bad.replace(",", "")) not in {0, pr["diagnostic_inr"], pr["annual_plan_inr"], pr["upgrade_payable_inr"], pr["eligible_credit_inr"]}:
            fails.append(f"unapproved price in copy: ₹{bad}")
    for url in re.findall(r"https?://[^\s)\]`|\"']+", corpus):
        if not url.startswith(KIT["site"]) and not any(h in url for h in ("github.com", "scripts.sil.org", "www.w3.org/2000/svg", "openfontlicense.org")):
            fails.append(f"off-site URL: {url}")
        q = dict(kv.split("=", 1) for kv in url.split("?", 1)[1].split("&")) if "?" in url else {}
        if q:
            src = q.get("utm_source", "<platform>")
            if src != "<platform>" and src not in UTM_SOURCES:
                fails.append(f"utm_source not approved: {url}")
            if q.get("utm_medium") != "social":
                fails.append(f"utm_medium != social: {url}")
            if q.get("utm_campaign") not in KIT["utm_taxonomy"]["campaigns"]:
                fails.append(f"utm_campaign not in kit taxonomy: {url}")
    # The kit's own rule sentence names the forbidden things; check everything else.
    # Strip negated sentences ("no claims, testimonials … are introduced") before checking.
    claims_corpus = re.sub(r"(?is)\bno (claims|testimonials)\b[^.]*\.", " ", corpus)
    for word in ("testimonial", "guarantee", "% of students", "partnered with", "results show", "proven to"):
        if word in claims_corpus:
            fails.append(f"claim-like language present: '{word}'")

    print(f"canonical={len(m['assets'])} variants={len(m['variants'])} previews={len(m['previews'])} "
          f"safe-area-checks={len(m['validation']['safe_area_checks'])} zip-entries={len(names)}")
    print("VERIFY:", "PASS" if not fails else "FAIL")
    for f in fails:
        print("  -", f)
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
