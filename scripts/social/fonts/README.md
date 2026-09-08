# Fonts vendored for the social-profile build — provenance

Both families are the approved marketing/design-package faces named in `src/routes/__root.tsx`
(Outfit display, Inter body). They are vendored here only so `generate-profile-package.py` is
reproducible offline; the application loads the same families from Google Fonts at runtime.
Both are licensed under the SIL Open Font License 1.1, which permits redistribution with the licence text.

| File | Family / instance | Upstream source (pinned) | Upstream path | Licence file (verbatim from upstream) |
|---|---|---|---|---|
| `Outfit.ttf` | Outfit Bold 700 | https://github.com/Outfitio/Outfit-Fonts @ `902773808eb372f70fb34e8946dd1ffe604efc79` | `fonts/ttf/Outfit-Bold.ttf` | `OFL-Outfit.txt` (+ `AUTHORS-Outfit.txt`) |
| `Inter.ttf` | Inter Variable (wght axis; 500 used) | https://github.com/rsms/inter @ `353b61b9f4430d5f420d56605a6e7993e0941470` | `docs/font-files/InterVariable.ttf` | `OFL-Inter.txt` |

## Checksums (SHA-256)
- f620b69582e06d7e1b3bbde74ed8c5876eadabb038390780db2a3414a1490197  Outfit.ttf
- 4989b125924991b90d05b2d16e0e388c48f7d5bb8b30539bbf9c755278d0ccaf  Inter.ttf
- c676351bf8576b9aba743cd5eaa8c0e7ee0d51f805d720447b4df4ddb6a2e416  OFL-Outfit.txt
- 262481e844521b326f5ecd053e59b98c8b2da78c8ee1bdbb6e8174305e54935a  OFL-Inter.txt
- bba8d0d126affb67c2685023be4fef1e736961593ee0ea6fabdf2b313421abbd  AUTHORS-Outfit.txt

The licence texts are copied unmodified from the upstream repositories at the pinned commits above and are
also shipped inside the package under `social-profile-package/licences/`.
