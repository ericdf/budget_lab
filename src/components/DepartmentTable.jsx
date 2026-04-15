import React from 'react'
import useStore from '../store/useStore'
import deptData from '../data/departments.json'
import { calculateABC, formatMoney } from '../utils/calculations'

const STATE_ROW = {
  A: 'bg-green-50 border-l-4 border-l-green-500',
  B: 'bg-white',
  C: 'bg-red-50 border-l-4 border-l-red-400',
}

const STATE_BTN_ACTIVE = {
  A: 'bg-green-600 text-white shadow ring-2 ring-green-300',
  B: 'bg-berkeley-blue text-white shadow ring-2 ring-berkeley-blue/30',
  C: 'bg-red-600 text-white shadow ring-2 ring-red-300',
}

const BTN_BASE = 'w-9 py-1.5 rounded text-xs font-bold transition-all focus:outline-none focus:ring-2 focus:ring-offset-1'
const BTN_INACTIVE = 'bg-gray-100 text-gray-400 hover:bg-gray-200 focus:ring-gray-300'

const STATE_LABELS = { A: 'Protect', B: 'Baseline', C: 'Cut More' }

export default function DepartmentTable() {
  const { scenario, selections, setDeptState, strategyFlags, toggleStrategy } = useStore()
  const { additionalCutPct, A_share, A_count } = calculateABC(
    deptData.departments,
    scenario,
    selections
  )

  // Progressive constraint warning
  let warning = null
  if (A_share > 0.7) warning = 'extreme'
  else if (A_share > 0.5) warning = 'high'
  else if (A_share > 0.3) warning = 'moderate'

  const warningText = {
    moderate: 'Many services are protected; remaining areas must absorb more cuts.',
    high: 'Most services are protected; cuts will be concentrated in a small portion of the budget.',
    extreme: 'Nearly all services are protected; remaining services may face elimination.',
  }
  const warningColor = {
    moderate: 'bg-yellow-50 border-yellow-300 text-yellow-800',
    high: 'bg-orange-50 border-orange-300 text-orange-800',
    extreme: 'bg-red-50 border-red-300 text-red-800',
  }

  return (
    <div className="flex-1 min-w-0">
      {/* Intro card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-4">
        <h2 className="text-sm font-semibold text-gray-800 mb-1.5">Assign Priorities</h2>
        <p className="text-xs text-gray-500 leading-snug">
          Mark each department{' '}
          <span className="font-semibold text-green-700">A — Protect</span> to shield it from cuts,{' '}
          <span className="font-semibold text-gray-600">B — Baseline</span> to accept the Manager's scenario, or{' '}
          <span className="font-semibold text-red-700">C — Cut More</span> to have it absorb additional reductions.
          Protecting a department shifts its savings requirement onto the C pool.
        </p>
      </div>

      {/* Constraint warning */}
      {warning && additionalCutPct > 0 && (
        <div className={`rounded-xl border px-4 py-3 mb-4 text-xs leading-snug ${warningColor[warning]}`}>
          {warningText[warning]}
        </div>
      )}

      {/* Department rows */}
      <div className="space-y-2 mb-4">
        {deptData.departments.map((dept) => {
          const state = selections[dept.id] ?? 'B'
          const baselineCutPct = scenario === 'no-tax' ? dept.cutNoTaxPct : dept.cutWithTaxPct
          const baselineSavings = (dept.baseBudget * baselineCutPct) / 100

          const consequence =
            state === 'A'
              ? null
              : state === 'C'
              ? dept.consequenceSevere
              : dept.consequenceBaseline

          return (
            <div
              key={dept.id}
              className={`rounded-xl border border-gray-200 shadow-sm p-4 transition-all ${STATE_ROW[state]}`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                {/* Dept info */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 mb-1">
                    <h3 className="text-sm font-semibold text-gray-800">{dept.name}</h3>
                    <span className="text-xs text-gray-400">{formatMoney(dept.baseBudget)}</span>
                  </div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs text-gray-400">Manager baseline:</span>
                    <span
                      className={`text-xs font-semibold ${
                        baselineCutPct === 0 ? 'text-gray-400' : 'text-orange-700'
                      }`}
                    >
                      {baselineCutPct === 0
                        ? 'No reduction'
                        : `−${baselineCutPct}% (${formatMoney(baselineSavings)})`}
                    </span>
                  </div>

                  {state === 'A' ? (
                    <p className="text-xs text-green-700 font-medium leading-snug">
                      Protected — baseline reduction removed.
                      {baselineSavings > 0
                        ? ` ${formatMoney(baselineSavings)} in savings redistributed to C departments.`
                        : ''}
                    </p>
                  ) : consequence ? (
                    <p
                      className={`text-xs leading-snug ${
                        state === 'C' ? 'text-red-700 font-medium' : 'text-gray-500'
                      }`}
                    >
                      {consequence}
                    </p>
                  ) : null}
                </div>

                {/* A / B / C buttons */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {['A', 'B', 'C'].map((s) => (
                    <button
                      key={s}
                      onClick={() => setDeptState(dept.id, s)}
                      title={STATE_LABELS[s]}
                      className={`${BTN_BASE} ${
                        state === s ? STATE_BTN_ACTIVE[s] : BTN_INACTIVE
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Strategy options */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <h2 className="text-sm font-semibold text-gray-800 mb-1">Strategy Options</h2>
        <p className="text-xs text-gray-500 mb-3 leading-snug">
          These signals may reduce the practical burden on C departments without changing the
          underlying arithmetic.
        </p>
        <div className="space-y-3">
          <StrategyToggle
            label="Outsourcing is acceptable"
            description="Some C department functions could be contracted out to reduce direct cost"
            flagKey="outsourcingAllowed"
            value={strategyFlags.outsourcingAllowed}
            onToggle={toggleStrategy}
          />
          <StrategyToggle
            label="Shift some services to the county or other agencies"
            description="Some services could be transferred to county or regional agencies rather than cut"
            flagKey="countyShiftAllowed"
            value={strategyFlags.countyShiftAllowed}
            onToggle={toggleStrategy}
          />
          <StrategyToggle
            label="Reduce council/manager staff to share the pain"
            description="City Council and City Manager offices should absorb reductions alongside other departments"
            flagKey="adminReductionAllowed"
            value={strategyFlags.adminReductionAllowed}
            onToggle={toggleStrategy}
          />
        </div>
      </div>
    </div>
  )
}

function StrategyToggle({ label, description, flagKey, value, onToggle }) {
  return (
    <div className="flex items-start gap-3">
      <button
        role="switch"
        aria-checked={value}
        onClick={() => onToggle(flagKey)}
        className={`toggle-switch flex-shrink-0 mt-0.5 ${
          value ? 'bg-berkeley-blue' : 'bg-gray-200'
        } focus:ring-berkeley-blue`}
        aria-label={label}
      >
        <span className={`toggle-thumb ${value ? 'translate-x-4' : 'translate-x-0'}`} />
      </button>
      <div>
        <p className={`text-xs font-medium ${value ? 'text-berkeley-blue' : 'text-gray-700'}`}>
          {label}
        </p>
        <p className="text-xs text-gray-400 leading-snug">{description}</p>
      </div>
    </div>
  )
}
