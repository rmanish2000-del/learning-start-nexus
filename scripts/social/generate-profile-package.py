#!/usr/bin/env python3
"""Builds the EduOS Social Profile Launch Package (deterministic).

Generates every profile-level asset needed to open the official EduOS social
accounts — avatars, banners/covers, watermarks, pinned-post cards, Instagram
Highlight covers and an Instagram grid triptych — from approved sources only:

  * Brand mark + tokens: scripts/branding/generate-icons.py, src/styles.css
    (--eds-dark-nav #0C1628, --eds-orange-500 #F97316, neutrals).
  * Copy: content/social/LAUNCH_KIT.md / launch-kit.json (verbatim lines only;
    no claims, testimonials, statistics or outcomes are introduced).
  * Fonts: the approved stack (Outfit display / Inter body) when the TTFs are
    available locally, otherwise the same DejaVu Sans Bold the icon generator uses.

Outputs social-profile-package/ (assets, previews, manifests, checksums) and
EduOS_Social_Profile_Launch_Package.zip. Nothing here touches the application.

Run: python3 scripts/social/generate-profile-package.py
"""
from __future__ import annotations

import hashlib
import importlib.util
import json
import os
import sys
import zipfile
from dataclasses import dataclass, field
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "social-profile-package"
ASSETS = OUT / "assets"
PREVIEWS = OUT / "previews"
ZIP = ROOT / "EduOS_Social_Profile_Launch_Package.zip"
KIT = json.loads((ROOT / "content/social/launch-kit.json").read_text())

# ---------------------------------------------------------------- brand tokens
NAVY = (0x0C, 0x16, 0x28)          # --eds-dark-nav
ORANGE = (0xF9, 0x73, 0x16)        # --eds-orange-500
WHITE = (0xFF, 0xFF, 0xFF)
NEUTRAL_50 = (0xF8, 0xF9, 0xFB)    # --eds-neutral-50
NEUTRAL_200 = (0xE3, 0xE5, 0xEE)   # --eds-neutral-200
NEUTRAL_500 = (0x6B, 0x72, 0x80)   # --eds-neutral-500
NEUTRAL_900 = (0x11, 0x18, 0x27)   # --eds-neutral-900
SITE = KIT["site"].replace("https://", "")
SUPPORT = KIT["support_email"]
SCOPE = KIT["scope"]  # "CBSE Class 10 Mathematics and Science"
FREE_LINE = "Free Learning Check ₹0 · Diagnostic ₹199 · Annual Plan ₹2,999"
SS = 2  # supersample for crisp text

# ---------------------------------------------------------------- fonts
FONT_DIRS = [
    Path(os.environ.get("EDUOS_FONT_DIR", "")),
    ROOT / "scripts/social/fonts",
    Path("/usr/share/fonts/truetype/dejavu"),
]
DEJAVU_BOLD = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
DEJAVU = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"


def _find(*names: str) -> str | None:
    for d in FONT_DIRS:
        if not str(d):
            continue
        for n in names:
            p = d / n
            if p.exists():
                return str(p)
    return None


DISPLAY_FONT = _find("Outfit.ttf", "Outfit-Variable.ttf") or DEJAVU_BOLD
BODY_FONT = _find("Inter.ttf", "Inter-Variable.ttf") or DEJAVU
FONT_REPORT = {
    "display": DISPLAY_FONT,
    "body": BODY_FONT,
    "approved_stack": "Outfit (display) / Inter (body) per src/routes/__root.tsx",
    "note": "DejaVu Sans is the fallback used by scripts/branding/generate-icons.py",
}


def _font(path: str, px: int, weight: int) -> ImageFont.FreeTypeFont:
    f = ImageFont.truetype(path, px)
    try:  # variable fonts: honour the requested weight axis
        f.set_variation_by_axes([weight])
    except Exception:
        pass
    return f


def font(size: int, *, display: bool = True, weight: int = 700) -> ImageFont.FreeTypeFont:
    """Font for drawing on a supersampled Canvas: `size` is the FINAL pixel size."""
    return _font(DISPLAY_FONT if display else BODY_FONT, size * SS, weight)


def font_raw(size: int, *, display: bool = True, weight: int = 700) -> ImageFont.FreeTypeFont:
    """Font for drawing directly on a 1:1 image (previews, watermarks)."""
    return _font(DISPLAY_FONT if display else BODY_FONT, size, weight)


# ---------------------------------------------------------------- approved mark
def _load_mark():
    spec = importlib.util.spec_from_file_location(
        "eduos_icons", ROOT / "scripts/branding/generate-icons.py"
    )
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)  # type: ignore[union-attr]
    if not Path(mod.FONT).exists():
        mod.FONT = DEJAVU_BOLD  # same face the approved script names, local path
    return mod


ICONS = _load_mark()


def mark(size: int, *, maskable: bool) -> Image.Image:
    """The approved EduOS mark, rendered by the production icon generator."""
    return ICONS.mark(size, maskable=maskable)


def mark_mono(size: int, colour: tuple[int, int, int]) -> Image.Image:
    """Single-colour transparent mark (for watermarks). Same geometry as mark()."""
    s = size * 4
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    glyph = int(s * 0.58)
    f = ImageFont.truetype(DEJAVU_BOLD, glyph)
    box = d.textbbox((0, 0), "E", font=f)
    d.text(((s - (box[2] - box[0])) / 2 - box[0], (s - (box[3] - box[1])) / 2 - box[1]), "E", font=f, fill=colour + (255,))
    bar_w, bar_h = int(s * 0.30), max(2, int(s * 0.045))
    top = int(s * 0.78)
    d.rounded_rectangle([(s - bar_w) / 2, top, (s + bar_w) / 2, top + bar_h], radius=bar_h / 2, fill=colour + (255,))
    return img.resize((size, size), Image.LANCZOS)


