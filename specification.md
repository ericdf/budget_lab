# Berkeley Budget Lab — Product Specification

> **Status:** Implemented and deployed  
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
- Surface what services users care about protecting and flag conflicts

**Core questions the tool forces the user to answer:**
> "Am I fixing the problem — or pushing it forward?"  
> "Does this plan structurally balance the budget?"  
> "What do I want to protect?"

This tool is a **structured decision interface**, not a budget simulator. It does not model second-order effects, multi-year compounding, or precise fiscal projections.

### Solution Type Model

There are three types of budget solutions, distinguished throughout the tool:

| Solution Type | Description | Examples |
|--------------|-------------|---------|
| **Structural fix** | Changes ongoing balance between recurring revenues and costs | Spending cuts, service level reductions, labor restraint |
| **Temporary fix** | Uses savings or shifts timing without changing the underlying balance | Drawing reserves, deferring capital, pension fund draw-downs |
| **External funding** | Brings in new revenue from outside the existing base | Tax increases, fee increases, voter-approved measures |

The key distinction is: **structural fixes** and **external funding** can produce a structurally balanced budget. **Temporary fixes** cannot — they borrow against the future.

### Delivery Model Dimension

Some structural levers change *who delivers* a service, not just how much it costs:

| Delivery Model | Meaning |
|---------------|---------|
| `city_operated` | Default — city employees provide the service |
| `contracted` | Private contractor under competitive bid |
| `concession` | Private operator runs it under long-term lease; city collects rent |
| `eliminated` | City exits; county or other entity absorbs responsibility |

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
│   ├── budget.json              # General Fund total, gap, categories + reduction_capacity
│   ├── levers.json              # All 24 policy levers with full metadata
│   ├── portfolios.json          # 13 preset lever combinations
│   └── services.json            # 10 Berkeley services with funding/delivery model
├── store/
│   └── useStore.js              # Zustand store: selectedLevers, advancedMode,
│                                #   protectedCategories, scenario
├── utils/
│   └── calculations.js          # calculateScenario(), formatMoney(), formatPct()
└── components/
    ├── TopBar.jsx               # Sticky header: budget stats + progress bar + mode toggle
    ├── SpendingPanel.jsx        # Left: category bars, protect toggles, reduction capacity
    ├── LeversPanel.jsx          # Center: grouped lever cards + portfolio selector + explainer
    ├── LeverCard.jsx            # Individual lever card with toggle, badges, advanced fields
    ├── PortfolioSelector.jsx    # Preset scenario buttons (collapsible)
    ├── ImpactPanel.jsx          # Right: gap meter, structural balance, today/tomorrow,
    │                            #   values alignment, plan composition, capital pressure
    └── SummaryText.jsx          # Auto-generated scenario summary + warnings
