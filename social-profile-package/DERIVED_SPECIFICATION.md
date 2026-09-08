# Derived-specification disclosure

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

### avatar (8)
- `avatar-master-1024.png` — Master, 1024x1024 png
- `avatar-instagram-320.png` — Instagram, 320x320 png
- `avatar-facebook-320.png` — Facebook, 320x320 png
- `avatar-linkedin-400.png` — LinkedIn, 400x400 png
- `avatar-youtube-800.png` — YouTube, 800x800 png
- `avatar-whatsapp-640.png` — WhatsApp Business, 640x640 png
- `avatar-x-400.png` — X, 400x400 png
- `avatar-master.svg` — Master, 1024x1024 svg

### banner (3)
- `banner-linkedin-1128x191.png` — LinkedIn, 1128x191 png
- `banner-youtube-2560x1440.png` — YouTube, 2560x1440 png
- `header-x-1500x500.png` — X, 1500x500 png

### cover (2)
- `cover-facebook-820x312.png` — Facebook, 820x312 png
- `cover-facebook-mobile-640x360.png` — Facebook, 640x360 png

### watermark (3)
- `watermark-light.png` — All, 1024x1024 png
- `watermark-dark.png` — All, 1024x1024 png
- `watermark.svg` — All, 1024x1024 svg

### pinned_post (4)
- `pinned-linkedin-1200x628.png` — LinkedIn, 1200x628 png
- `pinned-facebook-1200x630.png` — Facebook, 1200x630 png
- `pinned-instagram-1080x1080.png` — Instagram, 1080x1080 png
- `pinned-x-1600x900.png` — X, 1600x900 png

### highlight_cover (5)
- `highlight-free-check.png` — Instagram, 1080x1920 png
- `highlight-diagnostic.png` — Instagram, 1080x1920 png
- `highlight-parent-guide.png` — Instagram, 1080x1920 png
- `highlight-learning-loop.png` — Instagram, 1080x1920 png
- `highlight-proof.png` — Instagram, 1080x1920 png

### instagram_grid (3)
- `grid-01-mark-symptom.png` — Instagram, 1080x1080 png
- `grid-02-mastery-bands.png` — Instagram, 1080x1080 png
- `grid-03-not-a-plan.png` — Instagram, 1080x1080 png

Total canonical assets: **28**. JPEG variants: 12.
