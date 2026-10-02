# MPBSE Paper Practice — Board Selector Design Package

**Priority:** P0  
**Feature:** Extend EduOS Paper Practice with CBSE + MPBSE board selector  
**Status:** Design specification only · DEPLOYMENT: NOT ALLOWED  
**MPBSE accent:** `#7C3AED` (Violet 700)  
**CBSE accent:** `#0D9488` (Teal 600)

## What this package contains

| File | Purpose |
|---|---|
| `README.md` | This file — overview, constraints, limitations |
| `FILTER_SPEC.json` | Machine-readable filter chain specification |
| `COMPONENT_SPEC.md` | Board tabs, filter chain, paper cards, state screens |
| `CONTENT_RULES.md` | Official MPBSE vs EduOS Practice vs Pattern Analysis |
| `ACCEPTANCE_CRITERIA.md` | P0–P3 acceptance criteria |
| `DESIGN_TOKENS.json` | W3C DTCG design tokens |

## Critical design rules

1. **MPBSE structure must NOT be forced into CBSE schema.** They are independent data models.
2. **EduOS never hosts official MPBSE PDF files.** Official papers link to `mpbse.nic.in` only.
3. **Three content types are always visually distinct** — Official MPBSE (green) · EduOS Practice (purple) · Pattern Analysis (indigo).
4. **2021 MPBSE paper is flagged** — COVID disruption means pattern differs significantly.
5. **Bilingual UI is required** — filter labels, section names, and key copy must appear in both Hindi and English.
6. **Verify Maths Basic/Standard split with MPBSE directly** — this is a CBSE concept; MPBSE equivalent must be confirmed before publishing.

## MPBSE filter chain

Board → Class (10, fixed) → Subject → Paper Type → Year → Medium → Practice Mode → CTA

Board switch resets all downstream filters. Hindi is default medium.

## In-browser design page

Navigate in the app to: Footer → "MPBSE Paper Practice" (or set page state to `mpbse-paper-practice`).

Contains 7 tabs: Board Selector (interactive) · MPBSE Paper Structure · Paper Cards · Screen States · Content Rules · Filter Spec JSON · Handoff.