```

---

## 2. Data Model

### 2.1 Budget (`src/data/budget.json`)

```json
{
  "total_budget": 290000000,
  "deficit": 33000000,
  "infrastructure_backlog": 1650000000,
  "categories": [{
    "id": "string",
    "name": "string",
    "amount": number,
    "description": "string",
    "reduction_capacity": { "low": number, "medium": number, "high": number }
  }]
}
```

**Basis:** Berkeley General Fund (discretionary operating budget), approximate FY2025.  
**Deficit:** Structural annual gap of ~$33M (not the $124M all-funds figure).  
**Infrastructure backlog:** $1.65B estimated unfunded capital need.

`reduction_capacity` — fraction of category budget that could realistically be cut at each intensity level. Used for informational display in SpendingPanel advanced mode.

The 8 spending categories:

| ID | Name | Amount | % of GF | Cut capacity (low/med/high) |
|----|------|--------|---------|----------------------------|
| `public_safety` | Public Safety | $104M | 36% | 3% / 5% / 10% |
| `pensions_debt` | Pensions & Debt | $40M | 14% | 0% / 0% / 2% |
| `public_works` | Public Works | $35M | 12% | 3% / 10% / 20% |
| `administration` | Administration | $33M | 11% | 5% / 15% / 25% |
| `health` | Health & Human Services | $27M | 9% | 5% / 15% / 25% |
| `community_services` | Community Services | $25M | 9% | 5% / 15% / 25% |
| `parks_rec` | Parks & Recreation | $18M | 6% | 5% / 15% / 25% |
| `other` | Other | $8M | 3% | 10% / 20% / 30% |

### 2.2 Service (`src/data/services.json`)

```json
{
  "id": "string",
  "label": "string",
  "funding_type": "general_fund | enterprise | mixed",
  "delivery_model": "city_operated | contracted | concession | eliminated",
  "general_fund_support": number,
  "enterprise_revenue": number
}
```

10 Berkeley services:

| ID | Label | Funding | GF Support | Enterprise Revenue |
|----|-------|---------|------------|-------------------|
| `police` | Police Services | general_fund | $80M | — |
| `fire` | Fire Services | general_fund | $24M | — |
| `street_maintenance` | Street Maintenance | general_fund | $12M | — |
| `solid_waste` | Solid Waste & Recycling | enterprise | $0 | $61.3M |
| `marina` | Berkeley Marina | enterprise | $2M | $4M |
| `parking` | Parking Services | enterprise | $0 | $12M |
| `public_health_dept` | Public Health Department | general_fund | $15M | — |
| `mental_health` | Mental Health Services | general_fund | $8M | — |
| `library` | Public Library | general_fund | $13M | — |
| `rec_centers` | Recreation Centers & Aquatics | mixed | $8M | $3M |

**Enterprise fund rule:** Enterprise revenue is tied to the service. Reducing enterprise costs increases the fund surplus but does not automatically increase General Fund revenue — a conscious transfer must be made.

### 2.3 Lever (`src/data/levers.json`)

```json
{
  "id": "string",
  "name_simple": "string",
  "name_advanced": "string",
  "impact_min": number,             // General Fund impact only (not enterprise-only savings)
  "impact_max": number,
  "type": "revenue | spending | structural | temporary | capital",
  "solution_type": "fix | temporary | external",
  "now_effect": "high | medium | low | none | hurts",
  "later_effect": "helps | neutral | hurts",
  "fix_type": "permanent | temporary | delayed | partial",
  "confidence": "high | medium | low",
  "implementation": "immediate | delayed",
  "counts_toward_gap": boolean,     // false for capital and enterprise-only-no-pathway levers
  "counts_now": boolean,            // false for delayed levers; excluded from effective-now calculation
  "affects": ["category_id"],
  "impacts_services": ["service_id"],
  "description_simple": "string",
  "description_advanced": "string",
  "mechanism": "string",

  // Optional fields:
  "policy_assumption": "string",
  "pricing_basis": "formula | city_estimate | directional",
  "delivery_model": "contracted | concession | eliminated",
  "enterprise_revenue_retained": boolean,
  "enterprise_effect_type": "subsidy_reduction | margin_transfer | none",
  "general_fund_impact": number,
  "general_fund_impact_min": number,
  "general_fund_impact_max": number,
  "gf_pathway": "string",           // describes how enterprise savings reach the GF
  "capital_authorization": number,
  "nonlinear_effect": boolean,
  "short_term_cost_increase_possible": boolean,
  "service_domain": "public_safety",  // marks levers with nonlinear safety-staffing effects
  "attrition_risk": "low | medium | high",
  "pension_effect": "reduces_future_liability",
  "shares_budget_pool": "string",    // pool ID for overlap detection
  "overlaps_with": ["lever_id"],
  "mutually_exclusive_with": ["lever_id"]
}
```

**Field notes:**

- `impact_min/max` — **General Fund impact only**. Enterprise-only improvements that do not flow to the GF are excluded.
- `counts_toward_gap: false` — capital levers and enterprise-only levers with no GF pathway. These do not contribute to any gap metric.
- `counts_now: false` — delayed levers (e.g., compensation restraint, outsourcing) whose savings do not materialize in the current fiscal year. They contribute to "full potential" but not to `gap_closed_pct`.
- `now_effect` weights: `high=1.0, medium=0.7, low=0.4, none=0.0` — used in the weighted effective-now formula.
- `enterprise_effect_type`:
  - `subsidy_reduction` — GF saves by no longer subsidizing the enterprise fund (e.g., enterprise_fees, marina_concession)
  - `margin_transfer` — enterprise operational savings are explicitly transferred to GF (e.g., waste_outsource)
- `gf_pathway` — required when `enterprise_revenue_retained: true`; describes the mechanism by which enterprise savings reach the GF.
- `service_domain: "public_safety"` — levers affecting safety staffing where cuts may trigger overtime or accelerate attrition, reducing actual savings below nominal estimates.
- `attrition_risk: "high"` — levers that may cause sworn staff to leave. Triggers warning when ≥2 such levers are active.
- `pension_effect: "reduces_future_liability"` — improves long-term pension trajectory but does not affect current-year gap metrics.
- `shares_budget_pool` — levers drawing from the same spending pool. Triggers overlap warning when ≥3 `discretionary_spending` or ≥2 `reserves` levers are active.

**Budget pool IDs:**
- `discretionary_spending` — operating spending levers (across_the_board, targeted_reductions, vacancy_freeze, program_elimination, service_level_reduction, real_baseline)
- `reserves` — one-time draws (section_115, skip_pension, capital_deferral, fund_balance, restricted_transfer)
- `enterprise` — enterprise fund levers (enterprise_fees, waste_outsource, marina_concession)
- `voter_revenue` — measures requiring voter approval (sales_tax, parcel_tax)

**Enterprise fund rule:** Enterprise levers may affect the General Fund through two mechanisms:
1. **Subsidy reduction** — elimination of General Fund support for an enterprise fund
2. **Surplus transfer** — excess enterprise revenue made available to the GF through explicit policy choice

Enterprise improvements that stay within the enterprise fund (no GF pathway) must NOT be counted toward gap closure.

### 2.4 Scenario State (computed by `calculateScenario()`)

```js
{
  impact_min_total: number,        // Σ impact_min for ALL active levers (raw, unweighted)
  impact_max_total: number,        // Σ impact_max for ALL active levers
  effective_impact_now: number,    // Σ (impact_min × now_weight) for counts_now:true levers only
  potential_impact: number,        // Σ impact_min for counts_toward_gap:true levers (full potential)
  gap_closed_pct: number,          // effective_impact_now / deficit × 100  ← primary metric
  potential_gap_pct: number,       // potential_impact / deficit × 100       ← secondary metric
  structural_share: number,        // 0–1: permanent+partial impact / positive total
  temporary_share: number,         // 0–1: temporary impact / positive total
  delayed_share: number,           // 0–1: delayed impact / positive total
  helps_now: number,               // $ from levers with medium/high now_effect AND later ≠ hurts
  helps_later: number,             // $ from delayed levers OR (none now + helps later)
  pushes_forward: number,          // $ from levers where later_effect == hurts
  structurally_balanced: boolean,  // temporary_share < 0.2 AND gap_closed_pct >= 100
  future_pressure: "low|medium|high",
  warnings: string[],
  overlapping_pools: string[],     // pool IDs where ≥threshold levers are active
  categoryImpact: { [id]: count }, // number of active levers affecting each category
  topCategories: string[],         // top 3 most-affected category IDs
  dominantType: "permanent|temporary|delayed|mixed",
  activeCount: number,
  scenario_viability: {
    closes_gap_now: boolean,              // gap_closed_pct >= 100
    mostly_structural: boolean,           // structural_share >= 0.6
    high_uncertainty: boolean,            // low-confidence levers > 40% of active
    overlapping_levers: boolean,
    relies_on_enterprise_transfer: boolean,
    overall: "weak | plausible | strong"
  }
}
```

### 2.5 Portfolio (`src/data/portfolios.json`)

```json
{ "id": "string", "name": "string", "description": "string", "default_levers": ["lever_id"] }
```

---

## 3. Lever Catalog (24 levers)

Dollar amounts = **estimated annual fiscal impact** on the General Fund, calibrated to the $33M gap.

### Revenue — `solution_type: "external"` (5)

| ID | Simple Name | Impact Range | Now | Later | Fix Type | Conf | counts_now | Policy Assumption |
|----|-------------|-------------|-----|-------|----------|------|------------|-------------------|
| `sales_tax` | Raise Sales Tax | $9M–$10M | high | helps | permanent | high | ✔ | 0.5% transactions and use tax; simple majority |
| `parcel_tax` | Add a Parcel Tax | $6M–$10M | high | helps | permanent | medium | ✔ | $240–$400/parcel; 2/3 majority |
| `fee_increases` | Raise City Fees | $2M–$4M | medium | helps | permanent | high | 15–25% fee increase |
| `let_expire` | Accept Expiring Revenue | $0 | **hurts** | helps | permanent | high | — |
| `enterprise_fees` | Update Fees to Cover Costs | $2M–$6M | low | helps | permanent | medium | Cost-of-service study + Prop 218 |

`let_expire` — `counts_toward_gap: false`, `counts_now: false`; discipline choice, no dollar impact.  
`enterprise_fees` — `enterprise_effect_type: "subsidy_reduction"`; `counts_now: false` (implementation delayed); GF impact $2M–$6M via subsidy reduction pathway.

### Spending — `solution_type: "fix"` (5)

| ID | Simple Name | Impact Range | Now | Later | Fix Type | Conf | Notes |
|----|-------------|-------------|-----|-------|----------|------|-------|
| `across_the_board` | Cut All Departments Equally | $3M–$6M | high | helps | permanent | high | |
| `targeted_reductions` | Cut Lower-Priority Programs | $2M–$5M | medium | helps | permanent | medium | |
| `reduce_council_staff` | Reduce Council and Mayoral Staff | $0.3M–$1.3M | low | helps | permanent | high | Symbolic + real |
| `vacancy_freeze` | Freeze Hiring | $1M–$3M | medium | helps | **partial** | high | `nonlinear_effect: true` |
| `program_elimination` | Eliminate Programs | $3M–$6M | medium | helps | permanent | medium | |

`vacancy_freeze` — partial fix; safety vacancies often covered by overtime, so actual savings may be lower than projected.

### Structural — `solution_type: "fix"` (8)

| ID | Simple Name | Impact Range | Now | Later | Fix Type | Conf | Delivery |
|----|-------------|-------------|-----|-------|----------|------|---------|
| `real_baseline` | Budget Based on Real Costs | $6M–$12M | medium | helps | permanent | medium | — |
| `outsourcing` | Outsource Some Services | $1M–$3M | low | helps | delayed | **low** | contracted |
| `waste_outsource` | Contract Out Waste Collection | $1M–$3M | low | helps | delayed | **low** | contracted |
| `marina_concession` | Lease Out the Marina | $1M–$3M | low | helps | delayed | **low** | concession |
| `shift_to_county` | Shift Programs to County | $1M–$2M | low | helps | delayed | **low** | eliminated |
| `health_shift_county` | Transfer Health Dept to County | $3M–$7M | low | helps | delayed | **low** | eliminated |
| `service_level_reduction` | Reduce Service Levels | $2M–$4M | medium | helps | permanent | medium | `nonlinear_effect: true` |
| `compensation_restraint` | Hold Down Raises | $2M–$5M | **none** | helps | delayed | **low** | — |

`waste_outsource` — `enterprise_effect_type: "margin_transfer"`; GF pathway: "reduced operating cost with fees held constant; surplus transferred to GF."  
`marina_concession` — `enterprise_effect_type: "subsidy_reduction"`; GF pathway: "elimination of GF subsidy plus concession payment."  
`health_shift_county` — Berkeley is the only Alameda County city with its own health department.  
`compensation_restraint` — `counts_now: false`; `attrition_risk: "high"`; `pension_effect: "reduces_future_liability"`.  
`service_level_reduction` — `service_domain: "public_safety"`; `attrition_risk: "high"`.  
`vacancy_freeze` — `service_domain: "public_safety"`; `attrition_risk: "high"`; safety vacancies often backfilled by overtime.

### Temporary / Timing — `solution_type: "temporary"` (5)

All temporary levers: `counts_toward_gap: true`, `counts_now: true`, `shares_budget_pool: "reserves"`.

| ID | Simple Name | Impact Range | Now | Later | Fix Type | Conf |
|----|-------------|-------------|-----|-------|----------|------|
| `section_115` | Use Pension Reserve Fund | $3M–$6M | high | **hurts** | **temporary** | high |
| `skip_pension` | Reduce Pension Contributions | $1M–$3M | medium | **hurts** | **temporary** | medium |
| `capital_deferral` | Delay Capital Projects | $2M–$5M | medium | **hurts** | **temporary** | medium |
| `fund_balance` | Use Reserves | $3M–$6M | high | **hurts** | **temporary** | high |
| `restricted_transfer` | Use Funds Set Aside for Other Purposes | $3M–$5M | medium | **hurts** | **temporary** | high |

`restricted_transfer` — diverting restricted fund balances (e.g., workers' comp reserves); documented Berkeley practice.

### Capital & Infrastructure — `solution_type: "external"` (1)

| ID | Simple Name | Operating Impact | Capital Authorized | Conf | Assumption |
|----|-------------|-----------------|-------------------|------|-----------|
| `infrastructure_bond` | Pass Infrastructure Bond Measure | **$0** | $300M | medium | $300M GO bond; 55% threshold |

Capital levers: `counts_toward_gap: false`, `counts_now: false`, `impact_min: 0`, `impact_max: 0`.  
Bond proceeds are legally restricted to capital — **no contribution to operating gap closure**.  
Bond benefits appear only in the Capital Pressure and Future Pressure panels.

---

## 4. Portfolio Presets (13)

| ID | Name | Levers | Effective now (approx) |
|----|------|--------|------------------------|
| `keep_everything` | Keep Everything Running | sales_tax, parcel_tax, fee_increases, vacancy_freeze | ~53% |
| `protect_core` | Protect Core Services | targeted_reductions, vacancy_freeze, fee_increases, program_elimination | ~19% |
| `efficiency_first` | Efficiency First | vacancy_freeze, outsourcing, compensation_restraint, across_the_board | ~14% |
| `structural_reform` | Structural Reform | outsourcing, shift_to_county, service_level_reduction, compensation_restraint | ~4% |
| `spend_less` | Spend Less Overall | program_elimination, across_the_board, vacancy_freeze, service_level_reduction | ~21% |
| `use_savings` | Use Savings to Get Through | section_115, capital_deferral, fund_balance | ~25% |
| `balanced` | Balanced Approach | sales_tax, targeted_reductions, service_level_reduction, vacancy_freeze | ~38% |
| `status_quo` | Status Quo (Current Approach) | section_115, restricted_transfer, fund_balance | ~25% |
| `structural_balance` | Structural Balance | targeted_reductions, enterprise_fees, sales_tax | ~32% |
| `delay_problem` | Delay the Problem | section_115, capital_deferral, fund_balance, skip_pension | ~33% |
| `close_the_gap` | Close the Gap | sales_tax, parcel_tax, targeted_reductions, real_baseline | ~62% (potential 70%) |
| `protect_services` | Protect Services | sales_tax, parcel_tax, fee_increases, compensation_restraint, real_baseline | ~53% |
| `shift_delivery` | Shift Delivery Model | waste_outsource, marina_concession, health_shift_county, outsourcing | ~0% now (fully delayed) |

**Note on "Close the Gap":** The preset demonstrates a realistic combination of the two major available revenue increases plus two structural fixes. With the weighted effective-now formula, even this aggressive combination reaches ~62% — reflecting that the spending-side levers operate at medium timing weight and structural changes take time to materialize. Reaching 100%+ requires additional near-term levers or accepting the full potential (~70%) plays out over time.

Portfolio detection is **exact-match**: a preset is highlighted only when `selectedLevers` contains exactly the same IDs as `default_levers`.

Portfolio detection is **exact-match**: a preset is highlighted only when `selectedLevers` contains exactly the same IDs as `default_levers`.

---

## 5. UI Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  TOP BAR (sticky)                                               │
│  Title | General Fund | Annual Budget Gap | Remaining Gap       │
│                    Progress bar         ↓ Export   Simple/Adv ◉ │
│  Context: "This tool focuses on the yearly budget gap..."       │
├────────────────┬───────────────────────┬────────────────────────┤
│  LEFT          │  CENTER               │  RIGHT                 │
│  Spending      │  Portfolio Selector   │  Gap Status            │
│  Overview      │  ─────────────────── │  Structural Balance ✔✖ │
│                │  Current approach     │  Values Alignment      │
│  8 categories  │  explainer (collapse) │  Today vs Tomorrow     │
│  bar chart     │  ─────────────────── │  Plan Composition      │
│  w/ protect 🛡 │  Revenue levers       │  Service Impact        │
│  toggles       │  Spending levers      │  Capital Pressure      │
│  + reduction   │  Structural levers    │  ─────────────────── │
│  capacity      │  Temp/Timing levers   │  Scenario Summary      │
│  (advanced)    │  Capital levers       │  + Warnings            │
│                │  ─────────────────── │                        │
│                │  Pension note         │                        │
└────────────────┴───────────────────────┴────────────────────────┘
│  FOOTER                                                         │
└─────────────────────────────────────────────────────────────────┘
```

