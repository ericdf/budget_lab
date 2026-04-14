import React from 'react'
import useStore from '../store/useStore'
import budget from '../data/budget.json'
import { formatMoney, CATEGORY_LABELS } from '../utils/calculations'
import SummaryText from './SummaryText'

export default function ImpactPanel() {
  const { scenario } = useStore()
  const {
    gap_closed_pct,
    impact_min_total,
    structural_share,
    temporary_share,
    delayed_share,
    helps_now,
    helps_later,
    pushes_forward,
    future_pressure,
    structurally_balanced,
    categoryImpact,
    activeCount,
  } = scenario

  const remaining = Math.max(0, budget.deficit - impact_min_total)
  const pct = Math.min(100, Math.max(0, gap_closed_pct))
  const overClosed = gap_closed_pct >= 100

  const barMax = budget.deficit
  const nowW  = Math.min(100, (helps_now / barMax) * 100)
  const laterW = Math.min(100, (helps_later / barMax) * 100)
  const fwdW  = Math.min(100, (pushes_forward / barMax) * 100)

  const pressure_color = {
    low: 'text-green-600',
    medium: 'text-yellow-600',
    high: 'text-red-600',
  }

  return (
    <aside className="w-full lg:w-72 xl:w-80 flex-shrink-0">
      <div className="space-y-3 sticky top-[108px]">
        {/* Gap meter */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
            Gap Status
          </h2>
          <div className="text-center mb-3">
            <p className={`text-3xl font-bold ${overClosed ? 'text-green-600' : 'text-berkeley-blue'}`}>
              {overClosed ? '100%+' : `${Math.round(pct)}%`}
            </p>
            <p className="text-xs text-gray-500">of annual gap closed</p>
          </div>
          <div className="h-3 bg-gray-100 rounded-full overflow-hidden mb-2">
            <div
              className={`h-full rounded-full progress-fill ${
                overClosed ? 'bg-green-500' : pct >= 66 ? 'bg-green-500' : pct >= 33 ? 'bg-yellow-400' : 'bg-red-400'
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-400">
            <span>{formatMoney(impact_min_total)} saved</span>
            <span>{formatMoney(remaining)} gap left</span>
          </div>
        </div>

        {/* Structural Balance */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
            Structural Balance
          </h2>
          {activeCount === 0 ? (
            <p className="text-xs text-gray-400 italic">No levers selected</p>
          ) : (
            <div
              className={`flex items-start gap-2.5 rounded-lg px-3 py-2.5 ${
                structurally_balanced
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-red-50 border border-red-200'
              }`}
            >
              <span className={`text-base leading-none mt-0.5 ${structurally_balanced ? 'text-green-600' : 'text-red-500'}`}>
                {structurally_balanced ? '✔' : '✖'}
              </span>
              <div>
                <p className={`text-xs font-semibold ${structurally_balanced ? 'text-green-800' : 'text-red-800'}`}>
                  {structurally_balanced ? 'Balanced' : 'Not balanced'}
                </p>
                <p className={`text-xs mt-0.5 leading-snug ${structurally_balanced ? 'text-green-700' : 'text-red-700'}`}>
                  {structurally_balanced
                    ? 'Recurring revenues ≥ recurring costs'
                    : gap_closed_pct < 100
                    ? 'Gap is not fully closed'
                    : 'Relies on temporary measures'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Today vs Tomorrow */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
            Today vs Tomorrow
          </h2>
          {activeCount === 0 ? (
            <p className="text-xs text-gray-400 italic">No levers selected</p>
          ) : (
            <div className="space-y-2.5">
              <TimingBar label="Helps now" color="bg-green-500" textColor="text-green-700" width={nowW} amount={helps_now} hint="Permanent or immediate impact" />
              <TimingBar label="Helps later" color="bg-blue-500" textColor="text-blue-700" width={laterW} amount={helps_later} hint="Savings materialize in 1–3 years" />
              <TimingBar label="Pushes cost forward" color="bg-orange-400" textColor="text-orange-700" width={fwdW} amount={pushes_forward} hint="Makes future budgets harder" />
            </div>
          )}
        </div>

        {/* Composition */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
            Plan Composition
          </h2>
          {activeCount === 0 ? (
            <p className="text-xs text-gray-400 italic">No levers selected</p>
          ) : (
            <>
              <div className="flex h-4 rounded-full overflow-hidden gap-px mb-3">
                {structural_share > 0 && (
                  <div className="bg-green-500 transition-all" style={{ width: `${structural_share * 100}%` }} title={`Permanent/structural: ${Math.round(structural_share * 100)}%`} />
                )}
                {delayed_share > 0 && (
                  <div className="bg-blue-500 transition-all" style={{ width: `${delayed_share * 100}%` }} title={`Delayed: ${Math.round(delayed_share * 100)}%`} />
                )}
                {temporary_share > 0 && (
                  <div className="bg-orange-400 transition-all" style={{ width: `${temporary_share * 100}%` }} title={`Temporary: ${Math.round(temporary_share * 100)}%`} />
                )}
              </div>
              <div className="space-y-1">
                <CompositionRow label="Permanent fixes" pct={structural_share} color="bg-green-500" />
                <CompositionRow label="Delayed changes" pct={delayed_share} color="bg-blue-500" />
                <CompositionRow label="Temporary measures" pct={temporary_share} color="bg-orange-400" />
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                <span className="text-xs text-gray-500">Future budget pressure</span>
                <span className={`text-xs font-bold uppercase ${pressure_color[future_pressure]}`}>
                  {future_pressure}
                </span>
              </div>
            </>
          )}
        </div>

        {/* Service Impact */}
        {activeCount > 0 && Object.keys(categoryImpact).length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
              Service Impact
            </h2>
            <div className="space-y-1.5">
              {Object.entries(categoryImpact)
                .sort((a, b) => b[1] - a[1])
                .map(([id, count]) => {
                  const level = count >= 3 ? 'high' : count === 2 ? 'medium' : 'low'
                  return (
                    <div key={id} className="flex items-center justify-between">
                      <span className="text-xs text-gray-700">{CATEGORY_LABELS[id] ?? id}</span>
                      <span className={`badge ${level === 'high' ? 'bg-red-100 text-red-700' : level === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'}`}>
                        {level}
                      </span>
                    </div>
                  )
                })}
            </div>
          </div>
        )}

        {/* Summary text */}
        <SummaryText />
      </div>
    </aside>
  )
}

function TimingBar({ label, color, textColor, width, amount, hint }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className={`text-xs font-medium ${textColor}`}>{label}</span>
        <span className="text-xs text-gray-500 tabular-nums">{formatMoney(amount)}</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden" title={hint}>
        <div className={`h-full rounded-full progress-fill ${color}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  )
}

function CompositionRow({ label, pct, color }) {
  if (pct <= 0) return null
  return (
    <div className="flex items-center gap-2">
      <span className={`inline-block w-2.5 h-2.5 rounded-sm flex-shrink-0 ${color}`} />
      <span className="text-xs text-gray-600 flex-1">{label}</span>
      <span className="text-xs font-semibold text-gray-700 tabular-nums">{Math.round(pct * 100)}%</span>
    </div>
  )
}
