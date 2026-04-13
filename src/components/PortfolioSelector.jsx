import React, { useState } from 'react'
import portfolios from '../data/portfolios.json'
import useStore from '../store/useStore'

export default function PortfolioSelector() {
  const { selectedLevers, applyPortfolio, clearAll } = useStore()
  const [open, setOpen] = useState(false)

  // Detect active portfolio (exact match)
  const activePortfolio = portfolios.find(
    (p) =>
      p.default_levers.length === selectedLevers.length &&
      p.default_levers.every((id) => selectedLevers.includes(id))
  )

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400">
          Start with a preset
        </h2>
        <button
          onClick={() => setOpen((o) => !o)}
          className="text-xs text-berkeley-blue hover:text-berkeley-blue-light font-medium"
        >
          {open ? 'Hide presets ↑' : 'Show presets ↓'}
        </button>
      </div>

      {open && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
          {portfolios.map((p) => {
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

      {activePortfolio && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="font-medium text-berkeley-blue">"{activePortfolio.name}"</span>
          <span>preset active</span>
          <button onClick={clearAll} className="text-gray-400 hover:text-gray-600 underline">
            Clear all
          </button>
        </div>
      )}

      {!activePortfolio && selectedLevers.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>{selectedLevers.length} lever{selectedLevers.length !== 1 ? 's' : ''} selected</span>
          <button onClick={clearAll} className="text-gray-400 hover:text-gray-600 underline">
            Clear all
          </button>
        </div>
      )}

      {selectedLevers.length === 0 && !open && (
        <p className="text-xs text-gray-400">No levers selected — toggle individual options below or start with a preset.</p>
      )}
    </div>
  )
}
