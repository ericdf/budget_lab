## Berkeley Budget Lab — Overhaul Specification (A/B/C Prioritization Model)

---

## 0. Product Definition

### Core Function
Enable users to **translate budget tradeoffs into clear, actionable input to City Council**.

The tool:
- Anchors users in the City Manager’s real budget scenarios
- Forces **explicit prioritization**
- Produces **credible constituent input**:
  - what to protect  
  - where to accept cuts  
  - acknowledgment of consequences  

### Core Insight
> Protecting some services requires other services to absorb deeper reductions.

### Framing
- Voters decide: **tax vs no-tax**
- Regardless of outcome: **prioritization is required**
- Across-the-board reductions are treated as a **baseline approach**, not a neutral outcome

### Boundary
- **Council sets priorities**
- **City Manager implements**
- Tool models:
  - constituent → council priority communication
- Tool does not model:
  - program-level cuts
  - staffing decisions
  - operational feasibility

---

## 1. Core Model

### 1.1 Scenario Anchor

User selects:

- **Tax passes** → moderate reductions (Manager scenario)
- **Tax fails** → deeper reductions (Manager scenario)

These scenarios are **fixed numeric baselines** derived from the budget document.

---

### 1.2 Department States

Each department is assigned:

| State | Meaning |
|------|--------|
| **A** | Protected (avoid or reduce cuts) |
| **B** | Accept Manager baseline |
| **C** | Must absorb additional cuts |

---

### 1.3 Budget Mechanics

- Each department has a **baseline cut % (B)** from the Manager’s proposal
- Total savings under each scenario is **fixed**

Reallocation logic:

- Moving a department to **A**:
  - removes its baseline cut
- That removed savings must be reallocated to **C**
- Departments in **C** absorb additional cuts

No attempt is made to:
- distribute cuts within C
- model exact operational decisions

---

## 2. Data Model

### 2.1 Department

```ts
interface Department {
  id: string
  name: string

  baseBudget: number

  cutNoTaxPct: number
  cutWithTaxPct: number

  consequenceBaseline: string
  consequenceSevere: string
}
```

---

### 2.2 Derived Fields

```ts
baselineCutPct =
  scenario === "no-tax"
    ? cutNoTaxPct
    : cutWithTaxPct
```

---

### 2.3 User Selection

```ts
type State = "A" | "B" | "C"

interface Selection {
  [departmentId]: State
}
```

Default:
- all departments = **B**

---

### 2.4 Strategy Flags

Binary inputs:

```ts
interface StrategyFlags {
  outsourcingAllowed: boolean
  countyShiftAllowed: boolean
  adminReductionAllowed: boolean
}
```

Purpose:
- provide **qualitative relief to C burden**
- do not change arithmetic

## 3. Calculation Logic

### 3.1 Baseline Savings

```ts
baselineSavings = baseBudget * baselineCutPct
```

---

### 3.2 Savings Removed by A

```ts
removedSavings =
  sum(baselineSavings for departments in A)
```

---

### 3.3 C Pool

```ts
C_total_budget =
  sum(baseBudget for departments in C)
```

---

### 3.4 Additional Cut Required

```ts
additionalCutPct =
  removedSavings / C_total_budget
```

---

### 3.5 Final Interpretation

- A → cut reduced toward 0%
- B → baseline cut
- C → baseline + additionalCutPct

---

### 3.6 Outputs

- % of total budget in:
  - A
  - B
  - C
- additionalCutPct applied to C
- severity classification

---

## 4. Severity Model

Based on:
- size of C pool
- additionalCutPct

### Levels

| Level | Meaning |
|------|--------|
| Low | modest adjustments |
| Medium | significant reductions |
| High | major service loss likely |
| Extreme | service elimination likely |

---

## 5. Interaction Model

### Step 1 — Scenario Selection
- Tax passes
- Tax fails

---

### Step 2 — Assign Priorities

Each department row includes:

- A / B / C selector

Default:
- all B (Manager baseline)

---

### Step 3 — Strategy Options

