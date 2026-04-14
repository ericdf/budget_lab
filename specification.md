# Berkeley Budget Lab — Product Specification

> **Status:** MVP implemented and deployed  
> **Live:** https://ericdf.github.io/budget_lab/  
> **Repo:** https://github.com/ericdf/budget_lab

---

## 0. Product Definition

A browser-based interactive tool that allows users to explore ways to close a city budget deficit by toggling a limited set of policy levers.

**Core function:**
- Show tradeoffs between choices
- Distinguish real fixes vs. temporary fixes vs. deferrals
- Make time effects (now vs. later) explicit

**Core question the tool forces the user to answer:**
> "Am I fixing the problem — or pushing it forward?"

This tool is a **structured decision interface**, not a budget simulator. It does not model second-order effects, multi-year compounding, or precise fiscal projections.

---

## 1. System Architecture

### 1.1 Tech Stack

| Layer | Choice | Notes |
|-------|--------|-------|
| Framework | React 18 | JSX, functional components, hooks |
| State | Zustand | Single global store; scenario derived on every toggle |
| Styling | Tailwind CSS v3 | Custom Berkeley color tokens |
| Build | Vite 5 | `base: './'` for GitHub Pages compatibility |
| Data | Static JSON | No backend; all data bundled at build time |
| Deployment | GitHub Pages | Via `actions/deploy-pages` in `.github/workflows/deploy.yml` |

### 1.2 File Structure

```
src/
├── main.jsx                     # React entry point
├── App.jsx                      # Root layout (TopBar + three columns + footer)
├── index.css                    # Tailwind directives + global styles
├── data/
│   ├── budget.json              # Total budget, deficit, spending categories
│   ├── levers.json              # All 16 policy levers with metadata
│   └── portfolios.json          # 7 preset lever combinations
├── store/
│   └── useStore.js              # Zustand store: selectedLevers, advancedMode, scenario
├── utils/
│   └── calculations.js          # calculateScenario(), formatMoney(), formatPct()
└── components/
    ├── TopBar.jsx               # Sticky header: budget stats + progress bar + mode toggle
    ├── SpendingPanel.jsx        # Left: spending category bars with impact highlighting
    ├── LeversPanel.jsx          # Center: grouped lever cards + portfolio selector
    ├── LeverCard.jsx            # Individual lever card with toggle + signal badges
    ├── PortfolioSelector.jsx    # Preset scenario buttons (collapsible)
    ├── ImpactPanel.jsx          # Right: gap meter, today/tomorrow bars, composition
    └── SummaryText.jsx          # Auto-generated 4-line scenario summary + warnings
```

---

## 2. Data Model

### 2.1 Budget (`src/data/budget.json`)

```json
{
  "total_budget": 820000000,
  "deficit": 124000000,
  "categories": [
    {
      "id": "public_safety",
      "name": "Public Safety",
      "amount": 287000000,
      "description": "string"
    }
  ]
}
```

**Berkeley FY2025 approximate actuals.** The 8 categories and their dollar amounts:

| ID | Name | Amount | % of Budget |
|----|------|--------|-------------|
| `public_safety` | Public Safety | $287M | 35% |
| `pensions_debt` | Pensions & Debt | $99M | 12% |
| `administration` | Administration | $82M | 10% |
| `public_works` | Public Works | $98M | 12% |
| `health` | Health & Human Services | $74M | 9% |
| `community_services` | Community Services | $73M | 9% |
| `parks_rec` | Parks & Recreation | $66M | 8% |
| `other` | Other | $41M | 5% |

### 2.2 Lever (`src/data/levers.json`)

```json
{
  "id": "string",
  "name_simple": "string",
  "name_advanced": "string",
  "impact_min": "number (dollars, may be 0)",
  "impact_max": "number (dollars)",
  "type": "revenue | spending | structural | temporary",
  "now_effect": "high | medium | low | none | hurts",
  "later_effect": "helps | neutral | hurts",
  "fix_type": "permanent | temporary | delayed | partial",
  "confidence": "high | medium | low",
  "implementation": "immediate | delayed",
  "affects": ["category_id"],
  "description_simple": "string",
  "description_advanced": "string",
  "mechanism": "string"
}
```

