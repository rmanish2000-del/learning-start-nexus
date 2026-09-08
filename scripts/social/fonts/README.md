# Fonts vendored for the social-profile build

| File | Family / instance | Licence | Source |
|---|---|---|---|
| `Outfit.ttf` | Outfit, weight 700 (display) | SIL OFL 1.1 | fonts.googleapis.com (Google Fonts, static instance) |
| `Inter.ttf` | Inter, weight 500 (body) | SIL OFL 1.1 | fonts.googleapis.com (Google Fonts, static instance) |

These are the approved marketing/design-package faces named in `src/routes/__root.tsx`
(Outfit display, Inter body). They exist here only so `build-profile-package.py` is
reproducible offline; the application loads the same families from Google Fonts at runtime.
Both are redistributable under the SIL Open Font License 1.1 (`OFL.txt`).