**Responsive:** Left panel stacks above center on mobile (< `lg` breakpoint). Right panel stacks below. Right panel uses `sticky top-[108px]`.

### 5.1 TopBar

**Field labels:**
- "General Fund" — $290M
- "Annual Budget Gap" — $33M
- "Remaining Gap" — dynamic

**Controls (top-right):**
- **↓ Export** button — dropdown offering "Download PDF" and "Download PNG"; disabled until ≥1 lever selected. PDF uses jsPDF (lazy-loaded); PNG captures `#impact-panel-capture` via html-to-image (lazy-loaded, 2× pixel ratio).
- **Simple/Advanced toggle** — switches all lever cards between `name_simple`/`description_simple` and `name_advanced`/`description_advanced` plus extra metadata fields.

**Context line** (persistent, small):
> "This tool focuses on the yearly budget gap. Long-term obligations like pensions are not included but are affected by some choices."

### 5.2 SpendingPanel (Left)

- Stacked multi-color bar at top showing budget proportions
- 8 category rows with:
  - **🛡 protect toggle** — click to mark service as protected; row highlights blue when protected
  - Color dot + name
  - ⚠ badge when protected AND active levers affect this category
  - Impact badge (low/med/high) when not in conflict
  - % of budget
  - Horizontal bar
- **Advanced mode adds:** reduction capacity row per category (Low: X% · Med: Y% · High: Z% · $amount)
- Hover tooltip: description, dollar amount, cut capacity range
- Footer: "Click 🛡 to mark services you want to protect. Levers that affect protected areas will be flagged."