# ---------------------------------------------------------------- text helpers
@dataclass
class Canvas:
    w: int
    h: int
    bg: tuple[int, int, int] = NAVY
    safe: tuple[int, int, int, int] | None = None  # x0,y0,x1,y1 in final px
    img: Image.Image = field(init=False)
    d: ImageDraw.ImageDraw = field(init=False)
    text_boxes: list[tuple[int, int, int, int]] = field(default_factory=list)
    font_sizes: list[int] = field(default_factory=list)  # final-pixel font size per text call

    def __post_init__(self):
        self.img = Image.new("RGB", (self.w * SS, self.h * SS), self.bg)
        self.d = ImageDraw.Draw(self.img)

    def paste(self, im: Image.Image, x: int, y: int):
        big = im.resize((im.width * SS, im.height * SS), Image.LANCZOS)
        self.img.paste(big, (x * SS, y * SS), big if big.mode == "RGBA" else None)

    def text(self, xy, s, f, fill, anchor="la", max_w: int | None = None, line_h=1.18):
        """Draw (optionally wrapped) text; records its final-pixel bbox for safe-area checks."""
        x, y = xy
        self.font_sizes.append(int(f.size / SS))
        lines = self._wrap(s, f, max_w * SS) if max_w else [s]
        top = y * SS
        for ln in lines:
            self.d.text((x * SS, top), ln, font=f, fill=fill, anchor=anchor)
            b = self.d.textbbox((x * SS, top), ln, font=f, anchor=anchor)
            self.text_boxes.append(tuple(int(v / SS) for v in b))
            top += int(f.size * line_h)
        return int(top / SS)

    def _wrap(self, s, f, max_w):
        out, cur = [], ""
        for word in s.split(" "):
            trial = (cur + " " + word).strip()
            if self.d.textlength(trial, font=f) <= max_w or not cur:
                cur = trial
            else:
                out.append(cur)
                cur = word
        if cur:
            out.append(cur)
        return out

    def rule(self, x, y, w, h=6, fill=ORANGE):
        self.d.rounded_rectangle([x * SS, y * SS, (x + w) * SS, (y + h) * SS], radius=h * SS / 2, fill=fill)

    def finish(self) -> Image.Image:
        return self.img.resize((self.w, self.h), Image.LANCZOS)


def save(img: Image.Image, name: str, *, jpg: bool = False, quality=92):
    ASSETS.mkdir(parents=True, exist_ok=True)
    p = ASSETS / name
    if name.endswith(".jpg"):
        img.convert("RGB").save(p, "JPEG", quality=quality, optimize=True, progressive=True)
    else:
        img.save(p, "PNG", optimize=True)
    return p


# ---------------------------------------------------------------- asset specs
MANIFEST: list[dict] = []
VALIDATION: list[dict] = []


def record(name, kind, platform, w, h, fmt, purpose, *, safe=None, canvas: Canvas | None = None,
           alt="", notes="", variant_of=None):
    entry = dict(file=f"assets/{name}", kind=kind, platform=platform, width=w, height=h, format=fmt,
                 purpose=purpose, alt=alt, notes=notes)
    if safe:
        entry["safe_area"] = dict(zip(("x0", "y0", "x1", "y1"), safe))
    if variant_of:
        entry["variant_of"] = f"assets/{variant_of}"
    MANIFEST.append(entry)
    if canvas is not None and safe:
        x0, y0, x1, y1 = safe
        bad = [b for b in canvas.text_boxes if not (b[0] >= x0 and b[1] >= y0 and b[2] <= x1 and b[3] <= y1)]
        heights = [b[3] - b[1] for b in canvas.text_boxes]
        VALIDATION.append(dict(file=entry["file"], text_boxes=len(canvas.text_boxes),
                               outside_safe_area=len(bad), ok=not bad, safe=list(safe),
                               violations=[list(b) for b in bad],
                               min_ink_px=min(heights) if heights else None,
                               min_font_px=min(canvas.font_sizes) if canvas.font_sizes else None,
                               max_font_px=max(canvas.font_sizes) if canvas.font_sizes else None))


# 1. Avatars ------------------------------------------------------------------
AVATARS = [
    ("avatar-master-1024.png", "Master", 1024),
    ("avatar-instagram-320.png", "Instagram", 320),
    ("avatar-facebook-320.png", "Facebook", 320),
    ("avatar-linkedin-400.png", "LinkedIn", 400),
    ("avatar-youtube-800.png", "YouTube", 800),
    ("avatar-whatsapp-640.png", "WhatsApp Business", 640),
    ("avatar-x-400.png", "X", 400),
]


def build_avatars():
    for name, platform, size in AVATARS:
        # Maskable (full-bleed navy, glyph at 42%) so every platform's circular
        # crop keeps the whole mark inside the circle.
        im = mark(size, maskable=True).convert("RGB")
        save(im, name)
        record(name, "avatar", platform, size, size, "png",
               "Profile picture (square upload; platforms apply circular crop)",
               alt="EduOS logo: an orange letter E with an orange underline on a navy square.",
               notes="Circle-safe: mark occupies the central 42% so nothing is clipped.")


