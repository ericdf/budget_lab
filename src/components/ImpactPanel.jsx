import React from 'react'
import useStore from '../store/useStore'
import deptData from '../data/departments.json'
import { calculateABC, formatMoney, formatPct } from '../utils/calculations'

const SEVERITY_STYLES = {
  Low:     { bg: 'bg-green-50',   border: 'border-green-200',  text: 'text-green-800',  badge: 'bg-green-100 text-green-800' },
  Medium:  { bg: 'bg-yellow-50',  border: 'border-yellow-200', text: 'text-yellow-800', badge: 'bg-yellow-100 text-yellow-800' },
  High:    { bg: 'bg-orange-50',  border: 'border-orange-200', text: 'text-orange-800', badge: 'bg-orange-100 text-orange-800' },
  Extreme: { bg: 'bg-red-50',     border: 'border-red-200',    text: 'text-red-800',    badge: 'bg-red-100 text-red-800' },
}

export default function ImpactPanel() {
  const { scenario, selections, strategyFlags } = useStore()
  const calc = calculateABC(deptData.departments, scenario, selections)

  const {
    A_pct, B_pct, C_pct,
    A_budget, B_budget, C_budget,
    A_depts, C_depts,
    removedSavings,
    additionalCutPct,
    C_count, A_count,
    severity,
  } = calc

  const sev = SEVERITY_STYLES[severity] ?? SEVERITY_STYLES.Low
  const hasA = A_count > 0
  const hasC = C_count > 0
  const hasBurden = hasA && hasC && additionalCutPct > 0

  const strategyRelief = [
    strategyFlags.outsourcingAllowed && 'outsourcing',
    strategyFlags.countyShiftAllowed && 'shift some services to the county or other agencies',
    strategyFlags.adminReductionAllowed && 'reduce council/manager staff to share the pain',
  ].filter(Boolean)

  const buildMailto = () => {
    const protectedDepts = deptData.departments.filter(
      (d) => (selections[d.id] ?? 'B') === 'A'
    )
    const cutDepts = deptData.departments.filter(
      (d) => (selections[d.id] ?? 'B') !== 'A'
    )

    const protectedLines =
      protectedDepts.length > 0
        ? protectedDepts.map((d) => `  - ${d.name}`).join('\n')
        : '  (none — all departments accept cuts)'

    const cutLines = cutDepts
      .map((d) => {
        const state = selections[d.id] ?? 'B'
        return `  - ${d.name}${state === 'C' ? ' (accept deeper cuts)' : ''}`
      })
      .join('\n')

    const strategyLine =
      strategyRelief.length > 0
        ? `\nApproaches I support to ease implementation:\n${strategyRelief.map((s) => `  - ${s}`).join('\n')}`
        : ''

    const body = `Dear City Council,

I am writing to share my budget priorities for the current fiscal year.

SCENARIO: ${scenario === 'tax' ? 'Tax measure passes (moderate reductions)' : 'Tax measure fails (deeper reductions required)'}

SERVICES TO PROTECT:
${protectedLines}

SERVICES WHERE CUTS ARE ACCEPTED:
${cutLines}
${strategyLine}

I understand that protecting some services requires other services to absorb deeper reductions. I am asking you to direct the City Manager to return with a revised proposal that reflects these priorities.

Thank you for your service to Berkeley.

[Your name]`

    const subject = encodeURIComponent('Berkeley Budget Priorities — City Council Input')
    return `mailto:council@cityofberkeley.info?subject=${subject}&body=${encodeURIComponent(body)}`
  }

  return (
    <aside className="w-full lg:w-72 xl:w-80 flex-shrink-0">
      <div className="space-y-3 sticky top-[104px]">

        {/* Budget distribution */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
            Budget Distribution
          </h2>

          {/* Stacked bar */}
          <div className="flex h-5 rounded-full overflow-hidden mb-3 gap-px bg-gray-100">
            {A_pct > 0 && (
              <div
                className="bg-green-500 progress-fill"
                style={{ width: `${A_pct}%` }}
                title={`A — Protected: ${formatPct(A_pct, 1)}`}
              />
            )}
            {B_pct > 0 && (
              <div
                className="bg-gray-300 progress-fill"
                style={{ width: `${B_pct}%` }}
                title={`B — Baseline: ${formatPct(B_pct, 1)}`}
              />
            )}
            {C_pct > 0 && (
              <div
                className="bg-red-400 progress-fill"
                style={{ width: `${C_pct}%` }}
                title={`C — More cuts: ${formatPct(C_pct, 1)}`}
              />
            )}
          </div>

          <div className="space-y-1.5">
            <DistRow label="A — Protected" pct={A_pct} amount={A_budget} color="bg-green-500" />
            <DistRow label="B — Baseline" pct={B_pct} amount={B_budget} color="bg-gray-300" />
            <DistRow label="C — More cuts" pct={C_pct} amount={C_budget} color="bg-red-400" />
          </div>
        </div>

        {/* C burden */}
        <div
          className={`rounded-xl border shadow-sm p-4 transition-all ${
            hasBurden ? `${sev.bg} ${sev.border}` : 'bg-white border-gray-200'
          }`}
        >
          <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
            C Burden
          </h2>

          {!hasC ? (
            <p className="text-xs text-gray-400 italic">No departments assigned to C</p>
          ) : !hasA ? (
            <p className="text-xs text-gray-500 italic">
              No protected departments — C absorbs only its own baseline cut
            </p>
          ) : (
            <>
              <div className="flex items-end gap-2 mb-2">
                <span className={`text-3xl font-bold tabular-nums ${sev.text}`}>
                  +{formatPct(additionalCutPct, 1)}
                </span>
                <span className="text-xs text-gray-500 pb-1">additional cut on C</span>
              </div>

              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border mb-3 ${sev.badge} ${sev.border}`}
              >
                {severity}
              </span>

              {removedSavings > 0 && (
                <p className={`text-xs leading-snug ${sev.text}`}>
                  Protecting A departments removes {formatMoney(removedSavings)} in baseline
                  savings — the City Manager will identify operationally feasible cuts within
                  the {C_count} department{C_count !== 1 ? 's' : ''} in C to make up the
                  difference.
                </p>
              )}

              {strategyRelief.length > 0 && (
                <p className="text-xs text-gray-500 mt-2 leading-snug italic border-t border-gray-200 pt-2">
                  {strategyRelief.join(', ')} may reduce the practical impact on C.
                </p>
              )}
            </>
          )}
        </div>

        {/* Interpretation */}
        {hasA && hasC && (
          <div className="bg-gray-50 rounded-xl border border-gray-200 shadow-sm p-4">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">
              What This Means
            </h2>
            <p className="text-xs text-gray-600 leading-snug">
              Protecting selected services requires deeper reductions elsewhere. Cuts are
              concentrated in {formatPct(C_pct, 0)} of the budget.
              {additionalCutPct >= 30 &&
                ' This level of concentration may require eliminating some services entirely.'}
            </p>
          </div>
        )}

        {/* Email CTA */}
        <div className="bg-berkeley-blue rounded-xl shadow-sm p-4">
          <h2 className="text-sm font-bold text-white mb-1">
            Send Your Priorities to City Council
          </h2>
          <p className="text-xs text-white/70 leading-snug mb-3">
            Opens your email client with a pre-filled draft based on your selections. You
            review and send — nothing is sent automatically.
          </p>
          <a
            href={buildMailto()}
            className="block w-full text-center bg-berkeley-gold text-gray-900 font-bold text-sm py-2.5 rounded-lg hover:bg-yellow-400 transition-colors"
          >
            Draft Email to Council →
          </a>
        </div>

      </div>
    </aside>
  )
}

function DistRow({ label, pct, amount, color }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`inline-block w-2.5 h-2.5 rounded-sm flex-shrink-0 ${color}`} />
      <span className="text-xs text-gray-600 flex-1">{label}</span>
      <span className="text-xs font-semibold text-gray-600 tabular-nums">{formatPct(pct, 1)}</span>
      <span className="text-xs text-gray-400 tabular-nums">{formatMoney(amount)}</span>
    </div>
  )
}
