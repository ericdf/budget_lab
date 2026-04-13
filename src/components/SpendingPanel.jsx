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
  const { scenario } = useStore()
  const { categoryImpact } = scenario

  const sorted = [...budget.categories].sort((a, b) => b.amount - a.amount)

  return (
    <aside className="w-full lg:w-56 xl:w-64 flex-shrink-0">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
          Where Money Goes
        </h2>

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

            return (
              <div key={cat.id} className="group relative">
                <div className="flex items-center justify-between mb-0.5">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${CATEGORY_COLORS[i % CATEGORY_COLORS.length]}`}
                    />
                    <span className="text-xs text-gray-700 font-medium leading-tight">{cat.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {impactLevel && (
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
                {/* Tooltip */}
                <div className="absolute left-0 top-full mt-1 z-20 hidden group-hover:block bg-gray-800 text-white text-xs rounded-lg px-3 py-2 w-48 shadow-xl pointer-events-none">
                  <p className="font-semibold mb-0.5">{cat.name}</p>
                  <p className="text-white/80">{formatMoney(cat.amount)}</p>
                  <p className="text-white/60 mt-1 leading-snug">{cat.description}</p>
                </div>
              </div>
            )
          })}
        </div>

        <p className="text-xs text-gray-400 mt-4 leading-snug border-t border-gray-100 pt-3">
          Bars highlight when active levers affect that spending area.
        </p>
      </div>
    </aside>
  )
}