**Field notes:**
- `now_effect: "hurts"` — extends the spec's original enum (`high | medium | low`) to handle levers that worsen the near-term situation (e.g., `let_expire`)
- `now_effect: "none"` — lever has no current-year fiscal impact (e.g., `compensation_restraint`)
- `affects` — list of category IDs whose services are impacted; revenue levers that don't cut specific services use `[]`
- `impact_min/max` — annual fiscal impact in dollars; `0/0` used for discipline levers with no direct dollar value
- `fix_type: "partial"` — treated as structural for composition purposes but acknowledged as unsustainable alone

### 2.3 Scenario State (computed by `calculateScenario()`)

```js
{
  impact_min_total: number,      // sum of impact_min for active levers
  impact_max_total: number,      // sum of impact_max for active levers
  gap_closed_pct: number,        // (impact_min_total / deficit) * 100
  structural_share: number,      // 0–1 fraction of positive impact from permanent/partial levers
  temporary_share: number,       // 0–1 fraction from temporary levers
  delayed_share: number,         // 0–1 fraction from delayed levers
  helps_now: number,             // dollar sum: medium/high now_effect AND later_effect != hurts
  helps_later: number,           // dollar sum: delayed fix_type OR (none now + helps later)
  pushes_forward: number,        // dollar sum: later_effect == hurts
  future_pressure: "low|medium|high",
  warnings: string[],            // ["too_temporary", "low_confidence", "too_delayed", "future_pressure"]
  categoryImpact: { [id]: count }, // number of active levers affecting each category
  topCategories: string[],       // top 3 affected category IDs by lever count
  dominantType: "permanent|temporary|delayed|mixed",
  activeCount: number
}
```

### 2.4 Portfolio (`src/data/portfolios.json`)

```json
{
  "id": "string",
  "name": "string",
  "description": "string",
  "default_levers": ["lever_id"]
}
```

---

## 3. Lever Catalog

All 16 levers with Berkeley-calibrated impact ranges. Dollar amounts represent **estimated annual fiscal impact** on the general fund.

### Revenue (4)

| ID | Simple Name | Impact Range | Now | Later | Fix Type | Confidence | Implementation |
|----|-------------|-------------|-----|-------|----------|-----------|----------------|
| `sales_tax` | Raise Sales Tax | $12M–$22M | high | helps | permanent | high | delayed |
| `parcel_tax` | Add a Parcel Tax | $8M–$18M | high | helps | permanent | medium | delayed |
| `fee_increases` | Raise City Fees | $4M–$9M | medium | helps | permanent | high | immediate |
| `let_expire` | Accept Expiring Revenue | $0–$0 | **hurts** | helps | permanent | high | immediate |

`let_expire` has zero dollar impact — it is a discipline/accounting choice, not a savings measure. Its value is in removing budget fiction.

### Spending (4)

| ID | Simple Name | Impact Range | Now | Later | Fix Type | Confidence | Implementation |
|----|-------------|-------------|-----|-------|----------|-----------|----------------|
| `across_the_board` | Cut All Departments Equally | $12M–$18M | high | helps | permanent | high | immediate |
| `targeted_reductions` | Cut Lower-Priority Programs | $6M–$14M | medium | helps | permanent | medium | immediate |
| `vacancy_freeze` | Freeze Hiring | $5M–$9M | medium | helps | **partial** | high | immediate |
| `program_elimination` | Eliminate Programs | $8M–$16M | medium | helps | permanent | medium | immediate |

### Structural (4)

| ID | Simple Name | Impact Range | Now | Later | Fix Type | Confidence | Implementation |
|----|-------------|-------------|-----|-------|----------|-----------|----------------|
| `outsourcing` | Outsource Some Services | $3M–$9M | low | helps | delayed | **low** | delayed |
| `shift_to_county` | Shift Programs to County | $2M–$6M | low | helps | delayed | **low** | delayed |
| `service_level_reduction` | Reduce Service Levels | $7M–$13M | medium | helps | permanent | medium | immediate |
| `compensation_restraint` | Hold Down Raises | $6M–$14M | **none** | helps | delayed | **low** | delayed |

### Temporary / Timing (4)

