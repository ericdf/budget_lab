import React from 'react'
import useStore from '../store/useStore'
import budget from '../data/budget.json'
import { formatMoney, CATEGORY_LABELS } from '../utils/calculations'

const TYPE_PHRASES = {
  permanent: 'mostly permanent changes',
  temporary: 'mainly temporary measures',
  delayed:   'primarily delayed structural changes',
  mixed:     'a mix of approaches',
}

const PRESSURE_PHRASES = {
  low:    'easier to balance',
  medium: 'roughly the same to balance',
  high:   'harder to balance',
}

export default function SummaryText() {
  const { scenario } = useStore()
  const {
    gap_closed_pct,
    impact_min_total,
    impact_max_total,
    dominantType,
    topCategories,
    future_pressure,
    structurally_balanced,
    warnings,
    activeCount,
  } = scenario

  if (activeCount === 0) {
    return (
      <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 text-sm text-gray-500 leading-relaxed">
        Select one or more levers to see a scenario summary.
      </div>
    )
  }

  const pctMin = Math.round(gap_closed_pct)
  const pctMax = Math.round((impact_max_total / budget.deficit) * 100)
  const catLabels = topCategories.map((id) => CATEGORY_LABELS[id]).filter(Boolean)

  const lines = []

  // Line 1: gap closed
  if (gap_closed_pct >= 100) {
    lines.push(`This scenario closes the full annual gap (${formatMoney(impact_min_total)}–${formatMoney(impact_max_total)} in estimated savings).`)
  } else {
    lines.push(
      `This scenario closes roughly ${pctMin}–${pctMax}% of the ${formatMoney(budget.deficit)} annual gap (${formatMoney(impact_min_total)}–${formatMoney(impact_max_total)} in estimated savings).`
    )
  }

  // Line 2: approach type
  lines.push(`It uses ${TYPE_PHRASES[dominantType] ?? 'a mix of approaches'}.`)

  // Line 3: affected categories
  if (catLabels.length > 0) {
    lines.push(`Most directly affects: ${catLabels.join(', ')}.`)
  }

  // Line 4: future trajectory
  lines.push(`Future budgets will be ${PRESSURE_PHRASES[future_pressure] ?? 'unchanged'} to balance.`)

  // Line 5: structural balance verdict
  if (gap_closed_pct >= 80) {
    lines.push(
      structurally_balanced
        ? 'This plan structurally balances the budget.'
        : 'This plan does not structurally balance the budget.'
    )
  }

  return (
    <div className="space-y-2">
      <div className="rounded-xl bg-berkeley-blue/5 border border-berkeley-blue/20 p-4">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-berkeley-blue mb-2">
          Scenario Summary
        </h3>
        <div className="space-y-1.5">
          {lines.map((line, i) => (
            <p key={i} className="text-sm text-gray-700 leading-snug">
              {i === 0 ? <span className="font-semibold text-gray-900">{line}</span> : line}
            </p>
          ))}
        </div>
      </div>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="space-y-1.5">
          {warnings.includes('not_structural') && (
            <Warning variant="orange">This plan does not fix the underlying deficit.</Warning>
          )}
          {warnings.includes('too_temporary') && !warnings.includes('not_structural') && (
            <Warning>This plan mainly uses savings or delays costs — it doesn't fix the structural problem.</Warning>
          )}
          {warnings.includes('future_pressure') && !warnings.includes('too_temporary') && !warnings.includes('not_structural') && (
            <Warning>This will make future budgets harder to balance.</Warning>
          )}
          {warnings.includes('low_confidence') && (
            <Warning variant="yellow">Some estimates are uncertain — actual savings may vary significantly.</Warning>
          )}
          {warnings.includes('too_delayed') && (
            <Warning variant="blue">Much of this plan's savings won't materialize for 1–3 years.</Warning>
          )}
        </div>
      )}
    </div>
  )
}

function Warning({ children, variant = 'orange' }) {
  const styles = {
    orange: 'bg-orange-50 border-orange-200 text-orange-800',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    blue:   'bg-blue-50 border-blue-200 text-blue-800',
  }
  return (
    <div className={`rounded-lg border px-3 py-2 text-xs leading-snug flex gap-2 ${styles[variant]}`}>
      <span className="flex-shrink-0">⚠</span>
      <span>{children}</span>
    </div>
  )
}
