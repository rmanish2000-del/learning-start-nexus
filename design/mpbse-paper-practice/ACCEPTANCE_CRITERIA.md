# Acceptance Criteria — MPBSE Paper Practice Board Selector

## P0 — Critical (block release)

- [ ] MPBSE paper structure is NOT mapped to CBSE section schema. Both are treated as independent data models with their own section IDs, mark weights, and question types.
- [ ] Official MPBSE papers link to `mpbse.nic.in` only. EduOS never hosts, renders, or annotates official MPBSE PDF content.
- [ ] All three content types are visually distinct and consistently badged on every card and screen. No content type is ever ambiguous.
- [ ] 2021 year is flagged with asterisk (*) and tooltip explaining COVID disruption and pattern difference.
- [ ] Verify Maths Basic/Standard split with MPBSE directly before publishing subject list. This is a CBSE concept.
- [ ] Board switch (CBSE → MPBSE or reverse) resets ALL downstream filter selections immediately.

## P1 — High

- [ ] All 7 MPBSE filters present in correct cascade: Board → Class (badge) → Subject → Paper Type → Year → Medium → Mode.
- [ ] CTA is disabled until all required filters (subject + year + mode) are selected.
- [ ] Both Hindi and English labels appear on every filter header and section name in the MPBSE panel.
- [ ] Hindi is the default medium. Medium toggle persists across sessions via localStorage.
- [ ] `lang` attribute on filter panel container updates when medium changes: `hi` or `en`.
- [ ] All screen states implemented: loading (skeleton shimmer), error (+ retry), zero-data (actionable CTA), populated, permission-denied.
- [ ] Internal choices (आंतरिक विकल्प) surfaced in chapter practice UI for Sections B, C, D.

## P2 — Standard

- [ ] Devanagari text uses a font stack that supports Devanagari (Noto Sans Devanagari or system-ui).
- [ ] Official MPBSE paper cards have `aria-label` ending in "(opens in new tab)".
- [ ] Timed session shows countdown. Verbal warnings at 30 min, 10 min, 5 min via `aria-live="polite"`.
- [ ] Pattern Analysis cards show disclaimer and cite source years on every card.
- [ ] MPBSE purple `#7C3AED` on white passes WCAG AA (5.94:1).
- [ ] Mobile layout (360px+): subject selector collapses to 1 column; all filters stack vertically.

## P3 — Nice to have

- [ ] Year-wise topic frequency chart (recharts) on Pattern Analysis cards.
- [ ] Paper preview modal before starting full timed session.
- [ ] Saved filter state across sessions (last MPBSE selection remembered).

## Out of scope

- Downloadable PNG/PDF/ZIP from design tool environment
- Actual backend implementation
- Real learner data in any design or export
- Deployment to production