| ID | Simple Name | Impact Range | Now | Later | Fix Type | Confidence | Implementation |
|----|-------------|-------------|-----|-------|----------|-----------|----------------|
| `section_115` | Use Pension Reserve Fund | $15M–$25M | high | **hurts** | **temporary** | high | immediate |
| `skip_pension` | Reduce Pension Contributions | $8M–$12M | medium | **hurts** | **temporary** | medium | immediate |
| `capital_deferral` | Delay Capital Projects | $10M–$18M | medium | **hurts** | **temporary** | medium | immediate |
| `fund_balance` | Use Reserves | $12M–$24M | high | **hurts** | **temporary** | high | immediate |

---

## 4. Portfolio Presets

| ID | Name | Levers |
|----|------|--------|
| `keep_everything` | Keep Everything Running | sales_tax, parcel_tax, fee_increases, vacancy_freeze |
| `protect_core` | Protect Core Services | targeted_reductions, vacancy_freeze, fee_increases, program_elimination |
| `efficiency_first` | Efficiency First | vacancy_freeze, outsourcing, compensation_restraint, across_the_board |
| `structural_reform` | Structural Reform | outsourcing, shift_to_county, service_level_reduction, compensation_restraint |
| `spend_less` | Spend Less Overall | program_elimination, across_the_board, vacancy_freeze, service_level_reduction |
| `use_savings` | Use Savings to Get Through | section_115, capital_deferral, fund_balance |
| `balanced` | Balanced Approach | sales_tax, targeted_reductions, service_level_reduction, vacancy_freeze |

Portfolio detection is **exact-match**: `PortfolioSelector` highlights the active preset only when `selectedLevers` contains exactly the same IDs as `default_levers` (same count, all present).

---

