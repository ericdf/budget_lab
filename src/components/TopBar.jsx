import React from 'react'
import useStore from '../store/useStore'
import budget from '../data/budget.json'
import { formatMoney } from '../utils/calculations'

export default function TopBar() {
  const { advancedMode, toggleAdvancedMode, clearAll, scenario } = useStore()
  const { impact_min_total, gap_closed_pct } = scenario

  const remaining = Math.max(0, budget.deficit - impact_min_total)
  const pct = Math.min(100, Math.max(0, gap_closed_pct))
  const overClosed = gap_closed_pct >= 100

  const barColor = overClosed
    ? 'bg-green-500'
    : pct >= 66
    ? 'bg-green-500'
    : pct >= 33
    ? 'bg-yellow-400'
    : 'bg-red-400'

  return (
    <header className="sticky top-0 z-30 bg-berkeley-blue text-white shadow-lg">
      {/* Title row */}
      <div className="border-b border-white/10 px-4 py-2 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold leading-tight tracking-tight">Berkeley Budget Lab</h1>
          <p className="text-xs text-white/70 leading-tight hidden sm:block">
            Explore how decisions about spending, taxes, and services could shape Berkeley's budget
          </p>
        </div>
        {/* Advanced mode toggle */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-white/70 hidden sm:block">Simple</span>
          <button
            role="switch"
            aria-checked={advancedMode}
            onClick={toggleAdvancedMode}
            className={`toggle-switch ${advancedMode ? 'bg-berkeley-gold' : 'bg-white/30'} focus:ring-white`}
            aria-label="Toggle advanced mode"
          >
            <span
              className={`toggle-thumb ${advancedMode ? 'translate-x-4' : 'translate-x-0'}`}
            />
          </button>
          <span className="text-xs text-white/70 hidden sm:block">Advanced</span>
        </div>
      </div>

      {/* Stats row */}
      <div className="px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-2">
        <Stat label="Total Budget" value={formatMoney(budget.total_budget)} />
        <Stat label="Deficit to Close" value={formatMoney(budget.deficit)} accent="text-red-300" />
        <Stat
          label="Remaining Gap"
          value={overClosed ? 'Closed!' : formatMoney(remaining)}
          accent={overClosed ? 'text-green-300' : remaining > 0 ? 'text-yellow-300' : 'text-green-300'}
        />

        {/* Progress bar */}
        <div className="flex-1 min-w-[160px]">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-white/70">Gap closed</span>
            <span className={`text-sm font-bold ${overClosed ? 'text-green-300' : 'text-white'}`}>
              {overClosed ? '100%+' : `${Math.round(pct)}%`}
            </span>
          </div>
          <div className="h-2 rounded-full bg-white/20 overflow-hidden">
            <div
              className={`h-full rounded-full progress-fill ${barColor}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Clear button */}
        <button
          onClick={clearAll}
          className="text-xs text-white/60 hover:text-white underline underline-offset-2 transition-colors"
        >
          Reset
        </button>
      </div>
    </header>
  )
}

function Stat({ label, value, accent = 'text-white' }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-white/60 leading-none">{label}</span>
      <span className={`text-base font-bold leading-tight ${accent}`}>{value}</span>
    </div>
  )
}
