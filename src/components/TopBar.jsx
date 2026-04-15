import React from 'react'
import useStore from '../store/useStore'

export default function TopBar() {
  const { scenario, setScenario, resetAll } = useStore()

  return (
    <header className="sticky top-0 z-30 bg-berkeley-blue text-white shadow-lg">
      {/* Title + controls row */}
      <div className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold leading-tight tracking-tight">Berkeley Budget Lab</h1>
          <p className="text-xs text-white/70 leading-tight hidden sm:block">
            Prioritize city services and send your values to City Council
          </p>
        </div>

        <div className="flex items-center gap-4 flex-shrink-0">
          {/* Scenario selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/60 hidden sm:block">Scenario:</span>
            <div className="flex rounded-lg overflow-hidden border border-white/20">
              <button
                onClick={() => setScenario('tax')}
                className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                  scenario === 'tax'
                    ? 'bg-berkeley-gold text-gray-900'
                    : 'bg-white/10 text-white/80 hover:bg-white/20'
                }`}
              >
                Tax passes
              </button>
              <button
                onClick={() => setScenario('no-tax')}
                className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                  scenario === 'no-tax'
                    ? 'bg-red-500 text-white'
                    : 'bg-white/10 text-white/80 hover:bg-white/20'
                }`}
              >
                Tax fails
              </button>
            </div>
          </div>

          <button
            onClick={resetAll}
            className="text-xs text-white/50 hover:text-white underline underline-offset-2 transition-colors"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Context line */}
      <div className="px-4 pb-2 border-t border-white/10 pt-2">
        <p className="text-xs text-white/50 leading-snug">
          {scenario === 'tax'
            ? 'Tax measure passes: moderate reductions required. Protecting some services shifts savings requirements onto others.'
            : 'Tax measure fails: deeper reductions required. Protecting some services shifts savings requirements onto others.'}
        </p>
      </div>
    </header>
  )
}
