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
- Make explicit whether a plan **structurally balances** the budget

**Core questions the tool forces the user to answer:**
> "Am I fixing the problem — or pushing it forward?"  
> "Does this plan structurally balance the budget?"

This tool is a **structured decision interface**, not a budget simulator. It does not model second-order effects, multi-year compounding, or precise fiscal projections.

### Solution Type Model

There are three types of budget solutions, distinguished throughout the tool:

| Solution Type | Description | Examples |
|--------------|-------------|---------|
| **Structural fix** | Changes ongoing balance between recurring revenues and costs | Spending cuts, service level reductions, labor restraint |
| **Temporary fix** | Uses savings or shifts timing without changing the underlying balance | Drawing reserves, deferring capital, pension fund draw-downs |
| **External funding** | Brings in new revenue from outside the existing base | Tax increases, fee increases, voter-approved measures |

The key distinction is: **structural fixes** and **external funding** can produce a structurally balanced budget. **Temporary fixes** cannot — they borrow against the future.

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
│   ├── budget.json              # General Fund total, annual gap, spending categories
│   ├── levers.json              # All 19 policy levers with metadata
│   └── portfolios.json          # 10 preset lever combinations
├── store/
│   └── useStore.js              # Zustand store: selectedLevers, advancedMode, scenario
├── utils/
│   └── calculations.js          # calculateScenario(), formatMoney(), formatPct()
└── components/
    ├── TopBar.jsx               # Sticky header: budget stats + progress bar + mode toggle
    ├── SpendingPanel.jsx        # Left: spending category bars with impact highlighting
    ├── LeversPanel.jsx          # Center: grouped lever cards + portfolio selector + explainer
    ├── LeverCard.jsx            # Individual lever card with toggle + signal badges
    ├── PortfolioSelector.jsx    # Preset scenario buttons (collapsible)
    ├── ImpactPanel.jsx          # Right: gap meter, structural balance, today/tomorrow, composition
    └── SummaryText.jsx          # Auto-generated scenario summary + warnings