### 5.3 LeversPanel (Center)

- `PortfolioSelector` at top (collapsible)
- **"How is Berkeley's budget currently balanced?" explainer** (collapsible amber box):
  - Using savings (reserves and pension stabilization funds)
  - Moving money between funds (e.g., workers' comp reserves)
  - Delaying costs (deferred maintenance, reduced pension payments)
  - Footer: "These help now but do not fix the underlying gap."
- **Five grouped lever sections:**
  - Revenue (blue)
  - Spending Changes (red)
  - Structural Changes (purple)
  - Temporary / Timing Tools (orange)
  - **Capital & Infrastructure (teal)**
- Required global sentence (amber box, bottom): *"Most pension costs come from past promises and don't go away quickly."*

### 5.4 LeverCard

**Simple mode:** `name_simple` + `description_simple` + signal badges + toggle

**Advanced mode adds:**
- `name_advanced`, `description_advanced`
- Impact range (`impact_min`–`impact_max`)
- Capital authorized (if `capital_authorization` present)
- Confidence
- Timing (immediate / delayed)
- Assumption (`policy_assumption` if present)
- Estimate basis (`pricing_basis` if present): formula-derived / city estimate / directional
- Delivery model (if `delivery_model` present)
- Enterprise savings note (if `enterprise_revenue_retained` present)
- How it works (`mechanism`)

**Conflict / nonlinear warnings (always visible when applicable):**
- `⚠ Affects protected: [category names]` — when lever affects a protected category
- `⚠ Vacancies in safety depts are often covered by overtime...` — when `nonlinear_effect: true` and `short_term_cost_increase_possible: true`
- `⚠ Reductions here can trigger offsetting costs...` — when `nonlinear_effect: true` only

**Card left border color by `type`:**
- blue (revenue), red (spending), purple (structural), orange (temporary), **teal (capital)**
- Amber when selected AND conflicts with a protected category

**Signal badge color table:**

| Signal | Value | Color |
|--------|-------|-------|
| Now | high | green |
| Now | medium | lime |
| Now | low | gray |
| Now | none | gray |
| Now | hurts | red |
| Later | ✓ | blue |
| Later | ~ | gray |
| Later | ✗ | orange |
| Fix | permanent | green |
| Fix | temporary | orange |
| Fix | delayed | blue |
| Fix | partial | yellow |

### 5.5 ImpactPanel (Right)

**Gap Status block:** large %, progress bar, "$Xm saved / $Ym gap left"

**Structural Balance block:**
- ✔ green: "Balanced — Recurring revenues ≥ recurring costs"
- ✖ red: "Not balanced — [Gap is not fully closed | Relies on temporary measures]"
- "No levers selected" when empty

**Values Alignment block** *(only shown when ≥1 category protected)*:
- Lists each protected category with ✔ clear / ⚠ conflict badge
- ✕ button to remove protection
- Summary note if any conflicts exist
- "Some active levers affect services you want to protect."

**Today vs Tomorrow bars:** green (helps now) / blue (helps later) / orange (pushes cost forward) — each scaled against the full deficit

**Plan Composition block:** segmented bar + % rows for permanent/delayed/temporary + future pressure label

**Service Impact block:** affected categories with severity badges (only shown when categories are affected)

**Capital Pressure block** *(always visible, teal border)*:
- "Infrastructure backlog: $1.65B"
- If `infrastructure_bond` active: "Bond measure: −$300M" + progress bar showing % addressed
- "Still unfunded: $Xm"
- Note: "Capital spending doesn't close the annual gap — but deferring it makes future budgets harder."

**Scenario Viability block** *(only shown when ≥1 lever active)*:
- Color-coded overall rating: **Weak** (red) / **Plausible** (yellow) / **Strong** (green)
- Four checklist rows: Closes gap near-term / Mostly structural fixes / Low uncertainty / No significant overlap
- Path-to-balance note when gap not closed: "To close the remaining gap, a plan typically requires a major revenue increase, a significant service reduction package, a delivery model shift, or a combination."

**Scenario Summary (`SummaryText`):** auto-generated text, up to 5 lines

---

## 6. Calculation Logic

All logic in `src/utils/calculations.js`, called by Zustand on every lever toggle.

### 6.1 Gap Closed

Two gap metrics are computed:

```
// Primary: effective near-term impact (weighted by timing)
now_weight       = { high: 1.0, medium: 0.7, low: 0.4, none: 0.0, hurts: 0.0 }
effective_impact_now = Σ (impact_min × now_weight) for levers where counts_now == true
gap_closed_pct   = effective_impact_now / deficit × 100

// Secondary: full potential if all measures play out
potential_impact = Σ impact_min for levers where counts_toward_gap == true
potential_gap_pct = potential_impact / deficit × 100
```

**Why two metrics:** `gap_closed_pct` reflects what is realistically achievable in the current fiscal year. Delayed levers (outsourcing, compensation restraint, structural reforms) require 1–3 years before savings materialize and are excluded from the primary metric. Capital levers (`counts_toward_gap: false`) are excluded entirely. The secondary metric shows the ceiling if all measures are successfully implemented.

The UI displays `gap_closed_pct` as the large percentage in the Gap Status block. `potential_gap_pct` appears below the progress bar when it exceeds the primary metric by more than 5 percentage points.

### 6.2 Composition (dollar-weighted, counts_toward_gap levers only)

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

A plan is structurally balanced when it fully closes the gap on the effective-now basis **and** does so without heavy reliance on temporary measures (< 20% of impact from temporary levers).

### 6.5 Future Pressure

```
hasMajorDeferral = any of [section_115, skip_pension, capital_deferral, fund_balance, restricted_transfer] is active

if (temporary_share > 0.4 OR hasMajorDeferral) → "high"
else if (temporary_share > 0.2 OR delayed_share > 0.3) → "medium"
else → "low"
```

### 6.6 Overlap Detection

```
poolCounts = count of active levers per shares_budget_pool value

overlap triggers when:
  - "discretionary_spending" pool: ≥ 3 active levers
  - "reserves" pool: ≥ 2 active levers
  - any other pool: ≥ 2 active levers
```

### 6.7 Scenario Viability

```
closes_gap_now        = gap_closed_pct >= 100
mostly_structural     = structural_share >= 0.6
high_uncertainty      = low_confidence_share > 0.4
overlapping_levers    = has_overlap (from §6.6)
relies_on_enterprise  = any active lever has enterprise_effect_type == "margin_transfer"

overall:
  "strong"    if closes_gap_now AND mostly_structural AND NOT high_uncertainty AND NOT has_overlap
  "plausible" if gap_closed_pct >= 80 AND structural_share >= 0.4 AND NOT has_overlap
  "weak"      otherwise
```

### 6.8 Warnings

| Key | Trigger | Message |
|-----|---------|---------|
| `not_structural` | `gap_closed_pct >= 80 AND NOT structurally_balanced` | "This plan does not fix the underlying deficit." |
| `too_temporary` | `temporary_share > 0.5` | "This plan mainly uses savings or delays costs — it doesn't fix the structural problem." |
| `future_pressure` | `future_pressure == "high"` | "This will make future budgets harder to balance." |
| `low_confidence` | low-confidence levers > 40% of active count | "Some estimates are uncertain — actual savings may vary significantly." |
| `too_delayed` | `delayed_share > 0.3` | "Much of this plan's savings won't materialize for 1–3 years." |
| `overlap` | `has_overlap == true` | "These selections draw from overlapping spending areas. Combined savings may be overstated." |
| `attrition_risk` | ≥2 active levers with `attrition_risk: "high"` AND `service_domain: "public_safety"` | "This plan increases risk of additional staffing losses, which could reduce actual savings." |
| `safety_threshold` | ≥2 active levers with `service_domain: "public_safety"` AND `nonlinear_effect: true` | "Public safety staffing may fall below operational thresholds, leading to disproportionate service degradation." |

`not_structural` takes display precedence over `too_temporary` and `future_pressure` warnings.

### 6.9 Dominant Type (summary text)

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

## 8. State Management

Zustand store (`src/store/useStore.js`):

| Field | Type | Description |
|-------|------|-------------|
| `selectedLevers` | `string[]` | IDs of active levers |
| `advancedMode` | `boolean` | Simple vs Advanced card display |
| `protectedCategories` | `string[]` | Category IDs marked as protected by user |
| `scenario` | `ScenarioState` | Derived, recomputed eagerly on every toggle |

Actions: `toggleLever(id)`, `toggleAdvancedMode()`, `applyPortfolio(portfolioId)`, `clearAll()`, `toggleProtect(categoryId)`

---

## 9. Language Constraints

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

## 10. Visual Encoding

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
| Capital lever | teal border |
| Protected category | blue tint, shield icon |
| Protected + conflict | amber ⚠ badge |
| Lever conflicts with protect | amber border + warning text |

**Berkeley brand colors** (Tailwind custom tokens):
- `berkeley-blue`: `#003262` — headers, selected states, primary actions
- `berkeley-gold`: `#FDB515` — Advanced mode toggle when on
- `berkeley-blue-mid`: `#3B7EA1` — secondary blue tones

---

## 11. Deployment

### GitHub Pages via Actions

`.github/workflows/deploy.yml` triggers on push to `main` or `master`:
1. `actions/checkout@v4` → `actions/setup-node@v4` (Node 20)
2. `npm ci` → `npm run build` → outputs to `dist/`
3. `actions/upload-pages-artifact@v3` → `actions/deploy-pages@v4`

**Required:** GitHub Pages source set to "GitHub Actions" (Settings → Pages → Source).

---

## 12. Implementation Status

### Complete
- General Fund baseline ($290M) / structural annual gap ($33M)
- 24 levers across 5 groups (revenue, spending, structural, temporary, capital)
- 13 portfolio presets
- Structural balance indicator (✔/✖) in right panel
- `not_structural` warning in summary text
- "How is Berkeley's budget currently balanced?" explainer panel
- Simple + Advanced mode toggle
- Service protection layer (🛡 toggles, Values Alignment panel, lever conflict warnings)
- Services entity (`services.json`) with funding type and delivery model
- Delivery model dimension on structural levers (contracted / concession / eliminated)
- Enterprise fund annotation (savings retention rule, display in advanced mode)
- Revenue lever pricing basis and policy assumptions (advanced mode)
- Nonlinear effect warnings on vacancy freeze and service level reduction
- Reduction capacity per spending category (advanced mode in SpendingPanel)
- Capital Pressure panel ($1.65B backlog, bond measure progress)
- Export scenario as PDF (jsPDF) or PNG (html-to-image) — accessible from TopBar
- Weighted effective-now gap formula (`counts_now` + `now_weight` per lever)
- Enterprise fund pathway modeling (`enterprise_effect_type`, `gf_pathway`)
- Overlap detection and warning (`shares_budget_pool`)
- Attrition risk and public safety threshold warnings (`attrition_risk`, `service_domain`)
- Scenario Viability panel (weak / plausible / strong + checklist)
- Path-to-balance guidance when gap not closed
- GitHub Pages deployment via Actions

### Potential Next Steps
- Shareable scenario URLs (encode selected levers in URL hash)
- Add data source citations per lever (CAFR, budget documents)
- Public safety staffing attenuation factor in gap calculation (currently only warns, does not attenuate)
- City-specific configuration (swap data layer for other municipalities)

---

## 13. Success Criteria

A user should be able to:

1. Build a scenario in under 2 minutes
2. Understand the difference between fixing the problem and delaying it
3. Identify at least 2 alternative strategies with different tradeoff profiles
4. Recognize that high short-term savings can come with long-term costs
5. Understand whether their plan **structurally balances** the budget
6. See immediately when their chosen levers conflict with what they want to protect

The tool succeeds if a non-expert user, after 5 minutes of exploration, can articulate:
- Why the "Status Quo" preset shows ✖ (not structurally balanced)
- Why the "Structural Balance" preset shows ✔
- What the difference is between those two approaches
- Why outsourcing waste collection saves less General Fund money than expected
