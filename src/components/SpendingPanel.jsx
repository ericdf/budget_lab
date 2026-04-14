import React from 'react'
import budget from '../data/budget.json'
import useStore from '../store/useStore'
import { formatMoney, CATEGORY_LABELS } from '../utils/calculations'

const CATEGORY_COLORS = [
  'bg-berkeley-blue',
  'bg-berkeley-blue-mid',
  'bg-blue-400',
  'bg-indigo-400',
  'bg-violet-400',
  'bg-purple-400',
  'bg-slate-400',
  'bg-gray-300',
]

export default function SpendingPanel() {
  const { scenario, protectedCategories, toggleProtect, advancedMode } = useStore()
  const { categoryImpact } = scenario

  const sorted = [...budget.categories].sort((a, b) => b.amount - a.amount)

  return (
    <aside className="w-full lg:w-56 xl:w-64 flex-shrink-0">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400">
            Where Money Goes
          </h2>
          <span className="text-xs text-gray-400" title="Click the shield to mark services you want to protect">
            🛡 = protect
          </span>
        </div>

        {/* Stacked bar summary */}
        <div className="flex h-3 rounded-full overflow-hidden mb-4 gap-px">
          {sorted.map((cat, i) => (
            <div
              key={cat.id}
              className={`${CATEGORY_COLORS[i % CATEGORY_COLORS.length]} transition-all`}
              style={{ width: `${(cat.amount / budget.total_budget) * 100}%` }}
              title={`${cat.name}: ${formatMoney(cat.amount)}`}
            />
          ))}
        </div>

        <div className="space-y-2">
          {sorted.map((cat, i) => {
            const pct = (cat.amount / budget.total_budget) * 100
            const impactCount = categoryImpact[cat.id] || 0
            const impactLevel =
              impactCount >= 3 ? 'high' : impactCount === 2 ? 'medium' : impactCount === 1 ? 'low' : null
            const isProtected = protectedCategories.includes(cat.id)
            const hasConflict = isProtected && impactCount > 0

            const isStressed = cat.id === 'public_safety'

            return (
              <div key={cat.id} className={`group relative rounded-md px-1.5 py-0.5 -mx-1.5 ${isProtected ? 'bg-blue-50/60' : ''}`}>
                <div className="flex items-center justify-between mb-0.5">
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => toggleProtect(cat.id)}
                      title={isProtected ? 'Remove protection' : 'Protect this service'}
                      className={`text-sm leading-none flex-shrink-0 transition-opacity ${isProtected ? 'opacity-100' : 'opacity-20 hover:opacity-60'}`}
                    >
                      🛡
                    </button>
                    <span
                      className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${CATEGORY_COLORS[i % CATEGORY_COLORS.length]}`}
                    />
                    <span className={`text-xs font-medium leading-tight ${isProtected ? 'text-blue-800' : 'text-gray-700'}`}>{cat.name}</span>
                    {isStressed && (
                      <span className="text-xs text-orange-600 font-medium" title="BPD staffing is at historic lows (~137 of 181 authorized positions filled). Budget cuts here may not yield proportional savings — vacancies are typically covered by overtime.">
                        ⚠ stressed
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {hasConflict && (
                      <span className="badge bg-amber-100 text-amber-700" title="Active levers affect this protected service">
                        ⚠
                      </span>
                    )}
                    {impactLevel && !hasConflict && (
                      <span
                        className={`badge ${
                          impactLevel === 'high'
                            ? 'bg-orange-100 text-orange-700'
                            : impactLevel === 'medium'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                        title="Number of active levers affecting this area"
                      >
                        {impactLevel}
                      </span>
                    )}
                    <span className="text-xs text-gray-400 tabular-nums">{pct.toFixed(0)}%</span>
                  </div>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${CATEGORY_COLORS[i % CATEGORY_COLORS.length]} opacity-70`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                {/* Reduction capacity (advanced mode) */}
                {advancedMode && cat.reduction_capacity && (
                  <div className="mt-1 flex gap-2 text-xs text-gray-400">
                    <span title="Low-impact cut potential">Low: {Math.round(cat.reduction_capacity.low * 100)}%</span>
                    <span className="text-gray-300">·</span>
                    <span title="Medium-impact cut potential">Med: {Math.round(cat.reduction_capacity.medium * 100)}%</span>
                    <span className="text-gray-300">·</span>
                    <span title="High-impact cut potential">High: {Math.round(cat.reduction_capacity.high * 100)}%</span>
                    <span className="text-gray-300">·</span>
                    <span className="text-gray-500">{formatMoney(cat.amount)} budget</span>
                  </div>
                )}
                {/* Tooltip */}
                <div className="absolute left-0 top-full mt-1 z-20 hidden group-hover:block bg-gray-800 text-white text-xs rounded-lg px-3 py-2 w-56 shadow-xl pointer-events-none">
                  <p className="font-semibold mb-0.5">{cat.name}</p>
                  <p className="text-white/80">{formatMoney(cat.amount)}</p>
                  <p className="text-white/60 mt-1 leading-snug">{cat.description}</p>
                  {isStressed && (
                    <p className="text-orange-300 mt-1.5 leading-snug">
                      ⚠ Staffing stressed: ~137 of 181 authorized BPD positions filled. Cuts may not yield proportional savings — vacancies are typically backfilled with overtime.
                    </p>
                  )}
                  {cat.reduction_capacity && (
                    <p className="text-white/50 mt-1">Cut capacity: {Math.round(cat.reduction_capacity.low * 100)}%–{Math.round(cat.reduction_capacity.high * 100)}%</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <p className="text-xs text-gray-400 mt-4 leading-snug border-t border-gray-100 pt-3">
          Click 🛡 to mark services you want to protect. Levers that affect protected areas will be flagged.
        </p>
      </div>
    </aside>
  )
}