Optional toggles:

- Outsourcing acceptable
- Shift some services to the county or other agencies
- Reduce council/manager staff to share the pain

---

## 6. UI Specification

### 6.1 Layout

```
Top: Scenario selection

Main panel:
  Department table

Right panel:
  Impact summary
```

---

### 6.2 Department Row

Displays:

- Department name
- Base budget
- Manager baseline cut %
- A / B / C buttons
- Inline consequence text

Behavior:

| State | Effect |
|------|-------|
| A | consequence removed |
| B | baseline consequence shown |
| C | severe consequence shown |

---

### 6.3 Visual Encoding

| State | Style |
|------|------|
| A | highlighted (protected) |
| B | neutral |
| C | emphasized (burdened) |

---

### 6.4 Inline Consequences

Each department includes:

- **Baseline (B)**:
  - normalized description of impact
- **Severe (C)**:
  - escalation (may include elimination)

Example:

Police:
- B: reduced patrol coverage, slower response
- C: major reduction in patrol capacity, potential unit elimination

## 7. Impact Panel

### 7.1 Budget Distribution

Show:
- % of total budget in A / B / C

---

### 7.2 C Burden

Display:
- additionalCutPct
- severity label

---

### 7.3 Interpretation Text

Examples:

- “Protecting selected services requires deeper reductions elsewhere.”
- “Cuts are concentrated in X% of the budget.”
- “This level of concentration may require eliminating services.”

---

## 8. Constraint Feedback

Soft constraint only.

### Progressive Warnings

Based on size of A:

- Moderate:
  “Many services are protected; remaining areas must absorb more cuts.”

- High:
  “Most services are protected; cuts will be concentrated.”

- Extreme:
  “Nearly all services are protected; remaining services may be eliminated.”

No blocking.

---

## 9. Strategy Effects

Strategy toggles modify interpretation. Labels:

- outsourcing → "outsourcing is acceptable"
- county shift → "shift some services to the county or other agencies"
- admin reduction → "reduce council/manager staff to share the pain"

Effects are qualitative only — they appear in the C burden note and in the email draft.
No precise dollar modeling required.

---

## 10. Communication Output

### CTA

“Send your priorities to City Council”

---

### Behavior

- Opens user’s email client
- Uses `mailto:`
- No automatic sending

---

### Draft Content

Includes:

- Scenario selected
- **Services to protect** (A) as a separate list
- **Services where cuts are accepted** (B and C) as a separate list, with C items noted as "accept deeper cuts"
- Strategy approaches (if any selected), as a bulleted list
- Explicit acknowledgment of tradeoffs
- Request:

> Direct the City Manager to return with a revised proposal reflecting these priorities.

Tone:
- warm
- collaborative
- specific

### C Burden Display

When C departments have additional burden, note that:
> The City Manager will identify operationally feasible cuts within C departments to make up the difference.

This reinforces the boundary: constituent sets priorities, Manager handles implementation.

---

## 11. Language Model

### Required Concepts

- prioritization is necessary
- tradeoffs are unavoidable
- protecting services shifts burden elsewhere

### Avoid

- operational detail
- technical fiscal jargon

---

## 12. Revision Tag (Build Identification)

### Requirement

UI footer must display:

- Git commit hash (short SHA)
- optional build timestamp

### Example

- `Revision: a1b2c3d`
- `a1b2c3d · Built Apr 15 2026`

### Behavior

- injected at build time
- updates on every deploy

---

## 13. Success Criteria

User can state:

- “Protecting one service requires deeper cuts elsewhere”
- “Tax vs no-tax changes the baseline, not the need to prioritize”
- “Cuts must be concentrated somewhere”
- “My choices imply real service consequences”

---

## 14. Implementation Constraints

- No optimization engine
- No solver
- No program-level modeling
- Deterministic arithmetic only
- Uses Manager’s real data as baseline

---

## 15. System Identity

This is a **prioritization and communication tool**, not a simulator.

Primary output:
- **clear, decision-ready input to City Council**