## 5. UI Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  TOP BAR (sticky)                                               │
│  Title | Total Budget | Deficit | Remaining Gap | Progress Bar  │
│                                              Simple ◉ Advanced  │
├────────────────┬───────────────────────┬────────────────────────┤
│  LEFT          │  CENTER               │  RIGHT                 │
│  Spending      │  Portfolio Selector   │  Gap Status            │
│  Overview      │  ─────────────────── │  Today vs Tomorrow     │
│                │  Revenue levers       │  Plan Composition      │
│  8 categories  │  Spending levers      │  Service Impact        │
│  bar chart     │  Structural levers    │  ─────────────────── │
│  w/ impact     │  Temp/Timing levers   │  Scenario Summary      │
│  highlighting  │                       │  + Warnings            │
│                │  Pension note         │                        │
└────────────────┴───────────────────────┴────────────────────────┘
│  FOOTER                                                         │
└─────────────────────────────────────────────────────────────────┘
```

**Responsive:** Left panel stacks above center on mobile (< `lg` breakpoint). Right panel stacks below center. The right panel uses `sticky top-[88px]` to stay visible while the center scrolls.

### 5.1 TopBar

- Sticky, Berkeley Blue background
- Title row: "Berkeley Budget Lab" + Simple/Advanced toggle (right)
- Stats row: Total Budget | Deficit | Remaining Gap | progress bar | Reset link
- Progress bar color: red (0–33%) → yellow (33–66%) → green (66–100%+)

### 5.2 SpendingPanel (Left)

- Stacked multi-color bar at top showing budget proportions
- 8 category rows: dot + name + optional impact badge + % + horizontal bar
- Impact badge appears when 1+ active levers `affects` that category: `low` (gray) / `medium` (yellow) / `high` (orange)
- Hover tooltip shows category description and dollar amount
- Impact severity: 1 lever = low, 2 = medium, 3+ = high

### 5.3 LeversPanel (Center)

- `PortfolioSelector` at top (collapsible via "Show/Hide presets" toggle)
- Four grouped sections, each with colored dot + label:
  - Revenue (blue)
  - Spending Changes (red)
  - Structural Changes (purple)
  - Temporary / Timing Tools (orange)
- Required global sentence (amber box, bottom of panel): *"Most pension costs come from past promises and don't go away quickly."*

### 5.4 LeverCard

**Simple mode shows:**
- `name_simple` (bold)
- `description_simple` (small gray)
- Signal badges: Now | Later | Fix type
- Toggle switch (right)

**Advanced mode adds:**
- `name_advanced` replaces `name_simple`
- `description_advanced` replaces `description_simple`
- Second section (below divider): Impact range | Confidence | Timing | Mechanism

**Card styling:**
- 4px left border color indicates lever `type`: blue (revenue), red (spending), purple (structural), orange (temporary)
- Selected state: `border-berkeley-blue` + subtle ring
- Entire card is clickable (role="checkbox")

**Signal badge colors:**

| Signal | Value | Color |
|--------|-------|-------|
| Now | high | green |
| Now | medium | lime |
| Now | low | gray |
| Now | none | gray |
| Now | hurts | red |
| Later | helps | blue |
| Later | neutral | gray |
| Later | hurts | orange |
| Fix | permanent | green |
| Fix | temporary | orange |
| Fix | delayed | blue |
| Fix | partial | yellow |

### 5.5 ImpactPanel (Right)

**Gap Status block:**
- Large % number (gap closed, clamped to 100%+)
- Progress bar (same color logic as TopBar)
- "$Xm saved / $Ym gap left" labels

**Today vs Tomorrow bars:**
Three horizontal bars, each scaled against the full deficit:
- Green — "Helps now": levers with `now_effect` medium/high AND `later_effect` ≠ hurts
- Blue — "Helps later": levers with `fix_type` delayed OR (`now_effect` none AND `later_effect` helps)
- Orange — "Pushes cost forward": levers with `later_effect` hurts

**Plan Composition block:**
- Segmented bar: green (permanent) | blue (delayed) | orange (temporary)
- Row breakdown with percentages
- Future Budget Pressure label: low (green) / medium (yellow) / high (red)

**Service Impact block** (only shown when categories are affected):
- Lists affected categories with count-based severity badges
- High (red): 3+ levers; Medium (yellow): 2 levers; Low (gray): 1 lever

**Scenario Summary (`SummaryText`):**
Auto-generated 4-line text:
1. Gap closed % range + dollar range
2. Dominant approach type
3. Top affected categories
4. Future budget trajectory

---

## 6. Calculation Logic

All calculations live in `src/utils/calculations.js` and are called by the Zustand store on every lever toggle.

### 6.1 Gap Closed

```
impact_min_total = Σ impact_min for all active levers
impact_max_total = Σ impact_max for all active levers
gap_closed_pct   = (impact_min_total / deficit) × 100
```

Conservative display: uses `impact_min` for the gap-closed percentage.

### 6.2 Composition

Shares are computed from dollar-weighted `impact_min` (floored at 0):

```
structural_share = (permanent_impact + partial_impact) / positive_total
temporary_share  = temporary_impact / positive_total
delayed_share    = delayed_impact / positive_total
```

### 6.3 Today vs Tomorrow Buckets

```
helps_now     = Σ impact_min where now_effect ∈ {high, medium} AND later_effect ≠ hurts
helps_later   = Σ impact_min where fix_type == delayed OR (now_effect == none AND later_effect == helps)
pushes_forward = Σ impact_min where later_effect == hurts
```

### 6.4 Future Pressure

```
hasMajorDeferral = any of [section_115, skip_pension, capital_deferral, fund_balance] is active

