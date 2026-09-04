#!/usr/bin/env python3
"""Regenerates the EduOS favicon / PWA icon set in the approved orange-navy identity.

Brand tokens (src/styles.css):
  --eds-dark-nav:     #0C1628  (navy field)
  --eds-orange-500:   #F97316  (brand mark)

Run: python3 scripts/branding/generate-icons.py
"""
from PIL import Image, ImageDraw, ImageFont

NAVY = (12, 22, 40, 255)
ORANGE = (249, 115, 22, 255)
FONT = "/nix/store/xbs17gmksi0pljxcs4l6gshklzpmv8gr-dejavu-fonts-2.37/share/fonts/truetype/DejaVuSans-Bold.ttf"
SS = 4  # supersample factor


def mark(size: int, *, maskable: bool) -> Image.Image:
    s = size * SS
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    if maskable:
        d.rectangle([0, 0, s, s], fill=NAVY)
        glyph = int(s * 0.42)
    else:
        d.rounded_rectangle([0, 0, s - 1, s - 1], radius=int(s * 0.22), fill=NAVY)
        glyph = int(s * 0.58)

    font = ImageFont.truetype(FONT, glyph)
    box = d.textbbox((0, 0), "E", font=font)
    d.text(
        ((s - (box[2] - box[0])) / 2 - box[0], (s - (box[3] - box[1])) / 2 - box[1]),
        "E",
        font=font,
        fill=ORANGE,
    )
    # Orange accent underline, echoing the brand rule used across the product.
    bar_w, bar_h = int(s * 0.30), max(2, int(s * 0.045))
    top = int(s * (0.74 if maskable else 0.78))
    d.rounded_rectangle(
        [(s - bar_w) / 2, top, (s + bar_w) / 2, top + bar_h],
        radius=bar_h / 2,
        fill=ORANGE,
    )
    return img.resize((size, size), Image.LANCZOS)


TARGETS = [
    ("public/favicon.png", 64, False),
    ("public/icons/icon-192.png", 192, False),
    ("public/icons/icon-512.png", 512, False),
    ("public/icons/icon-maskable-192.png", 192, True),
    ("public/icons/icon-maskable-512.png", 512, True),
    ("public/icons/apple-touch-icon.png", 180, True),  # iOS masks corners itself
]

if __name__ == "__main__":
    for path, size, maskable in TARGETS:
        mark(size, maskable=maskable).save(path, optimize=True)
        print("wrote", path, size)
