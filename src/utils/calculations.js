/**
 * Core calculation engine.
 * All dollar amounts are in raw numbers (e.g. 12000000 = $12M).
 */

// Weights used to compute "effective impact now" from now_effect labels.
// Capital and delayed levers may have counts_now: false, zeroing them out entirely.
const NOW_WEIGHTS = {
  high:   1.0,
  medium: 0.7,
  low:    0.4,
  none:   0.0,
  hurts:  0.0, // negative effect; handled separately if needed
}

export function calculateScenario(selectedLevers, allLevers, deficit) {
  const active = allLevers.filter((l) => selectedLevers.includes(l.id))

  // ── Raw totals (all active levers, no weighting) ──────────────────────────
  const impact_min_total = active.reduce((sum, l) => sum + l.impact_min, 0)
  const impact_max_total = active.reduce((sum, l) => sum + l.impact_max, 0)

  // ── Effective impact now (weighted by timing and counts_now flag) ─────────
  // gap_closed_pct reflects savings that are realistic in the near term.
  // Delayed levers (counts_now: false) and capital levers are excluded.
  const effective_impact_now = active.reduce((sum, l) => {
    if (!l.counts_now) return sum
    const weight = NOW_WEIGHTS[l.now_effect] ?? 0
    return sum + l.impact_min * weight
  }, 0)
  const gap_closed_pct = deficit > 0 ? (effective_impact_now / deficit) * 100 : 0

  // Full potential (counts_toward_gap: true levers, unweighted) — shown as secondary metric
  const potential_impact = active
    .filter((l) => l.counts_toward_gap !== false)
    .reduce((sum, l) => sum + l.impact_min, 0)
  const potential_gap_pct = deficit > 0 ? (potential_impact / deficit) * 100 : 0

  // ── Composition by fix_type (based on impact_min of gap-counting levers) ──
  const byType = { permanent: 0, temporary: 0, delayed: 0, partial: 0 }
  for (const l of active) {
    if (l.counts_toward_gap === false) continue
    const key = l.fix_type in byType ? l.fix_type : 'partial'
    byType[key] += Math.max(0, l.impact_min)
  }
  const positiveTotal = Object.values(byType).reduce((s, v) => s + v, 0) || 1

  const structural_share = (byType.permanent + byType.partial) / positiveTotal
  const temporary_share = byType.temporary / positiveTotal
  const delayed_share = byType.delayed / positiveTotal

  // ── Today-vs-tomorrow buckets ─────────────────────────────────────────────
  const helps_now = active
    .filter((l) => ['high', 'medium'].includes(l.now_effect) && l.later_effect !== 'hurts')
    .reduce((s, l) => s + Math.max(0, l.impact_min), 0)

  const helps_later = active
    .filter((l) => l.fix_type === 'delayed' || (l.now_effect === 'none' && l.later_effect === 'helps'))
    .reduce((s, l) => s + Math.max(0, l.impact_min), 0)

  const pushes_forward = active
    .filter((l) => l.later_effect === 'hurts')
    .reduce((s, l) => s + Math.max(0, l.impact_min), 0)

  // ── Structural balance ────────────────────────────────────────────────────
  // Balanced when gap is fully closed (on effective-now basis) and not heavily
  // reliant on temporary measures.
  const structurally_balanced = temporary_share < 0.2 && gap_closed_pct >= 100

  // ── Future pressure ───────────────────────────────────────────────────────
  const hasMajorDeferral = active.some((l) =>
    ['section_115', 'skip_pension', 'capital_deferral', 'fund_balance', 'restricted_transfer'].includes(l.id)
  )
  let future_pressure = 'low'
  if (temporary_share > 0.4 || hasMajorDeferral) {
    future_pressure = 'high'
  } else if (temporary_share > 0.2 || delayed_share > 0.3) {
    future_pressure = 'medium'
  }

  // ── Overlap detection ─────────────────────────────────────────────────────
  const poolCounts = {}
  for (const l of active) {
    if (l.shares_budget_pool) {
      poolCounts[l.shares_budget_pool] = (poolCounts[l.shares_budget_pool] || 0) + 1
    }
  }
  const overlapping_pools = Object.entries(poolCounts)
    .filter(([pool, count]) => {
      if (pool === 'reserves') return count >= 2
      if (pool === 'discretionary_spending') return count >= 3
      return count >= 2
    })
    .map(([pool]) => pool)
  const has_overlap = overlapping_pools.length > 0

  // ── Attrition risk ────────────────────────────────────────────────────────
  const highRiskSafetyLevers = active.filter(
    (l) => l.attrition_risk === 'high' && l.service_domain === 'public_safety'
  )
  const attrition_warning = highRiskSafetyLevers.length >= 2

  // ── Public safety threshold ───────────────────────────────────────────────
  const activeSafetyCuts = active.filter(
    (l) => l.service_domain === 'public_safety' && l.nonlinear_effect
  )
  const safety_threshold_warning = activeSafetyCuts.length >= 2

  // ── Warnings ─────────────────────────────────────────────────────────────
  const warnings = []
  const low_conf_count = active.filter((l) => l.confidence === 'low').length
  const low_conf_share = active.length > 0 ? low_conf_count / active.length : 0

  if (temporary_share > 0.5) warnings.push('too_temporary')
  if (low_conf_share > 0.4) warnings.push('low_confidence')
  if (delayed_share > 0.3) warnings.push('too_delayed')
  if (future_pressure === 'high') warnings.push('future_pressure')
  if (gap_closed_pct >= 80 && !structurally_balanced) warnings.push('not_structural')
  if (has_overlap) warnings.push('overlap')
  if (attrition_warning) warnings.push('attrition_risk')
  if (safety_threshold_warning) warnings.push('safety_threshold')

  // ── Affected categories ───────────────────────────────────────────────────
  const categoryImpact = {}
  for (const l of active) {
    for (const catId of l.affects) {
      categoryImpact[catId] = (categoryImpact[catId] || 0) + 1
    }
  }

  const topCategories = Object.entries(categoryImpact)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id]) => id)

  const dominantType =
    structural_share > 0.6
      ? 'permanent'
      : temporary_share > 0.5
      ? 'temporary'
      : delayed_share > 0.4
      ? 'delayed'
      : 'mixed'

  // ── Scenario viability ────────────────────────────────────────────────────
  const mostly_structural = structural_share >= 0.6
  const high_uncertainty = low_conf_share > 0.4
  const relies_on_enterprise_transfer = active.some(
    (l) => l.enterprise_effect_type === 'margin_transfer'
  )

  let viability_overall
  if (
    gap_closed_pct >= 100 &&
    mostly_structural &&
    !high_uncertainty &&
    !has_overlap
  ) {
    viability_overall = 'strong'
  } else if (
    gap_closed_pct >= 80 &&
    structural_share >= 0.4 &&
    !has_overlap
  ) {
    viability_overall = 'plausible'
  } else {
    viability_overall = 'weak'
  }

  const scenario_viability = {
    closes_gap_now: gap_closed_pct >= 100,
    mostly_structural,
    high_uncertainty,
    overlapping_levers: has_overlap,
    relies_on_enterprise_transfer,
    overall: viability_overall,
  }

  return {
    impact_min_total,
    impact_max_total,
    effective_impact_now,
    potential_impact,
    potential_gap_pct,
    gap_closed_pct,
    structural_share,
    temporary_share,
    delayed_share,
    helps_now,
    helps_later,
    pushes_forward,
    structurally_balanced,
    future_pressure,
    warnings,
    overlapping_pools,
    categoryImpact,
    topCategories,
    dominantType,
    activeCount: active.length,
    scenario_viability,
  }
}

export function formatMoney(amount) {
  const abs = Math.abs(amount)
  const sign = amount < 0 ? '-' : ''
  if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(1)}B`
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}K`
  return `${sign}$${abs}`
}

export function formatPct(value, decimals = 0) {
  return `${Math.round(value * 10 ** decimals) / 10 ** decimals}%`
}

/** Returns a severity label for a category based on how many active levers affect it */
export function categoryImpactLevel(count) {
  if (count >= 3) return 'high'
  if (count === 2) return 'medium'
  return 'low'
}

export const CATEGORY_LABELS = {
  public_safety: 'Public Safety',
  public_works: 'Public Works',
  parks_rec: 'Parks & Recreation',
  community_services: 'Community Services',
  health: 'Health & Human Services',
  administration: 'Administration',
  pensions_debt: 'Pensions & Debt',
  other: 'Other',
}
