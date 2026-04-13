import React from 'react'
import levers from '../data/levers.json'
import LeverCard from './LeverCard'
import PortfolioSelector from './PortfolioSelector'

const GROUPS = [
  { type: 'revenue',    label: 'Revenue',                  color: 'text-blue-700',   dot: 'bg-blue-500' },
  { type: 'spending',   label: 'Spending Changes',          color: 'text-red-700',    dot: 'bg-red-400' },
  { type: 'structural', label: 'Structural Changes',        color: 'text-purple-700', dot: 'bg-purple-500' },
  { type: 'temporary',  label: 'Temporary / Timing Tools',  color: 'text-orange-700', dot: 'bg-orange-400' },
]

export default function LeversPanel() {
  return (
    <main className="flex-1 min-w-0 overflow-y-auto">
      <div className="p-4 max-w-2xl mx-auto">
        <PortfolioSelector />

        {GROUPS.map((group) => {
          const groupLevers = levers.filter((l) => l.type === group.type)
          return (
            <section key={group.type} className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <span className={`inline-block w-2 h-2 rounded-full ${group.dot}`} />
                <h3 className={`text-xs font-bold uppercase tracking-widest ${group.color}`}>
                  {group.label}
                </h3>
              </div>
              <div className="space-y-2">
                {groupLevers.map((lever) => (
                  <LeverCard key={lever.id} lever={lever} />
                ))}
              </div>
            </section>
          )
        })}

        {/* Required global sentence per spec */}
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-800 leading-snug mt-2">
          <span className="font-semibold">Note: </span>
          Most pension costs come from past promises and don't go away quickly.
        </div>
      </div>
    </main>
  )
}
