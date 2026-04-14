import React, { useState } from 'react'
import portfolios from '../data/portfolios.json'
import useStore from '../store/useStore'

const featured = portfolios.filter((p) => p.featured)
const allScenarios = portfolios.filter((p) => !p.featured)

export default function PortfolioSelector() {
  const { selectedLevers, applyPortfolio, clearAll } = useStore()
  const [open, setOpen] = useState(false)

  const activePortfolio = portfolios.find(
    (p) =>
      p.default_levers.length === selectedLevers.length &&
      p.default_levers.every((id) => selectedLevers.includes(id))
  )

  return (
    <div className="mb-4">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">
        Current Plan and Alternatives
      </h2>

      {/* Featured comparators — always visible */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
        {featured.map((p) => {
          const isActive = activePortfolio?.id === p.id
          return (
            <button
              key={p.id}
              onClick={() => applyPortfolio(p.id)}
              className={`text-left rounded-lg border px-3 py-2.5 transition-all ${
                isActive
                  ? 'border-berkeley-blue bg-berkeley-blue/5 ring-1 ring-berkeley-blue'
                  : 'border-gray-300 bg-white hover:border-berkeley-blue/50 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <p className="text-xs font-bold text-gray-900 leading-tight">{p.featured_label}</p>
                {isActive && <span className="text-xs text-berkeley-blue font-medium">Active</span>}
              </div>
              <p className="text-xs text-gray-500 leading-snug">{p.description}</p>
            </button>
          )
        })}
      </div>

      {/* All scenarios — collapsible */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-400">Other scenarios</span>
        <button
          onClick={() => setOpen((o) => !o)}
          className="text-xs text-berkeley-blue hover:text-berkeley-blue-light font-medium"
        >
          {open ? 'Hide ↑' : 'Show all ↓'}
        </button>
      </div>

      {open && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
          {allScenarios.map((p) => {
            const isActive = activePortfolio?.id === p.id
            return (
              <button
                key={p.id}
                onClick={() => { applyPortfolio(p.id); setOpen(false) }}
                className={`text-left rounded-lg border px-3 py-2 transition-all ${
                  isActive
                    ? 'border-berkeley-blue bg-berkeley-blue/5 ring-1 ring-berkeley-blue'
                    : 'border-gray-200 bg-white hover:border-berkeley-blue/40 hover:bg-gray-50'
                }`}
              >
                <p className="text-xs font-semibold text-gray-800 leading-tight">{p.name}</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-snug">{p.description}</p>
              </button>
            )
          })}
        </div>
      )}

      {/* Status line */}
      {activePortfolio ? (
        <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
          <span className="font-medium text-berkeley-blue">"{activePortfolio.name}"</span>
          <span>active</span>
          <button onClick={clearAll} className="text-gray-400 hover:text-gray-600 underline">Clear</button>
        </div>
      ) : selectedLevers.length > 0 ? (
        <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
          <span>{selectedLevers.length} lever{selectedLevers.length !== 1 ? 's' : ''} selected</span>
          <button onClick={clearAll} className="text-gray-400 hover:text-gray-600 underline">Clear</button>
        </div>
      ) : (
        <p className="text-xs text-gray-400 mt-1">Select a scenario above or toggle individual levers below.</p>
      )}
    </div>
  )
}