def build_avatar_svg():
    name = "avatar-master.svg"
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024" role="img" aria-label="EduOS logo">
  <title>EduOS</title>
  <rect width="1024" height="1024" fill="#0C1628"/>
  <text x="512" y="512" text-anchor="middle" dominant-baseline="central" font-family="DejaVu Sans, Inter, Arial, sans-serif" font-weight="700" font-size="430" fill="#F97316">E</text>
  <rect x="358" y="758" width="308" height="46" rx="23" fill="#F97316"/>
</svg>
"""
    (ASSETS / name).write_text(svg)
    record(name, "avatar", "Master", 1024, 1024, "svg", "Vector master of the profile mark (maskable geometry)",
           alt="EduOS logo: an orange letter E with an orange underline on a navy square.",
           notes="Text-based SVG; renderer uses the named font stack. PNG masters are the pixel-exact reference.")


# 2. Banners / covers ---------------------------------------------------------
def brand_banner(w, h, safe, *, headline, sub, mark_size, mark_xy, text_x, text_top, hl_size, sub_size,
                 max_w, show_site=True):
    c = Canvas(w, h, NAVY, safe)
    c.paste(mark(mark_size, maskable=False), *mark_xy)
    y = c.text((text_x, text_top), headline, font(hl_size), WHITE, max_w=max_w, line_h=1.12)
    c.rule(text_x, y + int(hl_size * 0.25), int(hl_size * 1.6), max(4, hl_size // 10))
    y = c.text((text_x, y + int(hl_size * 0.25) + hl_size // 5 + int(sub_size * 0.6)), sub,
               font(sub_size, display=False, weight=500), NEUTRAL_200, max_w=max_w)
    if show_site:
        c.text((text_x, y + int(sub_size * 0.35)), SITE, font(sub_size, display=False, weight=600), ORANGE)
    return c


def build_banners():
    # LinkedIn company banner 1128x191. Desktop avatar overlaps the bottom-left
    # (~268px wide); keep content right of x=400 and inside 24px vertical margins.
    c = brand_banner(1128, 191, (400, 20, 1104, 171), headline="EduOS", sub=SCOPE,
                     mark_size=96, mark_xy=(1004, 48), text_x=420, text_top=24, hl_size=40, sub_size=20, max_w=560)
    save(c.finish(), "banner-linkedin-1128x191.png")
    record("banner-linkedin-1128x191.png", "banner", "LinkedIn", 1128, 191, "png", "Company page banner",
           safe=(400, 20, 1104, 171), canvas=c, alt="EduOS banner on navy: EduOS wordmark, CBSE Class 10 Mathematics and Science, eduos.global.",
           notes="Left 400px reserved for the avatar overlap on desktop.")

    # Facebook page cover 820x312 desktop; mobile shows the central 640px at 360 tall
    # (i.e. ~560x312 of this canvas). Keep all content inside x 130..690.
    c = brand_banner(820, 312, (130, 30, 690, 282), headline="EduOS", sub=SCOPE,
                     mark_size=120, mark_xy=(150, 96), text_x=300, text_top=66, hl_size=56, sub_size=20, max_w=380)
    save(c.finish(), "cover-facebook-820x312.png")
    record("cover-facebook-820x312.png", "cover", "Facebook", 820, 312, "png", "Page cover (desktop)",
           safe=(130, 30, 690, 282), canvas=c, alt="EduOS cover on navy: logo, EduOS wordmark, CBSE Class 10 Mathematics and Science, eduos.global.",
           notes="Content held inside the 560px band that survives the mobile crop.")

    # Facebook mobile-first cover 640x360 (also the safe view of the above).
    c = brand_banner(640, 360, (40, 40, 600, 320), headline="EduOS", sub=SCOPE,
                     mark_size=120, mark_xy=(60, 120), text_x=210, text_top=96, hl_size=56, sub_size=20, max_w=380)
    save(c.finish(), "cover-facebook-mobile-640x360.png")
    record("cover-facebook-mobile-640x360.png", "cover", "Facebook", 640, 360, "png", "Page cover (mobile-optimised alternative)",
           safe=(40, 40, 600, 320), canvas=c, alt="EduOS cover on navy: logo, EduOS wordmark, CBSE Class 10 Mathematics and Science, eduos.global.")

    # YouTube channel art 2560x1440; the only region visible on every device is
    # the central 1546x423.
    sx0, sy0 = (2560 - 1546) // 2, (1440 - 423) // 2
    safe = (sx0, sy0, sx0 + 1546, sy0 + 423)
    c = brand_banner(2560, 1440, safe, headline="EduOS", sub=SCOPE,
                     mark_size=240, mark_xy=(sx0 + 60, sy0 + 92), text_x=sx0 + 360, text_top=sy0 + 90,
                     hl_size=120, sub_size=44, max_w=1100)
    save(c.finish(), "banner-youtube-2560x1440.png")
    record("banner-youtube-2560x1440.png", "banner", "YouTube", 2560, 1440, "png", "Channel art",
           safe=safe, canvas=c, alt="EduOS channel art on navy: logo, EduOS wordmark, CBSE Class 10 Mathematics and Science, eduos.global.",
           notes="All content inside the 1546x423 universal safe area; TV/desktop show more navy field.")

    # X header 1500x500; profile picture overlaps bottom-left (~400px). Keep
    # content right of x=460 and 60px from top/bottom.
    c = brand_banner(1500, 500, (460, 60, 1440, 440), headline="EduOS", sub=SCOPE,
                     mark_size=160, mark_xy=(1260, 170), text_x=480, text_top=130, hl_size=96, sub_size=34, max_w=740)
    save(c.finish(), "header-x-1500x500.png")
    record("header-x-1500x500.png", "banner", "X", 1500, 500, "png", "Profile header",
           safe=(460, 60, 1440, 440), canvas=c, alt="EduOS header on navy: EduOS wordmark, CBSE Class 10 Mathematics and Science, eduos.global, logo.",
           notes="Bottom-left 460px reserved for the avatar overlap.")


# 3. Watermarks ---------------------------------------------------------------
def build_watermarks():
    for name, colour, purpose in [
        ("watermark-light.png", WHITE, "White mark for use over dark images/video"),
        ("watermark-dark.png", NAVY, "Navy mark for use over light images/video"),
    ]:
        im = mark_mono(512, colour)
        wm = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
        wm.paste(im, (256, 128), im)
        d = ImageDraw.Draw(wm)
        f = font_raw(96, display=False, weight=600)
        d.text((512, 800), SITE, font=f, fill=colour + (255,), anchor="mm")
        save(wm, name)
        record(name, "watermark", "All", 1024, 1024, "png", purpose,
               alt="EduOS mark with eduos.global, transparent background.",
               notes="Transparent PNG; scale to 8–12% of the target's short edge, 60–80% opacity.")
    name = "watermark.svg"
    svg = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024" role="img" aria-label="EduOS watermark">
  <title>EduOS</title>
  <g fill="currentColor">
    <text x="512" y="384" text-anchor="middle" dominant-baseline="central" font-family="DejaVu Sans, Inter, Arial, sans-serif" font-weight="700" font-size="300" >E</text>
    <rect x="435" y="560" width="154" height="24" rx="12"/>
    <text x="512" y="800" text-anchor="middle" dominant-baseline="central" font-family="Inter, DejaVu Sans, Arial, sans-serif" font-weight="600" font-size="96">eduos.global</text>
  </g>
</svg>
"""
    (ASSETS / name).write_text(svg)
    record(name, "watermark", "All", 1024, 1024, "svg", "Vector watermark (currentColor — set fill per background)",
           alt="EduOS mark with eduos.global.", notes="Uses currentColor so one file serves light and dark placements.")


