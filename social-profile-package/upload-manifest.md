# Upload manifest

Nothing in this package has been published. A person with account access performs every step below.
Check the box, then record the final URL/handle in the last column.

| # | Platform | Field | File | Dimensions | Notes | Done / URL |
|---|---|---|---|---|---|---|
| 1 | Master | Profile picture | `assets/avatar-master-1024.png` | 1024x1024 | Circle-safe: mark occupies the central 42% so nothing is clipped. | ☐ |
| 2 | Instagram | Profile picture | `assets/avatar-instagram-320.png` | 320x320 | Circle-safe: mark occupies the central 42% so nothing is clipped. | ☐ |
| 3 | Facebook | Profile picture | `assets/avatar-facebook-320.png` | 320x320 | Circle-safe: mark occupies the central 42% so nothing is clipped. | ☐ |
| 4 | LinkedIn | Profile picture | `assets/avatar-linkedin-400.png` | 400x400 | Circle-safe: mark occupies the central 42% so nothing is clipped. | ☐ |
| 5 | YouTube | Profile picture | `assets/avatar-youtube-800.png` | 800x800 | Circle-safe: mark occupies the central 42% so nothing is clipped. | ☐ |
| 6 | WhatsApp Business | Profile picture | `assets/avatar-whatsapp-640.png` | 640x640 | Circle-safe: mark occupies the central 42% so nothing is clipped. | ☐ |
| 7 | X | Profile picture | `assets/avatar-x-400.png` | 400x400 | Circle-safe: mark occupies the central 42% so nothing is clipped. | ☐ |
| 8 | LinkedIn | Banner / header | `assets/banner-linkedin-1128x191.png` | 1128x191 | Left 400px reserved for the avatar overlap on desktop. | ☐ |
| 9 | Facebook | Cover photo | `assets/cover-facebook-820x312.png` | 820x312 | Content held inside the 560px band that survives the mobile crop. | ☐ |
| 10 | Facebook | Cover photo | `assets/cover-facebook-mobile-640x360.png` | 640x360 |  | ☐ |
| 11 | YouTube | Banner / header | `assets/banner-youtube-2560x1440.png` | 2560x1440 | All content inside the 1546x423 universal safe area; TV/desktop show more navy field. | ☐ |
| 12 | X | Banner / header | `assets/header-x-1500x500.png` | 1500x500 | Bottom-left 460px reserved for the avatar overlap. | ☐ |
| 13 | LinkedIn | Pinned post image | `assets/pinned-linkedin-1200x628.png` | 1200x628 | Pair with proof-01 copy and destination https://www.eduos.global/reassessment-and-evidence (see utm-manifest.json). | ☐ |
| 14 | Facebook | Pinned post image | `assets/pinned-facebook-1200x630.png` | 1200x630 | Pair with proof-01 copy and destination https://www.eduos.global/reassessment-and-evidence (see utm-manifest.json). | ☐ |
| 15 | Instagram | Pinned post image | `assets/pinned-instagram-1080x1080.png` | 1080x1080 | Pair with proof-01 copy and destination https://www.eduos.global/reassessment-and-evidence (see utm-manifest.json). | ☐ |
| 16 | X | Pinned post image | `assets/pinned-x-1600x900.png` | 1600x900 | Pair with proof-01 copy and destination https://www.eduos.global/reassessment-and-evidence (see utm-manifest.json). | ☐ |
| 17 | Instagram | Highlight cover | `assets/highlight-free-check.png` | 1080x1920 | Highlight groups posts tagged utm_campaign=free_learning_check. Content sits inside the circular crop. | ☐ |
| 18 | Instagram | Highlight cover | `assets/highlight-diagnostic.png` | 1080x1920 | Highlight groups posts tagged utm_campaign=class10_diagnostic. Content sits inside the circular crop. | ☐ |
| 19 | Instagram | Highlight cover | `assets/highlight-parent-guide.png` | 1080x1920 | Highlight groups posts tagged utm_campaign=parent_guide. Content sits inside the circular crop. | ☐ |
| 20 | Instagram | Highlight cover | `assets/highlight-learning-loop.png` | 1080x1920 | Highlight groups posts tagged utm_campaign=reassessment_evidence. Content sits inside the circular crop. | ☐ |
| 21 | Instagram | Highlight cover | `assets/highlight-proof.png` | 1080x1920 | Highlight groups posts tagged utm_campaign=reassessment_evidence. Content sits inside the circular crop. | ☐ |
| 22 | Instagram | Grid post | `assets/grid-01-mark-symptom.png` | 1080x1080 | Post as a row of three; each links to the matching kit post’s destination. | ☐ |
| 23 | Instagram | Grid post | `assets/grid-02-mastery-bands.png` | 1080x1080 | Post as a row of three; each links to the matching kit post’s destination. | ☐ |
| 24 | Instagram | Grid post | `assets/grid-03-not-a-plan.png` | 1080x1080 | Post as a row of three; each links to the matching kit post’s destination. | ☐ |

## Order of operations (per platform)
1. Profile picture → 2. Banner/cover → 3. Bio (copy.md) → 4. Website field (utm-manifest.json) →
5. Pinned post (proof-01 copy + `pinned-<platform>`) → 6. Instagram only: Highlights, then the grid row.

## Watermarks
`assets/watermark-light.png` / `watermark-dark.png` / `watermark.svg` are for future image and video
posts (bottom-right, 8–12% of the short edge, 60–80% opacity). They are not uploaded to a profile field.

## Verification after upload
Compare the live profile against `previews/*.png`; the blue rectangles are the safe areas that must
remain fully visible on desktop and mobile.
