# Consolidated staging verification, 2026-10-03 (FAIL)

Main 5bf25fb554067560ec3b7dd5aa09380f90f82888 includes merged PR #6 (b634d11a), #7 (9c90805c), #8 (553052e9).
Staging saved version d36eaef; assets index-oE0w6V3R.js, styles-CEoXcQt9.css.

FAIL reason: staging differs from main (71 code files incl. return-path, platform-owner, payment-settings; migrations differ).

Redirect matrix (live staging, 08:40 UTC): all 16 malicious variants stayed on EduOS signed out, signed in (founder) and signed in (reviewer). Valid /exam-pattern and /exam-pattern?board=cbse#papers preserved and opened for founder. Main's sanitizer is stricter: it rejects /a/../b and /./x; staging normalises them. Both stay on the same origin.

MPBSE: 9/9 official links; Basic/Standard separated; 9/9 practice disabled; no automated a11y violations desktop/mobile; no horizontal scroll. Staging page still contains lang="hi" content (main removed it).
CBSE: content present, no errors.
Timed attempt (mobile): save, reload restore, submit with score shown, storage cleared after submit, sign-out and foreign-owner. History after submit: NOT found by test.

Roles: founder sees 3 owner links and can open all three pages; centre admin, educator, parent and reviewer see no owner links and are redirected away.
HTTP: non-founder owner actions return 403 (correct). DEFECTS: signed-out protected actions return 200 "Unauthorized" (expected 401); 3 centre-admin actions return 200 with a denial message to educator/parent/reviewer (expected 403).
Vendor branding: none found on /, /auth, /exam-pattern HTML.
Limitations: existing sessions reused; automated a11y only; main's tests not run here.
