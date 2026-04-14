import React from 'react'
import useStore from '../store/useStore'
import { formatMoney, CATEGORY_LABELS } from '../utils/calculations'

// Visual signal config
const NOW_CONFIG = {
  high:   { label: 'Now: High',    cls: 'bg-green-100 text-green-700' },
  medium: { label: 'Now: Med',     cls: 'bg-lime-100 text-lime-700' },
  low:    { label: 'Now: Low',     cls: 'bg-gray-100 text-gray-500' },
  none:   { label: 'Now: —',       cls: 'bg-gray-100 text-gray-400' },
  hurts:  { label: 'Now: Hurts',   cls: 'bg-red-100 text-red-600' },
}

const LATER_CONFIG = {
  helps:   { label: 'Later: ✓',   cls: 'bg-blue-100 text-blue-700' },
  neutral: { label: 'Later: ~',   cls: 'bg-gray-100 text-gray-500' },
  hurts:   { label: 'Later: ✗',  cls: 'bg-orange-100 text-orange-700' },
}

const FIX_CONFIG = {
  permanent: { label: 'Permanent',  cls: 'bg-green-100 text-green-700' },
  temporary: { label: 'Temporary',  cls: 'bg-orange-100 text-orange-700' },
  delayed:   { label: 'Delayed',    cls: 'bg-blue-100 text-blue-600' },
  partial:   { label: 'Partial',    cls: 'bg-yellow-100 text-yellow-700' },
}

const CONF_CONFIG = {
  high:   { label: '●●● High',  cls: 'text-green-600' },
  medium: { label: '●●○ Med',   cls: 'text-yellow-600' },
  low:    { label: '●○○ Low',   cls: 'text-red-500' },
}

const TYPE_BORDER = {
  revenue:    'border-l-blue-500',
  spending:   'border-l-red-400',
  structural: 'border-l-purple-500',
  temporary:  'border-l-orange-400',
}

export default function LeverCard({ lever }) {
  const { advancedMode, selectedLevers, toggleLever, protectedCategories } = useStore()
  const selected = selectedLevers.includes(lever.id)

  const conflictingProtected = (lever.affects ?? []).filter((id) => protectedCategories.includes(id))
  const hasConflict = conflictingProtected.length > 0

  const now = NOW_CONFIG[lever.now_effect] ?? NOW_CONFIG.none
  const later = LATER_CONFIG[lever.later_effect] ?? LATER_CONFIG.neutral
  const fix = FIX_CONFIG[lever.fix_type] ?? FIX_CONFIG.partial
  const conf = CONF_CONFIG[lever.confidence] ?? CONF_CONFIG.medium
  const borderCls = hasConflict && selected
    ? 'border-l-amber-500'
    : TYPE_BORDER[lever.type] ?? 'border-l-gray-300'

  const hasImpact = lever.impact_min !== 0 || lever.impact_max !== 0

  return (
    <div
      className={`lever-card border-l-4 ${borderCls} ${selected ? 'selected ring-1 ring-berkeley-blue/20' : ''} cursor-pointer`}
      onClick={() => toggleLever(lever.id)}
      role="checkbox"
      aria-checked={selected}
      tabIndex={0}
      onKeyDown={(e) => (e.key === ' ' || e.key === 'Enter') && toggleLever(lever.id)}
    >
      <div className="p-3">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 leading-snug">
              {advancedMode ? lever.name_advanced : lever.name_simple}
            </p>
          </div>
          {/* Toggle */}
          <button
            role="switch"
            aria-checked={selected}
            onClick={(e) => { e.stopPropagation(); toggleLever(lever.id) }}
            className={`toggle-switch flex-shrink-0 mt-0.5 ${selected ? 'bg-berkeley-blue' : 'bg-gray-200'}`}
          >
            <span className={`toggle-thumb ${selected ? 'translate-x-4' : 'translate-x-0'}`} />
          </button>
        </div>

        {/* Description */}
        <p className="text-xs text-gray-500 mt-1 leading-snug">
          {advancedMode ? lever.description_advanced : lever.description_simple}
        </p>

        {/* Signal badges */}
        <div className="flex flex-wrap gap-1 mt-2">
          <span className={`badge ${now.cls}`}>{now.label}</span>
          <span className={`badge ${later.cls}`}>{later.label}</span>
          <span className={`badge ${fix.cls}`}>{fix.label}</span>
        </div>

        {/* Protected service conflict warning */}
        {hasConflict && (
          <div className="mt-1.5 flex items-center gap-1 text-xs text-amber-700">
            <span>⚠</span>
            <span>Affects protected: {conflictingProtected.map((id) => CATEGORY_LABELS[id] ?? id).join(', ')}</span>
          </div>
        )}

        {/* Advanced detail */}
        {advancedMode && (
          <div className="mt-2 pt-2 border-t border-gray-100 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            {hasImpact && (
              <div>
                <span className="text-gray-400">Impact range</span>
                <p className="font-semibold text-gray-700">
                  {formatMoney(lever.impact_min)}–{formatMoney(lever.impact_max)}
                </p>
              </div>
            )}
            <div>
              <span className="text-gray-400">Confidence</span>
              <p className={`font-semibold ${conf.cls}`}>{conf.label}</p>
            </div>
            <div>
              <span className="text-gray-400">Timing</span>
              <p className="font-semibold text-gray-700 capitalize">{lever.implementation}</p>
            </div>
            {lever.mechanism && (
              <div className="col-span-2">
                <span className="text-gray-400">How it works</span>
                <p className="text-gray-600 leading-snug mt-0.5">{lever.mechanism}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
