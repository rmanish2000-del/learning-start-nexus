# Sample Workspace Specification

## Two starter paths

### Path A — Set up with real learners (primary)

- Add learners individually or via CSV upload
- Invite educators by email
- Assign a CBSE / State Board diagnostic
- All data is live, production, billable
- Reports affect compliance records
- Evidence chain is permanent and auditable
- Pricing: ₹0 for first learner · ₹199/month per learner thereafter

### Path B — Explore with sample workspace (exploratory)

- One-click sample data loaded instantly
- Clearly labelled **SAMPLE** on every screen and in every export
- Isolated namespace — never mixed with real data
- Cannot appear in production reports, billing, compliance, or evidence chain
- Does not affect payment metrics
- Removable in one action: "Remove Sample Workspace" in Settings

## Sample dataset

| Type | Count | Details |
|---|---|---|
| Learners | 5 | Learner A–E · Classes 9 and 10 · CBSE and State Board |
| Assessments | 3 | Maths Algebra, Science Chemical Reactions, Maths Quadratic Equations |
| Reports | 2 | Learner A Maths (Developing), Learner B Science (Secure) |

No real learner names. All identifiers are generated.

## SAMPLE label requirements

Every screen, card, report, and export that renders sample data **must** display a SAMPLE badge or banner. Failure to label is a **P0 critical defect**.

Implementation: inject at the data layer, not only in UI, to prevent bypass via API consumers.

## Removal flow

1. Centre admin opens **Settings → Sample Workspace**
2. Taps **Remove Sample Workspace** (red destructive button)
3. Confirmation modal: lists what will be removed · **Remove** (red) and **Cancel** (secondary)
4. Removal executes immediately — atomic transaction, all-or-nothing
5. Removal is logged server-side with timestamp and user ID
6. Toast: "Sample workspace removed." Dashboard updates immediately.
