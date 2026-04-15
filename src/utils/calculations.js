/**
 * A/B/C prioritization calculation engine.
 * All dollar amounts are raw numbers (e.g. 12000000 = $12M).
 * All percentages are in percent form (e.g. 12.5 = 12.5%).
 */

export function formatMoney(amount) {
  const abs = Math.abs(amount)
  const sign = amount < 0 ? '-' : ''
  if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(1)}B`
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}K`
  return `${sign}$${abs}`
}

export function formatPct(value, decimals = 0) {
  return `${value.toFixed(decimals)}%`
}

export function getSeverity(additionalCutPct) {
  if (additionalCutPct < 5) return 'Low'
  if (additionalCutPct < 15) return 'Medium'
  if (additionalCutPct < 30) return 'High'
  return 'Extreme'
}

/**
 * Core A/B/C calculation.
 *
 * @param {Array} departments - array of department objects
 * @param {'tax'|'no-tax'} scenario
 * @param {Object} selections - { [deptId]: 'A'|'B'|'C' }
 * @returns {Object} derived metrics
 */
export function calculateABC(departments, scenario, selections) {
  const getBaselineCutPct = (dept) =>
    scenario === 'no-tax' ? dept.cutNoTaxPct : dept.cutWithTaxPct

  const A_depts = departments.filter((d) => (selections[d.id] ?? 'B') === 'A')
  const B_depts = departments.filter((d) => (selections[d.id] ?? 'B') === 'B')
  const C_depts = departments.filter((d) => (selections[d.id] ?? 'B') === 'C')

  // Savings the Manager expected from A departments — now removed
  const removedSavings = A_depts.reduce(
    (sum, d) => sum + (d.baseBudget * getBaselineCutPct(d)) / 100,
    0
  )

  // C pool absorbs the removed savings
  const C_total_budget = C_depts.reduce((sum, d) => sum + d.baseBudget, 0)

  // Additional cut required across C departments (in %)
  const additionalCutPct =
    C_total_budget > 0 ? (removedSavings / C_total_budget) * 100 : 0

  // Budget totals by state
  const totalBudget = departments.reduce((s, d) => s + d.baseBudget, 0)
  const A_budget = A_depts.reduce((s, d) => s + d.baseBudget, 0)
  const B_budget = B_depts.reduce((s, d) => s + d.baseBudget, 0)
  const C_budget = C_total_budget

  const A_pct = totalBudget > 0 ? (A_budget / totalBudget) * 100 : 0
  const B_pct = totalBudget > 0 ? (B_budget / totalBudget) * 100 : 0
  const C_pct = totalBudget > 0 ? (C_budget / totalBudget) * 100 : 0

  // Total baseline savings across all departments (for context)
  const totalBaselineSavings = departments.reduce(
    (sum, d) => sum + (d.baseBudget * getBaselineCutPct(d)) / 100,
    0
  )

  // A share for constraint warnings
  const A_share = departments.length > 0 ? A_depts.length / departments.length : 0

  const severity = getSeverity(additionalCutPct)

  return {
    A_depts,
    B_depts,
    C_depts,
    A_budget,
    B_budget,
    C_budget,
    A_pct,
    B_pct,
    C_pct,
    totalBudget,
    totalBaselineSavings,
    removedSavings,
    C_total_budget,
    additionalCutPct,
    A_count: A_depts.length,
    B_count: B_depts.length,
    C_count: C_depts.length,
    A_share,
    severity,
  }
}