```

---

## 2. Data Model

### 2.1 Budget (`src/data/budget.json`)

```json
{
  "total_budget": 290000000,
  "deficit": 33000000,
  "categories": [{ "id": "string", "name": "string", "amount": number, "description": "string" }]
}
```

**Basis:** Berkeley General Fund (discretionary operating budget), approximate FY2025.  
**Deficit:** Structural annual gap of ~$33M (not the $124M all-funds figure).

The 8 spending categories:

| ID | Name | Amount | % of GF |
|----|------|--------|---------|
| `public_safety` | Public Safety | $104M | 36% |
| `pensions_debt` | Pensions & Debt | $40M | 14% |
| `public_works` | Public Works | $35M | 12% |
| `administration` | Administration | $33M | 11% |
| `health` | Health & Human Services | $27M | 9% |
| `community_services` | Community Services | $25M | 9% |
| `parks_rec` | Parks & Recreation | $18M | 6% |
| `other` | Other | $8M | 3% |

### 2.2 Lever (`src/data/levers.json`)

```json
{
  "id": "string",
  "name_simple": "string",
  "name_advanced": "string",
  "impact_min": "number (dollars)",
  "impact_max": "number (dollars)",
  "type": "revenue | spending | structural | temporary",
  "solution_type": "fix | temporary | external",
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

- `solution_type` — cross-cutting classification for the structural balance model:
  - `"fix"` → spending and structural levers (directly change ongoing cost/revenue balance)
  - `"temporary"` → temporary/timing levers (shift costs or use one-time savings)
  - `"external"` → revenue levers (bring in new money requiring external action or voter approval)
- `now_effect` extends the base enum to include `"hurts"` (lever worsens near-term situation) and `"none"` (no current-year impact)
- `affects` lists category IDs whose services are impacted; revenue levers that don't cut specific services use `[]`
- `impact_min/max` — annual fiscal impact in dollars; `0/0` for discipline levers with no direct dollar value (e.g., `let_expire`)
- `fix_type: "partial"` — treated as structural for composition purposes but acknowledged as unsustainable alone

**`solution_type` mapping by `type`:**

| `type` | `solution_type` |
|--------|----------------|
| revenue | external |
| spending | fix |
| structural | fix |
| temporary | temporary |

### 2.3 Scenario State (computed by `calculateScenario()`)

```js
{
  impact_min_total: number,        // Σ impact_min for active levers
  impact_max_total: number,        // Σ impact_max for active levers
  gap_closed_pct: number,          // (impact_min_total / deficit) × 100
  structural_share: number,        // 0–1: permanent+partial impact / positive total
  temporary_share: number,         // 0–1: temporary impact / positive total
  delayed_share: number,           // 0–1: delayed impact / positive total
  helps_now: number,               // $ from levers with medium/high now_effect AND later ≠ hurts
  helps_later: number,             // $ from delayed levers OR (none now + helps later)
  pushes_forward: number,          // $ from levers where later_effect == hurts
  structurally_balanced: boolean,  // temporary_share < 0.2 AND gap_closed_pct >= 100
  future_pressure: "low|medium|high",
  warnings: string[],
  categoryImpact: { [id]: count }, // number of active levers affecting each category
  topCategories: string[],         // top 3 most-affected category IDs
  dominantType: "permanent|temporary|delayed|mixed",
  activeCount: number
}
```

### 2.4 Portfolio (`src/data/portfolios.json`)

```json
{ "id": "string", "name": "string", "description": "string", "default_levers": ["lever_id"] }
```

---

## 3. Lever Catalog

All 19 levers. Dollar amounts = **estimated annual fiscal impact** on the General Fund, calibrated to the $33M gap.

### Revenue — `solution_type: "external"` (5)

| ID | Simple Name | Impact Range | Now | Later | Fix Type | Confidence |
|----|-------------|-------------|-----|-------|----------|-----------|
| `sales_tax` | Raise Sales Tax | $9M–$10M | high | helps | permanent | high |
| `parcel_tax` | Add a Parcel Tax | $4M–$8M | high | helps | permanent | medium |
| `fee_increases` | Raise City Fees | $2M–$4M | medium | helps | permanent | high |
| `let_expire` | Accept Expiring Revenue | $0–$0 | **hurts** | helps | permanent | high |
| `enterprise_fees` | Update Fees to Cover Costs | $2M–$6M | low | helps | permanent | medium |

`let_expire` has zero dollar impact — it is a discipline choice that clarifies the true structural gap.

### Spending — `solution_type: "fix"` (4)

| ID | Simple Name | Impact Range | Now | Later | Fix Type | Confidence |
|----|-------------|-------------|-----|-------|----------|-----------|
| `across_the_board` | Cut All Departments Equally | $3M–$6M | high | helps | permanent | high |
| `targeted_reductions` | Cut Lower-Priority Programs | $2M–$5M | medium | helps | permanent | medium |
| `vacancy_freeze` | Freeze Hiring | $1M–$3M | medium | helps | **partial** | high |
| `program_elimination` | Eliminate Programs | $3M–$6M | medium | helps | permanent | medium |

### Structural — `solution_type: "fix"` (5)

| ID | Simple Name | Impact Range | Now | Later | Fix Type | Confidence |
|----|-------------|-------------|-----|-------|----------|-----------|
| `real_baseline` | Budget Based on Real Costs | $3M–$8M | medium | helps | permanent | medium |
| `outsourcing` | Outsource Some Services | $1M–$3M | low | helps | delayed | **low** |
| `shift_to_county` | Shift Programs to County | $1M–$2M | low | helps | delayed | **low** |
| `service_level_reduction` | Reduce Service Levels | $2M–$4M | medium | helps | permanent | medium |
| `compensation_restraint` | Hold Down Raises | $2M–$5M | **none** | helps | delayed | **low** |

### Temporary / Timing — `solution_type: "temporary"` (5)

| ID | Simple Name | Impact Range | Now | Later | Fix Type | Confidence |
|----|-------------|-------------|-----|-------|----------|-----------|
| `section_115` | Use Pension Reserve Fund | $3M–$6M | high | **hurts** | **temporary** | high |
| `skip_pension` | Reduce Pension Contributions | $1M–$3M | medium | **hurts** | **temporary** | medium |
| `capital_deferral` | Delay Capital Projects | $2M–$5M | medium | **hurts** | **temporary** | medium |
| `fund_balance` | Use Reserves | $3M–$6M | high | **hurts** | **temporary** | high |
| `restricted_transfer` | Use Funds Set Aside for Other Purposes | $3M–$5M | medium | **hurts** | **temporary** | high |

`restricted_transfer` represents diverting restricted or special-purpose fund balances (e.g., workers' comp reserves) — a documented practice in Berkeley's recent budgets.

---

## 4. Portfolio Presets (10)

| ID | Name | Levers |
|----|------|--------|
| `keep_everything` | Keep Everything Running | sales_tax, parcel_tax, fee_increases, vacancy_freeze |
| `protect_core` | Protect Core Services | targeted_reductions, vacancy_freeze, fee_increases, program_elimination |
| `efficiency_first` | Efficiency First | vacancy_freeze, outsourcing, compensation_restraint, across_the_board |
| `structural_reform` | Structural Reform | outsourcing, shift_to_county, service_level_reduction, compensation_restraint |
| `spend_less` | Spend Less Overall | program_elimination, across_the_board, vacancy_freeze, service_level_reduction |
| `use_savings` | Use Savings to Get Through | section_115, capital_deferral, fund_balance |
| `balanced` | Balanced Approach | sales_tax, targeted_reductions, service_level_reduction, vacancy_freeze |
| `status_quo` | Status Quo (Current Approach) | section_115, restricted_transfer, fund_balance |
| `structural_balance` | Structural Balance | targeted_reductions, enterprise_fees, sales_tax |
| `delay_problem` | Delay the Problem | section_115, capital_deferral, fund_balance, skip_pension |

Portfolio detection is **exact-match**: a preset is highlighted only when `selectedLevers` contains exactly the same IDs as `default_levers`.

---

## 5. UI Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  TOP BAR (sticky)                                               │
│  Title | General Fund | Annual Budget Gap | Remaining Gap       │
│                          Progress bar              Simple/Adv ◉ │
│  Context: "This tool focuses on the yearly budget gap..."       │
├────────────────┬───────────────────────┬────────────────────────┤
│  LEFT          │  CENTER               │  RIGHT                 │
│  Spending      │  Portfolio Selector   │  Gap Status            │
│  Overview      │  ─────────────────── │  Structural Balance ✔✖ │
│                │  Current approach     │  Today vs Tomorrow     │
│  8 categories  │  explainer (collapse) │  Plan Composition      │
│  bar chart     │  ─────────────────── │  Service Impact        │
│  w/ impact     │  Revenue levers       │  ─────────────────── │
│  highlighting  │  Spending levers      │  Scenario Summary      │
│                │  Structural levers    │  + Warnings            │
│                │  Temp/Timing levers   │                        │
│                │  ─────────────────── │                        │
│                │  Pension note         │                        │
└────────────────┴───────────────────────┴────────────────────────┘
│  FOOTER                                                         │
└─────────────────────────────────────────────────────────────────┘
```

**Responsive:** Left panel stacks above center on mobile (< `lg` breakpoint). Right panel stacks below. Right panel uses `sticky top-[108px]` (accounts for taller TopBar with context line).

### 5.1 TopBar

**Field labels:**
- "General Fund" (was "Total Budget") — $290M
- "Annual Budget Gap" (was "Deficit to Close") — $33M
- "Remaining Gap" — dynamic

**Context line** (persistent, small, below stats row):
> "This tool focuses on the yearly budget gap. Long-term obligations like pensions are not included but are affected by some choices."

### 5.2 SpendingPanel (Left)

- Stacked multi-color bar at top showing budget proportions
- 8 category rows: dot + name + optional impact badge + % + horizontal bar
- Impact badge: 1 lever = low (gray), 2 = medium (yellow), 3+ = high (orange)
- Hover tooltip shows description and dollar amount

### 5.3 LeversPanel (Center)

- `PortfolioSelector` at top (collapsible)
- **"How is Berkeley's budget currently balanced?" explainer** (collapsible amber box):
  - Using savings (reserves and pension stabilization funds)
  - Moving money between funds (e.g., workers' comp reserves)
  - Delaying costs (deferred maintenance, reduced pension payments)
  - Footer: "These help now but do not fix the underlying gap."
- Four grouped lever sections (Revenue / Spending Changes / Structural Changes / Temporary & Timing)
- Required global sentence (amber box, bottom): *"Most pension costs come from past promises and don't go away quickly."*

### 5.4 LeverCard

**Simple mode:** `name_simple` + `description_simple` + signal badges + toggle

**Advanced mode adds:** `name_advanced`, `description_advanced`, impact range, confidence, timing, mechanism

**Card left border color by `type`:** blue (revenue), red (spending), purple (structural), orange (temporary)

**Signal badge color table:**

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

**Gap Status block:** large %, progress bar, "$Xm saved / $Ym gap left"

**Structural Balance block** *(new)*:
- ✔ green: "Balanced — Recurring revenues ≥ recurring costs"
- ✖ red: "Not balanced — [Gap is not fully closed | Relies on temporary measures]"
- Shows "No levers selected" when empty

**Today vs Tomorrow bars:** green (helps now) / blue (helps later) / orange (pushes cost forward) — each scaled against the full deficit

**Plan Composition block:** segmented bar + % rows for permanent/delayed/temporary + future pressure label

**Service Impact block:** affected categories with severity badges (only shown when categories are affected)

**Scenario Summary (`SummaryText`):** auto-generated text, up to 5 lines

---

## 6. Calculation Logic

All logic in `src/utils/calculations.js`, called by Zustand on every lever toggle.

### 6.1 Gap Closed

```
impact_min_total = Σ impact_min (active levers)
impact_max_total = Σ impact_max (active levers)
gap_closed_pct   = (impact_min_total / deficit) × 100
```

Conservative: uses `impact_min` for the gap-closed percentage.

### 6.2 Composition (dollar-weighted, floored at 0)

```
structural_share = (permanent_impact + partial_impact) / positive_total
temporary_share  = temporary_impact / positive_total
delayed_share    = delayed_impact / positive_total
```

### 6.3 Today vs Tomorrow Buckets

```
helps_now      = Σ impact_min where now_effect ∈ {high, medium} AND later_effect ≠ hurts
helps_later    = Σ impact_min where fix_type == delayed OR (now_effect == none AND later_effect == helps)
pushes_forward = Σ impact_min where later_effect == hurts
```

### 6.4 Structural Balance

```
structurally_balanced = temporary_share < 0.2 AND gap_closed_pct >= 100
```

A plan is structurally balanced when it fully closes the gap **and** does so without heavy reliance on temporary measures (< 20% of impact from temporary levers).

### 6.5 Future Pressure

```
hasMajorDeferral = any of [section_115, skip_pension, capital_deferral, fund_balance, restricted_transfer] is active

if (temporary_share > 0.4 OR hasMajorDeferral) → "high"
else if (temporary_share > 0.2 OR delayed_share > 0.3) → "medium"
else → "low"
```

### 6.6 Warnings

| Key | Trigger | Message |
|-----|---------|---------|
| `not_structural` | `gap_closed_pct >= 80 AND NOT structurally_balanced` | "This plan does not fix the underlying deficit." |
| `too_temporary` | `temporary_share > 0.5` | "This plan mainly uses savings or delays costs — it doesn't fix the structural problem." |
| `future_pressure` | `future_pressure == "high"` | "This will make future budgets harder to balance." |
| `low_confidence` | low-confidence levers > 40% of active count | "Some estimates are uncertain — actual savings may vary significantly." |
| `too_delayed` | `delayed_share > 0.3` | "Much of this plan's savings won't materialize for 1–3 years." |

`not_structural` takes display precedence over `too_temporary` and `future_pressure` warnings.

### 6.7 Dominant Type (summary text)

```
structural_share > 0.6  → "permanent"
temporary_share  > 0.5  → "temporary"
delayed_share    > 0.4  → "delayed"
else                    → "mixed"
```

---

## 7. Summary Text

Auto-generated, up to 5 lines, shown in the right panel:

1. Gap closed % range + dollar range (bold)
2. Dominant approach type
3. Top affected categories (if any)
4. Future budget trajectory
5. Structural balance verdict (if `gap_closed_pct >= 80`)

---

## 8. Language Constraints

### Allowed in Simple View
- "helps now" / "helps later"
- "temporary" / "permanent"
- "makes future harder"
- "structurally balances the budget" / "does not fix the underlying deficit"
- Dollar ranges and percentages

### Forbidden in Simple View
- actuarial, amortization, GASB, liability structure, unfunded liability (as jargon)
- Technical pension accounting terminology

### Required Global Sentence
Displayed persistently in the levers panel:
> "Most pension costs come from past promises and don't go away quickly."

### Required Context Line
Displayed in TopBar:
> "This tool focuses on the yearly budget gap. Long-term obligations like pensions are not included but are affected by some choices."

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
| Structurally balanced | green ✔, green border |
| Not structurally balanced | red ✖, red border |
| Future pressure: high | red label |
| Future pressure: medium | yellow label |
| Future pressure: low | green label |

**Berkeley brand colors** (Tailwind custom tokens):
- `berkeley-blue`: `#003262` — headers, selected states, primary actions
- `berkeley-gold`: `#FDB515` — Advanced mode toggle when on
- `berkeley-blue-mid`: `#3B7EA1` — secondary blue tones

---

## 10. State Management

Zustand store (`src/store/useStore.js`):

| Field | Type | Description |
|-------|------|-------------|
| `selectedLevers` | `string[]` | IDs of active levers |
| `advancedMode` | `boolean` | Simple vs Advanced card display |
| `scenario` | `ScenarioState` | Derived, recomputed eagerly on every toggle |

Actions: `toggleLever(id)`, `toggleAdvancedMode()`, `applyPortfolio(portfolioId)`, `clearAll()`

---

## 11. Deployment

### GitHub Pages via Actions

`.github/workflows/deploy.yml` triggers on push to `main` or `master`:
1. `actions/checkout@v4` → `actions/setup-node@v4` (Node 20)
2. `npm ci` → `npm run build` → outputs to `dist/`
3. `actions/upload-pages-artifact@v3` → `actions/deploy-pages@v4`

**Required:** GitHub Pages source set to "GitHub Actions" (Settings → Pages → Source).

### Build output

```
dist/index.html          ~0.8 kB gzip
dist/assets/index-*.css  ~23 kB raw / 4.7 kB gzip
dist/assets/index-*.js   ~195 kB raw / 61 kB gzip
```

Total transfer: ~66 kB gzip.

---

## 12. Implementation Phases

### Phase 1 — MVP (complete)
- General Fund baseline ($290M) / structural annual gap ($33M)
- 19 levers across 4 groups with `solution_type` field
- 10 portfolio presets including Status Quo, Structural Balance, Delay the Problem
- Structural balance indicator (✔/✖) in right panel
- `not_structural` warning in summary text
- "How is Berkeley's budget currently balanced?" explainer panel
- Simple + Advanced mode toggle
- GitHub Pages deployment via Actions

### Phase 2 — Data Refinement
- Update impact ranges from CAFR and budget documents
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
5. Understand whether their plan **structurally balances** the budget

The tool succeeds if a non-expert user, after 5 minutes of exploration, can articulate:
- Why the "Status Quo" preset shows ✖ (not structurally balanced)
- Why the "Structural Balance" preset shows ✔
- What the difference is between those two approaches
