import React, { useState } from 'react'
import levers from '../data/levers.json'
import LeverCard from './LeverCard'
import PortfolioSelector from './PortfolioSelector'

const GROUPS = [
  { type: 'revenue',    label: 'Revenue',                  color: 'text-blue-700',   dot: 'bg-blue-500' },
  { type: 'spending',   label: 'Spending Changes',          color: 'text-red-700',    dot: 'bg-red-400' },
  { type: 'structural', label: 'Structural Changes',        color: 'text-purple-700', dot: 'bg-purple-500' },
  { type: 'temporary',  label: 'Temporary / Timing Tools',  color: 'text-orange-700', dot: 'bg-orange-400' },
  { type: 'capital',    label: 'Capital & Infrastructure',  color: 'text-teal-700',   dot: 'bg-teal-500' },
]

export default function LeversPanel() {
  const [explainerOpen, setExplainerOpen] = useState(false)

  return (
    <main className="flex-1 min-w-0 overflow-y-auto">
      <div className="p-4 max-w-2xl mx-auto">

        {/* Current Decision context — persistent, not collapsible */}
        <div className="mb-4 rounded-lg border border-berkeley-blue/20 bg-berkeley-blue/5 px-4 py-3">
          <p className="text-xs font-semibold text-berkeley-blue uppercase tracking-widest mb-1.5">
            What's Being Decided Now
          </p>
          <p className="text-xs text-gray-700 leading-snug mb-2">
            Berkeley faces a <span className="font-semibold">$33M annual structural deficit</span>.
            The council is currently considering:
          </p>
          <ul className="text-xs text-gray-700 space-y-1 mb-2">
            <li className="flex items-start gap-1.5">
              <span className="text-berkeley-blue mt-0.5">→</span>
              <span>A <span className="font-semibold">0.5% sales tax increase</span> (~$9M/year, requires voter approval)</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-berkeley-blue mt-0.5">→</span>
              <span>A <span className="font-semibold">$300M infrastructure bond</span> (capital only — does not close the operating gap)</span>
            </li>
          </ul>
          <p className="text-xs text-gray-500 leading-snug">
            The alternative if no revenue measure passes: roughly <span className="font-semibold text-red-700">10–12% cuts across all departments</span>, including potential layoffs in public safety.
          </p>
        </div>

        <PortfolioSelector />

        {/* How is the budget currently balanced */}
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 overflow-hidden">
          <button
            className="w-full flex items-center justify-between px-4 py-2.5 text-left"
            onClick={() => setExplainerOpen((o) => !o)}
          >
            <span className="text-xs font-semibold text-amber-800">
              How is Berkeley currently bridging the gap?
            </span>
            <span className="text-amber-600 text-xs">{explainerOpen ? '▲' : '▼'}</span>
          </button>
          {explainerOpen && (
            <div className="px-4 pb-3 text-xs text-amber-800 leading-relaxed border-t border-amber-200">
              <p className="mt-2 font-medium">The city currently bridges the gap by:</p>
              <ul className="mt-1.5 space-y-1 ml-3">
                <li>• Using savings (reserves and pension stabilization funds)</li>
                <li>• Moving money between funds (e.g., workers' comp reserves)</li>
                <li>• Delaying costs (deferred maintenance, reduced pension payments)</li>
              </ul>
              <p className="mt-2 text-amber-700 font-medium">
                These help now but do not fix the underlying gap. The structural deficit
                persists and grows each year they're used.
              </p>
            </div>
          )}
        </div>

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
