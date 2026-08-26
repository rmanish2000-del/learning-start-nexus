# EduOS Hindi Parent Experience v1 — Report

## Goal
A Hindi-speaking parent can understand the product, buy the diagnostic, read the report, and upgrade — end to end, without English.

## Language layer
- `src/lib/i18n/context.tsx` — `LanguageProvider`, `useI18n()`, and `t(key, englishFallback, vars)` with `{token}` interpolation. Selection persists in local storage; English is always the fallback, so any missing key renders the original English copy (no blank strings, no broken layout).
- `src/lib/i18n/hi.ts` — the Hindi dictionary (~460 entries) for the whole parent journey.
- `src/components/language-toggle.tsx` — English / हिंदी switch, mounted in the parent chrome (`diagnostic-shell`) and the root layout.

## Translated surfaces
| Surface | File | Status |
| --- | --- | --- |
| Landing page V2 | `src/routes/index.tsx` | Done |
| Diagnostic purchase / pricing | `src/routes/diagnostic.index.tsx` | Done |
| Checkout + success/failure states | `src/routes/diagnostic.checkout.$orderRef.tsx` | Done |
| Diagnostic session | `src/routes/diagnostic.session.$token.tsx` | Done |
| Gap report | `src/routes/diagnostic.report.$token.tsx` | Done |
| Upgrade offer (Board Success Plan) | `src/routes/upgrade.$token.tsx` | Done |
| Parent portal navigation, checklist, consent steps | `src/routes/_authenticated/parent.tsx` | Done |

## Vocabulary standard (natural Hindi, no transliteration)
| English | Hindi |
| --- | --- |
| Outcome gap | सीखने में कमी |
| Recommended intervention | सुझाया गया अभ्यास |
| Upgrade plan / Board Success Plan | पूर्ण सफलता योजना |
| Learning outcome | सीखने का लक्ष्य |
| Mastery / mastery lift | महारत / महारत बढ़त |
| Diagnostic report | जाँच रिपोर्ट |
| Reassessment | दोबारा जाँच |
| Guardian consent | अभिभावक की अनुमति |
| Bands: Weak / Developing / Secure / Strong | कमज़ोर / बनता हुआ / मज़बूत / बहुत मज़बूत |

Proper nouns stay as-is: EduOS, CBSE, Razorpay, UPI, AI.

## Design rules applied
- Dynamic values (child name, counts, marks, prices, dates) are passed as interpolation variables, never concatenated, so Hindi word order stays natural.
- SEO metadata, JSON-LD, and `landing-content.ts` remain English — the source of truth for crawlers is unchanged.
- Payment amounts, order references, and server-side scoring logic are untouched; the change is presentation-only.

## Verification
- Typecheck: clean.
- `/diagnostic/report/:token` and `/upgrade/:token` return 200 from the dev server.
- Missing-key audit: every `t()` key used in the parent journey resolves in `hi.ts`; unmatched keys fall back to English by design.
