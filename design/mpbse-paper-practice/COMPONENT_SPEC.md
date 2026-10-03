# Component Specification — MPBSE Paper Practice

## 1. BoardTabStrip

```
<div role="tablist" aria-label="Select board">
  <button role="tab" aria-selected={board==="cbse"}  id="tab-cbse"  aria-controls="panel-cbse">CBSE</button>
  <button role="tab" aria-selected={board==="mpbse"} id="tab-mpbse" aria-controls="panel-mpbse">MP Board (MPBSE)</button>
</div>
```

- Switching board resets ALL downstream filter selections
- Active tab: bottom border in board accent colour, accent background tint
- Tab keyboard nav: Left/Right arrow keys

## 2. ClassBadge (MPBSE only)

- Fixed value: Class 10 / कक्षा 10
- Shown as a static badge — not a dropdown
- Accent colour: MPBSE purple (#7C3AED)

## 3. SubjectSelector

- Grid: 3 columns desktop, 1 column mobile
- Each card: English label (bold) + Hindi label (font-mono, muted)
- Selected: purple border + purple background tint
- Required field — CTA disabled until subject selected

## 4. PaperTypeSelector

- Two buttons: Board Paper (बोर्ड प्रश्नपत्र) + Model Paper (मॉडल प्रश्नपत्र)
- Selected: filled purple background
- Shown only after subject is selected

## 5. YearSelector

- Pill buttons: 2019 · 2020 · 2021* · 2022 · 2023 · 2024
- 2021 has asterisk (*) and tooltip: "2021 exam was disrupted; pattern differs"
- Selected: filled purple background
- Required

## 6. MediumToggle

- Two buttons: Hindi / हिंदी · English / अंग्रेज़ी
- Default: Hindi
- Persists across sessions (localStorage key: `eduos.paper.medium`)
- On switch: update `lang` attribute on the filter panel container

## 7. PracticeModeSelector

- Grid: 2 columns
- Full Timed (पूर्ण समयबद्ध): 3h · 100 marks · post-submission feedback
- Chapter Practice (अध्याय अभ्यास): untimed · instant feedback
- Required

## 8. CTAButton

- Disabled state: grey background, "Select subject, year and mode to continue"
- Active state: MPBSE purple, "Start Practice → अभ्यास शुरू करें"
- aria-disabled when filters incomplete

## 9. PaperCard (three variants)

### Official MPBSE
- Green badge "Official MPBSE"
- External link icon
- Opens mpbse.nic.in in new tab
- `aria-label`: "View official MPBSE [Subject] [Year] paper (opens in new tab)"
- Disclaimer banner: "External link · not hosted by EduOS"

### EduOS Practice
- Purple badge "EduOS Practice"
- Hosted, full scoring, bilingual
- CTAs: "Start Practice →" (primary) + "Preview" (secondary)

### Pattern Analysis
- Indigo badge "Pattern Analysis"
- Disclaimer: "AI-derived · not official MPBSE · verify against current blueprint"
- Must cite source years

## 10. Screen states (all routes)

| State | Trigger | Key element |
|---|---|---|
| Loading | Data fetch in progress | Skeleton shimmer on cards; filter panel interactive |
| Zero Data | Filter combo has no results | Friendly message + "Try different year" CTA |
| Populated | Results returned | Paper cards grid |
| Error | Network / server failure | Message + Retry button + support@eduos.global |
| Permission Denied | Chapter practice requires auth | "Sign in to track progress" CTA |
| Practice Active | User starts a session | Timer (timed) or progress bar (chapter) |
| Practice Complete | All questions answered | Mastery band + "See Gap Report →" |