if (temporary_share > 0.4 OR hasMajorDeferral)   → "high"
else if (temporary_share > 0.2 OR delayed_share > 0.3) → "medium"
else                                                → "low"
```

### 6.5 Warnings

| Key | Trigger |
|-----|---------|
| `too_temporary` | `temporary_share > 0.5` |
| `low_confidence` | low-confidence levers > 40% of active count |
| `too_delayed` | `delayed_share > 0.3` |
| `future_pressure` | `future_pressure == "high"` |

### 6.6 Dominant Type (for summary text)

```
structural_share > 0.6  → "permanent"
temporary_share  > 0.5  → "temporary"
delayed_share    > 0.4  → "delayed"
else                    → "mixed"
```

---

## 7. Warning Messages

| Warning | Message shown |
|---------|--------------|
| `too_temporary` | "This plan mainly uses savings or delays costs — it doesn't fix the structural problem." |
| `future_pressure` (not too_temporary) | "This will make future budgets harder to balance." |
| `low_confidence` | "Some estimates are uncertain — actual savings may vary significantly." |
| `too_delayed` | "Much of this plan's savings won't materialize for 1–3 years." |

---

## 8. Language Constraints

### Allowed in Simple View
- "helps now" / "helps later"
- "temporary" / "permanent"
- "makes future harder"
- Dollar ranges and percentages

### Forbidden in Simple View
- actuarial, amortization, GASB, liability structure, unfunded liability (as jargon)
- Technical pension accounting terminology

### Required Global Sentence
Displayed once, persistently, in the levers panel:
> "Most pension costs come from past promises and don't go away quickly."

---

## 9. Visual Encoding

| Concept | Visual |
|---------|--------|
| High now-impact | solid green bar / green badge |
| Medium now-impact | lighter green / lime |
| Low now-impact | faint / gray |
| Uncertain (low confidence) | gray badge |
| Temporary measure | orange |
| Long-term benefit | blue |
| Pushes cost forward | orange bar in Today vs Tomorrow |
| Future pressure: high | red label |
| Future pressure: medium | yellow label |
| Future pressure: low | green label |

**Berkeley brand colors** (Tailwind custom tokens):
- `berkeley-blue`: `#003262` — headers, selected states, primary actions
- `berkeley-gold`: `#FDB515` — Advanced mode toggle when on
- `berkeley-blue-mid`: `#3B7EA1` — secondary blue tones

---

## 10. State Management

Zustand store (`src/store/useStore.js`) holds:

| Field | Type | Description |
|-------|------|-------------|
| `selectedLevers` | `string[]` | IDs of active levers |
| `advancedMode` | `boolean` | Simple vs Advanced card display |
| `scenario` | `ScenarioState` | Derived, recomputed on every toggle |

Actions:
- `toggleLever(id)` — add/remove from `selectedLevers`, recompute scenario
- `toggleAdvancedMode()` — flip `advancedMode`
- `applyPortfolio(portfolioId)` — replace `selectedLevers` with portfolio's `default_levers`
- `clearAll()` — reset to empty selection

The scenario is **eagerly computed** (not memoized) on every action. Given the dataset size (16 levers), this is instantaneous and preferred over lazy derivation.

---

## 11. Deployment

### GitHub Pages via Actions

`.github/workflows/deploy.yml` triggers on push to `main` or `master`:

1. `actions/checkout@v4`
2. `actions/setup-node@v4` (Node 20)
3. `npm ci`
4. `npm run build` → outputs to `dist/`
5. `actions/upload-pages-artifact@v3` (uploads `dist/`)
6. `actions/deploy-pages@v4` (deploys to Pages environment)

**Required repo settings:** GitHub Pages source must be set to "GitHub Actions" (Settings → Pages → Source).

### Build output

```
dist/
├── index.html          ~0.8 kB gzip
├── assets/
│   ├── index-*.css     ~22 kB raw / 4.6 kB gzip
│   └── index-*.js      ~188 kB raw / 60 kB gzip
```

Total transfer: ~65 kB gzip. No external runtime dependencies (fonts from Google Fonts CDN only).

---

## 12. Implementation Phases

### Phase 1 — MVP (complete)
- Static JSON data (Berkeley-calibrated estimates)
- 16 levers across 4 groups
- 7 portfolio presets
- Simple + Advanced mode toggle
- Real-time gap, composition, and warning calculations
- GitHub Pages deployment via Actions

### Phase 2 — Data Refinement
- Update impact ranges from CAFR (Comprehensive Annual Financial Report)
- Refine category mapping to match published budget line items
- Add data source citations and assumption notes per lever
- Surface confidence intervals more explicitly in Advanced view

### Phase 3 — Sharing and Extension
- Shareable scenario URLs (encode selected levers in URL hash)
- Export scenario as PDF or image
- City-specific configuration (swap data layer for other municipalities)
- Assumptions editor for advanced users

---

## 13. Success Criteria

A user should be able to:

1. Build a scenario in under 2 minutes
2. Understand the difference between fixing the problem and delaying it
3. Identify at least 2 alternative strategies with different tradeoff profiles
4. Recognize that high short-term savings can come with long-term costs

The tool succeeds if a non-expert user, after 5 minutes of exploration, can articulate *why* one portfolio is riskier than another.
