# EduOS Social Profile Launch Package v1.0.0

Upload-ready profile assets for the official EduOS accounts, generated deterministically from approved
sources by `scripts/social/build-profile-package.py`.

**Sources:** brand mark and tokens (`scripts/branding/generate-icons.py`, `src/styles.css`), copy and
UTM taxonomy (`content/social/LAUNCH_KIT.md`, `launch-kit.json`, `src/lib/utm.ts`). No claims,
testimonials, statistics or outcomes are introduced anywhere in this package.

| | Count |
|---|---|
| Canonical assets | 28 |
| JPEG variants | 12 |
| Crop-preview sheets | 5 |

## Contents
- `assets/` — every asset (PNG/JPG/SVG), named `<kind>-<platform>-<WxH>.<ext>`
- `previews/` — desktop/mobile crop contact sheets (safe area = blue, mobile crop = amber, real avatar overlap)
- `asset-manifest.json` — dimensions, format, purpose, safe areas, alt text, SHA-256 per file, validation results
- `copy.md` — bios, handle, pinned-post and Highlight copy (kit facts only)
- `alt-text.md` — per-image alt text
- `upload-manifest.md` — checklist a person follows to publish
- `utm-manifest.json` — per-platform website/pinned/grid URLs using the approved UTM taxonomy
- `SHA256SUMS.txt` — checksums for every file in the package

## Rebuild
```
python3 scripts/social/build-profile-package.py
```
Output is byte-stable for identical inputs and fonts (see `fonts` in the manifest).

## Fonts used in this build
- display: `Outfit.ttf`
- body: `Inter.ttf`

## Not done here (by instruction)
No account was created, nothing was uploaded, scheduled or published, and no application code changed.
