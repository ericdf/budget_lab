/**
 * Core calculation engine.
 * All dollar amounts are in raw numbers (e.g. 12000000 = $12M).
 */

export function calculateScenario(selectedLevers, allLevers, deficit) {
  const active = allLevers.filter((l) => selectedLevers.includes(l.id))

  const impact_min_total = active.reduce((sum, l) => sum + l.impact_min, 0)
  const impact_max_total = active.reduce((sum, l) => sum + l.impact_max, 0)
  const gap_closed_pct = deficit > 0 ? (impact_min_total / deficit) * 100 : 0

  // Composition by fix_type (based on impact_min contribution)
  const byType = { permanent: 0, temporary: 0, delayed: 0, partial: 0 }
  for (const l of active) {
    const key = l.fix_type in byType ? l.fix_type : 'partial'
    byType[key] += Math.max(0, l.impact_min)
  }
  const positiveTotal = Object.values(byType).reduce((s, v) => s + v, 0) || 1

  const structural_share = (byType.permanent + byType.partial) / positiveTotal
  const temporary_share = byType.temporary / positiveTotal
  const delayed_share = byType.delayed / positiveTotal

  // Today-vs-tomorrow buckets for visual bars
  const helps_now = active
    .filter((l) => ['high', 'medium'].includes(l.now_effect) && l.later_effect !== 'hurts')
    .reduce((s, l) => s + Math.max(0, l.impact_min), 0)

  const helps_later = active
    .filter((l) => l.fix_type === 'delayed' || (l.now_effect === 'none' && l.later_effect === 'helps'))
    .reduce((s, l) => s + Math.max(0, l.impact_min), 0)

  const pushes_forward = active
    .filter((l) => l.later_effect === 'hurts')
    .reduce((s, l) => s + Math.max(0, l.impact_min), 0)

  // Future pressure
  const hasMajorDeferral = active.some((l) =>
    ['section_115', 'skip_pension', 'capital_deferral', 'fund_balance'].includes(l.id)
  )
  let future_pressure = 'low'
  if (temporary_share > 0.4 || hasMajorDeferral) {
    future_pressure = 'high'
  } else if (temporary_share > 0.2 || delayed_share > 0.3) {
    future_pressure = 'medium'
  }

  // Warnings
  const warnings = []
  const low_conf_count = active.filter((l) => l.confidence === 'low').length
  const low_conf_share = active.length > 0 ? low_conf_count / active.length : 0

  if (temporary_share > 0.5) warnings.push('too_temporary')
  if (low_conf_share > 0.4) warnings.push('low_confidence')
  if (delayed_share > 0.3) warnings.push('too_delayed')
  if (future_pressure === 'high') warnings.push('future_pressure')

  // Affected categories (deduplicated)
  const affectedCategoryIds = [...new Set(active.flatMap((l) => l.affects))]

  // Per-category impact severity
  const categoryImpact = {}
  for (const l of active) {
    for (const catId of l.affects) {
      categoryImpact[catId] = (categoryImpact[catId] || 0) + 1
    }
  }

  // Summary text inputs
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

  return {
    impact_min_total,
    impact_max_total,
    gap_closed_pct,
    structural_share,
    temporary_share,
    delayed_share,
    helps_now,
    helps_later,
    pushes_forward,
    future_pressure,
    warnings,
    affectedCategoryIds,
    categoryImpact,
    topCategories,
    dominantType,
    activeCount: active.length,
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

/** Returns a 0–1 severity score for a category based on how many active levers affect it */
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