# 4. Pinned-post cards (proof-01 copy, verbatim) --------------------------------
PROOF = next(p for p in KIT["posts"] if p["id"] == "proof-01")
PIN_HEAD = "Practice does not close a learning gap. Time spent does not close it. An AI conversation does not close it."
PIN_SUB = ("In EduOS, a gap stays open until a fresh reassessment — on questions the learner has not already seen, "
           "mapped to the same outcome — says otherwise.")


def pinned_card(w, h, name, platform, *, pad, hl, sub, max_w):
    safe = (pad, pad, w - pad, h - pad)
    c = Canvas(w, h, NAVY, safe)
    fh, fs = font(hl), font(sub, display=False, weight=500)
    mark_px = int(hl * 1.5)
    # Measure the block first so it sits vertically centred (footer excluded).
    n_h, n_s = len(c._wrap(PIN_HEAD, fh, max_w * SS)), len(c._wrap(PIN_SUB, fs, max_w * SS))
    block = mark_px + int(hl * 0.8) + n_h * int(hl * 1.14) + int(hl * 0.55) + int(sub * 0.9) + n_s * int(sub * 1.32)
    top = max(pad, (h - int(sub * 1.6) - block) // 2)
    c.paste(mark(mark_px, maskable=False), pad, top)
    y = c.text((pad, top + mark_px + int(hl * 0.8)), PIN_HEAD, fh, WHITE, max_w=max_w, line_h=1.14)
    c.rule(pad, y + int(hl * 0.25), int(hl * 1.8), max(5, hl // 9))
    c.text((pad, y + int(hl * 0.55) + int(sub * 0.9)), PIN_SUB, fs, NEUTRAL_200, max_w=max_w, line_h=1.32)
    c.text((pad, h - pad - int(sub * 1.45)), f"{PROOF['cta']}  ·  {SITE}", font(sub, display=False, weight=600), ORANGE)
    save(c.finish(), name)
    record(name, "pinned_post", platform, w, h, "png", "Pinned-post image (proof-01 copy, verbatim from LAUNCH_KIT)",
           safe=safe, canvas=c,
           alt="Text card on navy: Practice does not close a learning gap. Time spent does not close it. An AI conversation does not close it. In EduOS, a gap stays open until a fresh reassessment says otherwise. See what counts as proof, eduos.global.",
           notes=f"Pair with proof-01 copy and destination {PROOF['destination'].split('?')[0]} (see utm-manifest.json).")
    return c


def build_pinned():
    pinned_card(1200, 628, "pinned-linkedin-1200x628.png", "LinkedIn", pad=64, hl=48, sub=26, max_w=1040)
    pinned_card(1200, 630, "pinned-facebook-1200x630.png", "Facebook", pad=64, hl=48, sub=26, max_w=1040)
    pinned_card(1080, 1080, "pinned-instagram-1080x1080.png", "Instagram", pad=88, hl=56, sub=30, max_w=904)
    pinned_card(1600, 900, "pinned-x-1600x900.png", "X", pad=96, hl=60, sub=30, max_w=1300)


# 5. Instagram Highlight covers 1080x1920 -------------------------------------
HIGHLIGHTS = [
    ("highlight-free-check.png", "Free Check", "free_learning_check"),
    ("highlight-diagnostic.png", "Diagnostic", "class10_diagnostic"),
    ("highlight-parent-guide.png", "Parent Guide", "parent_guide"),
    ("highlight-learning-loop.png", "Learning Loop", "reassessment_evidence"),
    ("highlight-proof.png", "Proof", "reassessment_evidence"),
]


def build_highlights():
    w, h = 1080, 1920
    # Instagram crops the cover to a centred circle of ~1080px diameter; keep
    # content inside a 760px square centred on the canvas.
    safe = (160, 580, 920, 1340)
    for name, label, campaign in HIGHLIGHTS:
        c = Canvas(w, h, NAVY, safe)
        c.paste(mark(300, maskable=False), 390, 640)
        c.text((540, 1000), label, font(104), WHITE, anchor="ma")
        c.rule(460, 1150, 160, 12)
        save(c.finish(), name)
        record(name, "highlight_cover", "Instagram", w, h, "png", f"Story Highlight cover — “{label}”",
               safe=safe, canvas=c, alt=f"EduOS logo with the word {label} on navy.",
               notes=f"Highlight groups posts tagged utm_campaign={campaign}. Content sits inside the circular crop.")


# 6. Instagram grid triptych 1080x1080 (verbatim first lines from the kit) ------
GRID = [
    ("grid-01-mark-symptom.png", "A mark is a symptom, not a diagnosis.", "edu-01"),
    ("grid-02-mastery-bands.png", "Weak. Developing. Secure. Strong.", "edu-02"),
    ("grid-03-not-a-plan.png", "“Study everything again” is not a plan.", "parent-02"),
]


def build_grid():
    for i, (name, line, src) in enumerate(GRID, 1):
        bg = NAVY if i != 2 else NEUTRAL_50
        fg = WHITE if i != 2 else NEUTRAL_900
        safe = (96, 96, 984, 984)
        c = Canvas(1080, 1080, bg, safe)
        fh = font(104)
        n = len(c._wrap(line, fh, 888 * SS))
        block = n * int(104 * 1.12)
        top = (1080 - block) // 2  # headline block vertically centred
        c.paste(mark(150, maskable=False), 96, 96)
        y = c.text((96, top), line, fh, fg, max_w=888, line_h=1.12)
        c.rule(96, y + 30, 180, 12)
        c.text((984, 940), SITE, font(34, display=False, weight=600), ORANGE, anchor="ra")
        save(c.finish(), name)
        record(name, "instagram_grid", "Instagram", 1080, 1080, "png", f"Grid tile {i}/3 — first line of {src} (verbatim)",
               safe=safe, canvas=c, alt=f"Text card: {line} eduos.global.",
               notes="Post as a row of three; each links to the matching kit post’s destination.")


# 7. JPG variants for platforms that prefer JPEG uploads -------------------------
JPG_VARIANTS = [
    "banner-linkedin-1128x191.png", "cover-facebook-820x312.png", "cover-facebook-mobile-640x360.png",
    "banner-youtube-2560x1440.png", "header-x-1500x500.png",
    "pinned-linkedin-1200x628.png", "pinned-facebook-1200x630.png", "pinned-instagram-1080x1080.png", "pinned-x-1600x900.png",
    "grid-01-mark-symptom.png", "grid-02-mastery-bands.png", "grid-03-not-a-plan.png",
]


def build_jpg_variants():
    for png in JPG_VARIANTS:
        src = next(m for m in MANIFEST if m["file"] == f"assets/{png}")
        im = Image.open(ASSETS / png)
        name = png[:-4] + ".jpg"
        save(im, name)
        record(name, src["kind"], src["platform"], src["width"], src["height"], "jpg",
               src["purpose"] + " (JPEG variant)", alt=src["alt"], variant_of=png,
               safe=tuple(src["safe_area"].values()) if "safe_area" in src else None)


# 8. Crop-preview contact sheets ----------------------------------------------
def circle_crop(im: Image.Image, size: int) -> Image.Image:
    im = im.convert("RGBA").resize((size, size), Image.LANCZOS)
    mask = Image.new("L", (size * 4, size * 4), 0)
    ImageDraw.Draw(mask).ellipse([0, 0, size * 4 - 1, size * 4 - 1], fill=255)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(im, (0, 0), mask.resize((size, size), Image.LANCZOS))
    return out


def sheet(title: str, tiles: list[tuple[str, Image.Image]], cols: int, tile_w: int, name: str):
    pad, cap = 40, 44
    rows = -(-len(tiles) // cols)
    tile_h = max(t.height for _, t in tiles)
    W = pad + cols * (tile_w + pad)
    H = pad + 80 + rows * (tile_h + cap + pad)
    s = Image.new("RGB", (W, H), NEUTRAL_50)
    d = ImageDraw.Draw(s)
    d.text((pad, pad), title, font=font_raw(40), fill=NEUTRAL_900)
    for i, (label, t) in enumerate(tiles):
        x = pad + (i % cols) * (tile_w + pad)
        y = pad + 80 + (i // cols) * (tile_h + cap + pad)
        s.paste(t, (x, y), t if t.mode == "RGBA" else None)
        d.text((x, y + t.height + 8), label, font=font_raw(24, display=False, weight=500), fill=NEUTRAL_500)
    PREVIEWS.mkdir(parents=True, exist_ok=True)
    s.save(PREVIEWS / name, optimize=True)
    return f"previews/{name}"


def overlay(src: str, safe, *, avatar_box=None, mobile_box=None, scale: float) -> Image.Image:
    im = Image.open(ASSETS / src).convert("RGBA")
    d = ImageDraw.Draw(im)
    x0, y0, x1, y1 = safe
    d.rectangle([x0, y0, x1, y1], outline=(37, 99, 235, 255), width=max(2, int(4 / scale)))
    if mobile_box:
        d.rectangle(list(mobile_box), outline=(217, 119, 6, 255), width=max(2, int(4 / scale)))
    if avatar_box:
        ax0, ay0, ax1, ay1 = avatar_box
        av = circle_crop(Image.open(ASSETS / "avatar-master-1024.png"), ax1 - ax0)
        im.paste(av, (ax0, ay0), av)
    return im.resize((int(im.width * scale), int(im.height * scale)), Image.LANCZOS)


def build_previews() -> list[str]:
    out = []
    # Avatars: square upload vs the circular crop every platform applies.
    tiles = []
    for name, platform, size in AVATARS:
        im = Image.open(ASSETS / name)
        tiles.append((f"{platform} {size}px — upload", im.resize((240, 240), Image.LANCZOS).convert("RGBA")))
        tiles.append((f"{platform} — circular crop", circle_crop(im, 240)))
    out.append(sheet("Avatars — square upload vs circular crop", tiles, 4, 240, "avatars-circle-crop.png"))

    # Banners: safe area (blue), mobile crop (amber), avatar overlap (real avatar).
    tiles = [
        ("LinkedIn 1128x191 — desktop, avatar overlap + safe area",
         overlay("banner-linkedin-1128x191.png", (400, 20, 1104, 171), avatar_box=(24, 40, 292, 308), scale=0.9)),
        ("Facebook 820x312 — desktop; amber = mobile 640x360 crop",
         overlay("cover-facebook-820x312.png", (130, 30, 690, 282), mobile_box=(130, 0, 690, 312), scale=1.0)),
        ("Facebook 640x360 — mobile", overlay("cover-facebook-mobile-640x360.png", (40, 40, 600, 320), scale=1.0)),
        ("X 1500x500 — desktop, avatar overlap + safe area",
         overlay("header-x-1500x500.png", (460, 60, 1440, 440), avatar_box=(40, 300, 440, 700), scale=0.68)),
    ]
    out.append(sheet("Banners — desktop view with safe areas (blue), mobile crop (amber), avatar overlap", tiles, 1, 1020, "banners-desktop.png"))

    sx0, sy0 = (2560 - 1546) // 2, (1440 - 423) // 2
    yt_full = overlay("banner-youtube-2560x1440.png", (sx0, sy0, sx0 + 1546, sy0 + 423),
                      mobile_box=(sx0, sy0, sx0 + 1546, sy0 + 423), scale=0.4)
    yt_mobile = Image.open(ASSETS / "banner-youtube-2560x1440.png").crop((sx0, sy0, sx0 + 1546, sy0 + 423)).resize((1024, 280), Image.LANCZOS).convert("RGBA")
    out.append(sheet("YouTube — full 2560x1440 (TV) and the 1546x423 mobile/desktop crop",
                     [("TV / full canvas", yt_full), ("Mobile & desktop crop", yt_mobile)], 1, 1024, "banners-youtube.png"))

    # Mobile crops of the two Facebook views + IG highlight circle + grid row.
    fb_mobile = Image.open(ASSETS / "cover-facebook-820x312.png").crop((130, 0, 690, 312)).resize((560, 312), Image.LANCZOS).convert("RGBA")
    hl = [(label, circle_crop(Image.open(ASSETS / n).crop((0, 420, 1080, 1500)), 220)) for n, label, _ in HIGHLIGHTS]
    grid = [(f"Grid {i+1}", Image.open(ASSETS / n).resize((300, 300), Image.LANCZOS).convert("RGBA")) for i, (n, _, _) in enumerate(GRID)]
    out.append(sheet("Mobile — Facebook cover mobile crop", [("Facebook cover as seen on phone (560x312 of 820x312)", fb_mobile)], 1, 560, "mobile-facebook.png"))
    out.append(sheet("Instagram — Highlight circles (as shown on profile) and grid row", hl + grid, 5, 300, "instagram-highlights-grid.png"))
    return out


# 9. Manifests, copy, alt text, checksums, zip --------------------------------
def sha256(p: Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()


def write_docs(previews: list[str]):
    canonical = [m for m in MANIFEST if "variant_of" not in m]
    variants = [m for m in MANIFEST if "variant_of" in m]
    for m in MANIFEST:
        p = OUT / m["file"]
        m["bytes"] = p.stat().st_size
        m["sha256"] = sha256(p)
        if m["format"] != "svg":
            with Image.open(p) as im:
                assert im.size == (m["width"], m["height"]), f"{m['file']} is {im.size}, expected {(m['width'], m['height'])}"
    manifest = dict(
        package="EduOS Social Profile Launch Package",
        version="1.0.0",
        source_kit=KIT["name"],
        generated_by="scripts/social/generate-profile-package.py",
        fonts=FONT_REPORT,
        counts=dict(canonical_assets=len(canonical), jpg_variants=len(variants), files=len(MANIFEST),
                    previews=len(previews)),
        assets=canonical, variants=variants, previews=previews,
        validation=dict(safe_area_checks=VALIDATION, all_text_inside_safe_areas=all(v["ok"] for v in VALIDATION)),
    )
    (OUT / "asset-manifest.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n")

    # copy.md — profile copy assembled only from kit-verified facts.
    copy = f"""# EduOS — profile copy (verbatim from content/social/LAUNCH_KIT.md facts)

Rules from the kit apply to every field: English only, {SCOPE} only, verified facts and pricing only,
one CTA, no testimonials, results, statistics, partnerships or guarantees, no learner data.

## Display name
EduOS

## Handle (requested on every platform)
@eduos — fall back to @eduosglobal if taken. Record the final handle in upload-manifest.md.

## Short bio (≤150 chars — Instagram / X / WhatsApp)
Learning-gap diagnostics for {SCOPE}. {FREE_LINE.split(' · ')[0]}.

## Long bio (LinkedIn / Facebook / YouTube “About”)
EduOS reports {SCOPE} one learning outcome at a time and ranks the gaps, so the costly ones are dealt
with first. A gap stays open until a fresh reassessment — on questions the learner has not already
seen — says otherwise.

{FREE_LINE}. Upgrade within {KIT['pricing']['credit_window_days']} days of a ₹{KIT['pricing']['diagnostic_inr']} diagnostic and that
₹{KIT['pricing']['eligible_credit_inr']} is credited, so ₹{KIT['pricing']['upgrade_payable_inr']:,} is payable.

Support: {SUPPORT}

## Website field
{KIT['site']}/?utm_source=<platform>&utm_medium=social&utm_campaign=free_learning_check
(see utm-manifest.json for the exact per-platform URL)

## Pinned post
Use post **proof-01** exactly as written in LAUNCH_KIT.md with the matching `pinned-<platform>` image.
CTA: {PROOF['cta']}.

## Instagram Highlights (titles)
""" + "\n".join(f"- {label} — groups posts tagged `utm_campaign={campaign}`" for _, label, campaign in HIGHLIGHTS) + """

## Instagram grid row (post as three consecutive tiles)
""" + "\n".join(f"{i}. `{n}` — {line} (caption: the full {src} copy)" for i, (n, line, src) in enumerate(GRID, 1)) + "\n"
    (OUT / "copy.md").write_text(copy)

    alt = "# Alt text\n\nPaste the matching line into each platform's alt-text / image-description field.\n\n"
    alt += "| File | Alt text |\n|---|---|\n"
    alt += "\n".join(f"| `{m['file']}` | {m['alt']} |" for m in canonical if m["alt"])
    (OUT / "alt-text.md").write_text(alt + "\n")

    utm = dict(
        taxonomy=KIT["utm_taxonomy"], medium="social",
        profile_links={s: f"{KIT['site']}/?utm_source={s}&utm_medium=social&utm_campaign=free_learning_check"
                       for s in ["instagram", "facebook", "linkedin", "youtube", "whatsapp", "x"]},
        pinned_post={s: PROOF["destination"].split("?")[0] + f"?utm_source={s}&utm_medium=social&utm_campaign=reassessment_evidence"
                     for s in ["instagram", "facebook", "linkedin", "x"]},
        highlights={label: dict(campaign=campaign) for _, label, campaign in HIGHLIGHTS},
        grid={n: next(p["destination"] for p in KIT["posts"] if p["id"] == src) for n, _, src in GRID},
        kit_posts={p["id"]: p["destination"] for p in KIT["posts"]},
        note="utm_source values are the approved closed list in src/lib/utm.ts; 'x' is approved there and used only for the X header/pinned post.",
    )
    (OUT / "utm-manifest.json").write_text(json.dumps(utm, indent=2) + "\n")

    up = f"""# Upload manifest

Nothing in this package has been published. A person with account access performs every step below.
Check the box, then record the final URL/handle in the last column.

| # | Platform | Field | File | Dimensions | Notes | Done / URL |
|---|---|---|---|---|---|---|
"""
    rows = []
    n = 0
    for m in canonical:
        if m["kind"] in ("avatar", "banner", "cover", "pinned_post", "highlight_cover", "instagram_grid") and m["format"] == "png":
            n += 1
            field_ = {"avatar": "Profile picture", "banner": "Banner / header", "cover": "Cover photo",
                      "pinned_post": "Pinned post image", "highlight_cover": "Highlight cover",
                      "instagram_grid": "Grid post"}[m["kind"]]
            rows.append(f"| {n} | {m['platform']} | {field_} | `{m['file']}` | {m['width']}x{m['height']} | {m.get('notes','')} | ☐ |")
    up += "\n".join(rows) + f"""

## Order of operations (per platform)
1. Profile picture → 2. Banner/cover → 3. Bio (copy.md) → 4. Website field (utm-manifest.json) →
5. Pinned post (proof-01 copy + `pinned-<platform>`) → 6. Instagram only: Highlights, then the grid row.

## Watermarks
`assets/watermark-light.png` / `watermark-dark.png` / `watermark.svg` are for future image and video
posts (bottom-right, 8–12% of the short edge, 60–80% opacity). They are not uploaded to a profile field.

## Verification after upload
Compare the live profile against `previews/*.png`; the blue rectangles are the safe areas that must
remain fully visible on desktop and mobile.
"""
    (OUT / "upload-manifest.md").write_text(up)

    readme = f"""# EduOS Social Profile Launch Package v1.0.0

Upload-ready profile assets for the official EduOS accounts, generated deterministically from approved
sources by `scripts/social/generate-profile-package.py`.

**Sources:** brand mark and tokens (`scripts/branding/generate-icons.py`, `src/styles.css`), copy and
UTM taxonomy (`content/social/LAUNCH_KIT.md`, `launch-kit.json`, `src/lib/utm.ts`). No claims,
testimonials, statistics or outcomes are introduced anywhere in this package.

| | Count |
|---|---|
| Canonical assets | {len(canonical)} |
| JPEG variants | {len(variants)} |
| Crop-preview sheets | {len(previews)} |

## Contents
- `assets/` — every asset (PNG/JPG/SVG), named `<kind>-<platform>-<WxH>.<ext>`
- `previews/` — desktop/mobile crop contact sheets (safe area = blue, mobile crop = amber, real avatar overlap)
- `asset-manifest.json` — dimensions, format, purpose, safe areas, alt text, SHA-256 per file, validation results
- `copy.md` — bios, handle, pinned-post and Highlight copy (kit facts only)
- `alt-text.md` — per-image alt text
- `upload-manifest.md` — checklist a person follows to publish
- `utm-manifest.json` — per-platform website/pinned/grid URLs using the approved UTM taxonomy
- `SHA256SUMS.txt` — checksums for every file in the package
- `DERIVED_SPECIFICATION.md` — disclosure of how the profile-asset set was derived (the kit specifies posts only)
- `licences/` — SIL OFL 1.1 texts for the redistributed Inter and Outfit fonts, with provenance

## Rebuild
```
python3 scripts/social/generate-profile-package.py
```
Output is byte-stable for identical inputs and fonts (see `fonts` in the manifest).

## Fonts used in this build
- display: `{Path(DISPLAY_FONT).name}`
- body: `{Path(BODY_FONT).name}`

## Not done here (by instruction)
No account was created, nothing was uploaded, scheduled or published, and no application code changed.
"""
    (OUT / "README.md").write_text(readme)


LICENCE_FILES = ["OFL-Inter.txt", "OFL-Outfit.txt", "AUTHORS-Outfit.txt", "README.md"]


def write_licences():
    src = ROOT / "scripts/social/fonts"
    dst = OUT / "licences"
    dst.mkdir(exist_ok=True)
    for name in LICENCE_FILES:
        (dst / ("FONTS-" + name if name == "README.md" else name)).write_bytes((src / name).read_bytes())


def write_derived_spec():
    canonical = [m for m in MANIFEST if "variant_of" not in m]
    by_kind: dict[str, list[dict]] = {}
    for m in canonical:
        by_kind.setdefault(m["kind"], []).append(m)
    text = """# Derived-specification disclosure

`content/social/LAUNCH_KIT.md` and `launch-kit.json` specify the ten **post** images only. They contain no
profile-asset specification (no avatar, banner, cover, watermark, Highlight or grid sizes) and no
"28 assets" list. A referenced `src/marketing/pages/SocialProfilePackagePage.tsx` does not exist in the
repository. The profile set in this package is therefore **derived**, as follows, and should be reviewed
as a proposal rather than read as the execution of an approved document.

## How the set was derived
- **Platforms:** the five named in the kit's UTM taxonomy (Instagram, Facebook, LinkedIn, YouTube,
  WhatsApp) plus X, which the kit names for post reuse and which is in the approved `utm_source` list.
- **Dimensions and safe areas:** each platform's published profile-image, banner/cover and story sizes;
  safe areas follow the platform's documented desktop/mobile crops and avatar-overlap regions.
- **Visual content:** the approved mark from `scripts/branding/generate-icons.py`, brand tokens from
  `src/styles.css`, and the approved display/body typefaces. Banners carry only the wordmark, the kit's
  scope line and the site address.
- **Text:** every sentence on an image is a verbatim line from the kit (proof-01 for pinned posts; the
  first lines of edu-01, edu-02 and parent-02 for the grid). Highlight labels are two-word titles that
  map to the kit's campaign taxonomy. No claims, testimonials, statistics or outcomes were introduced.

## Resulting inventory
"""
    for kind, items in by_kind.items():
        text += f"\n### {kind} ({len(items)})\n" + "".join(
            f"- `{m['file'].split('/')[1]}` — {m['platform']}, {m['width']}x{m['height']} {m['format']}\n" for m in items)
    text += f"\nTotal canonical assets: **{len(canonical)}**. JPEG variants: {len(MANIFEST) - len(canonical)}.\n"
    (OUT / "DERIVED_SPECIFICATION.md").write_text(text)


def write_checksums_and_zip():
    lines = []
    for p in sorted(OUT.rglob("*")):
        if p.is_file() and p.name != "SHA256SUMS.txt":
            lines.append(f"{sha256(p)}  {p.relative_to(OUT).as_posix()}")
    (OUT / "SHA256SUMS.txt").write_text("\n".join(lines) + "\n")
    if ZIP.exists():
        ZIP.unlink()
    with zipfile.ZipFile(ZIP, "w", zipfile.ZIP_DEFLATED) as z:
        for p in sorted(OUT.rglob("*")):
            if p.is_file():
                info = zipfile.ZipInfo(str(Path("social-profile-package") / p.relative_to(OUT)), date_time=(2026, 1, 1, 0, 0, 0))
                info.compress_type = zipfile.ZIP_DEFLATED
                z.writestr(info, p.read_bytes())
    return len(lines)


def main():
    if OUT.exists():
        for p in sorted(OUT.rglob("*"), reverse=True):
            p.unlink() if p.is_file() else p.rmdir()
    ASSETS.mkdir(parents=True)
    build_avatars(); build_avatar_svg(); build_banners(); build_watermarks()
    build_pinned(); build_highlights(); build_grid(); build_jpg_variants()
    previews = build_previews()
    write_docs(previews)
    write_licences()
    write_derived_spec()
    n = write_checksums_and_zip()
    canonical = [m for m in MANIFEST if "variant_of" not in m]
    print(f"canonical assets: {len(canonical)}  jpg variants: {len(MANIFEST)-len(canonical)}  files checksummed: {n}")
    print(f"safe-area: {'ALL OK' if all(v['ok'] for v in VALIDATION) else 'VIOLATIONS'} ({len(VALIDATION)} checked)")
    print(f"fonts: display={DISPLAY_FONT}  body={BODY_FONT}")
    print(f"zip: {ZIP} ({ZIP.stat().st_size} bytes)")
    return 0 if all(v["ok"] for v in VALIDATION) and len(canonical) == 28 else 1


if __name__ == "__main__":
    sys.exit(main())
