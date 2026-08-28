# EduOS — Post-Visual-Acceptance English-Only Release, Security Scan and Pilot Gate

**Date:** 2026-08-28 (UTC)
**Scope:** English-only product decision, functional verification, security and database
scan, controlled-pilot readiness verdict.
**Product truth preserved:** India / INR, CBSE Class 10, Mathematics and Science,
₹199 diagnostic, ₹2,999 annual plan, real routes, current backend behaviour.

---

## Verdict

**READY_FOR_FIVE_FAMILY_PILOT**

Conditions carried into the pilot are listed in §6. None of them block a five-family
controlled pilot; all are operational, not defects.

---

## 1. English-only implementation

Founder decision: EduOS supports **English only** at this stage. No user-facing
mechanism may switch the application into Hindi.

| Change | File | Result |
|---|---|---|
| Language switch removed from the public chrome | `src/components/public-layout.tsx` | Header/footer render without the toggle; flex layout closes cleanly, no orphan gap |
| Language switch removed from the parent journey chrome | `src/components/diagnostic-shell.tsx` | Diagnostic shell header renders without the toggle |
| Toggle component deleted | `src/components/language-toggle.tsx` | File removed |
| Hindi dictionary deleted | `src/lib/i18n/hi.ts` | File removed (~460 entries) |
| Translation layer reduced to English | `src/lib/i18n/context.tsx` | `t(key, english, vars)` is now an identity function with `{token}` interpolation; no dictionary lookup |
| Legacy preference cleared | `src/lib/i18n/context.tsx` | `LanguageProvider` deletes any stored `eduos.lang` value on mount, so a returning browser that previously chose हिंदी is silently returned to English |

### Infrastructure disposition

The generic `t()` seam was **kept**, not ripped out. Roughly twenty parent-facing
files call `t("key", "English copy")`; deleting the call sites would have meant a
large, risky edit across the revenue journey immediately after visual acceptance.
Keeping the identity-function seam is the safer disposition: it renders the inline
English string verbatim, it cannot select another language because no dictionary
exists, and it leaves a clean re-entry point if localisation is ever re-approved.
All Hindi *data* and all Hindi *controls* are gone.

### Regression guard

`src/lib/__tests__/english-only.test.ts` fails the build if any of the following
reappear: the Hindi dictionary file, the toggle component, a `LanguageToggle` /
`LANGUAGE_LABELS` / `setLang` reference in `src/`, or Devanagari characters in
user-facing copy. It also asserts the legacy `eduos.lang` value is cleared.

---

## 2. Functional verification (live dev server, Playwright + curl)

Verified with a **stale `eduos.lang = "hi"` value pre-seeded in local storage** —
the worst case for a returning pilot parent.

| Route | HTTP | `<html lang>` | Toggle present | Devanagari in DOM | Horizontal overflow |
|---|---|---|---|---|---|
| `/` | 200 | en | no | none | none |
| `/about` | 200 | en | no | none | none |
| `/contact` | 200 | en | no | none | none |
| `/privacy` | 200 | en | no | none | none |
| `/terms` | 200 | en | no | none | none |
| `/auth` | 307 → chooser | en | no | none | none |
| `/diagnostic` | 200 | en | no | none | none |
| `/free-check/:id` | 200 | en | no | none | none |
| `/sitemap.xml` | 200 | — | — | — | — |

Stored `eduos.lang` read back as `null` from the second navigation onward — the
clearing effect works.

Responsive re-check of the accepted Figma-informed home page:

| Viewport | Horizontal overflow | Header height |
|---|---|---|
| 390 px | none | 65 px |
| 768 px | none | 65 px |
| 1280 px | none | 65 px |
| 1440 px | none | 65 px |

Browser console errors across the sweep: **none**.

---

## 3. Build and test gate

| Check | Result |
|---|---|
| `bunx vitest run` | **105 / 105 passing**, 12 files |
| Typecheck (`tsgo --noEmit`) | clean |
| Production build (`bun run build`) | success, Worker bundle generated |
| Lint on changed files | clean (3 pre-existing `react-refresh` warnings in `context.tsx`, non-blocking) |

---

## 4. Security scan (fresh, 2026-08-28)

| Scanner | Findings |
|---|---|
| supabase | 1 warning |
| supabase_lov | 0 |
| wiz (repository) | 0 |
| app_mcp | 0 |
| Dependency scan (npm audit) | no high or critical vulnerabilities |

**Critical findings: 0.**

### Warning — signed-in users can execute a `SECURITY DEFINER` function

Pre-existing and unchanged by this release. The remaining definer functions are the
`private.*` RLS helpers that enforce organisation matching; revoking execute from
`authenticated` would break tenant isolation, which is the stronger control. Accepted
for the pilot.

---

## 5. Database scan

| Check | Result |
|---|---|
| Public tables without RLS enabled | **0** |
| RLS enabled with no policy | **1** — `public.payment_credentials`, intentional: encrypted gateway credentials reachable only by service-role server code |
| Paid parent orders | 5 |
| Profiles | 37 |

No orphaned or inconsistent payment state observed.

---

## 6. Conditions carried into the pilot

1. `SECURITY DEFINER` warning above — accepted, isolation depends on it.
2. `profiles.phone` remains readable by members of the same organisation (P1 from the
   prior scan). Single-tenant during the pilot, so no cross-centre exposure.
3. Apex domain `eduos.global` still awaiting DNS; `www.eduos.global` is live.
4. This release is verified on the dev server and by build; publishing to production is
   a separate, explicit founder action.

---

## 7. Result summary

```
ENGLISH_ONLY_RELEASE:        PASS
HINDI_TOGGLE_REMOVED:        YES
HINDI_DICTIONARY_REMOVED:    YES
LEGACY_PREFERENCE_CLEARED:   YES
FUNCTIONAL_JOURNEYS:         PASS
RESPONSIVE_390_768_1280_1440: PASS
TESTS:                       PASS (105/105)
TYPECHECK:                   PASS
BUILD:                       PASS
SECURITY_CRITICAL_FINDINGS:  0
DEPENDENCY_VULNERABILITIES:  0
DATABASE_RLS_GAPS:           0 (1 intentional policy-less table)
PILOT_VERDICT:               READY_FOR_FIVE_FAMILY_PILOT
DEPLOYED:                    NO (awaiting explicit publish instruction)
```
