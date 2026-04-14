import React, { useState } from 'react'
import useStore from '../store/useStore'
import levers from '../data/levers.json'
import budget from '../data/budget.json'
import { formatMoney, CATEGORY_LABELS } from '../utils/calculations'

const TYPE_LABELS = {
  revenue:    'Revenue',
  spending:   'Spending',
  structural: 'Structural',
  temporary:  'Temporary',
  capital:    'Capital',
}

const PRESSURE_LABELS = { low: 'Low', medium: 'Medium', high: 'High' }

export default function ExportButton() {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(null) // 'pdf' | 'png' | null

  const { scenario, selectedLevers, protectedCategories } = useStore()
  const {
    gap_closed_pct,
    effective_impact_now,
    impact_min_total,
    impact_max_total,
    structurally_balanced,
    future_pressure,
    warnings,
    categoryImpact,
    scenario_viability,
  } = scenario

  const activeLevers = levers.filter((l) => selectedLevers.includes(l.id))
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  // ── PDF ──────────────────────────────────────────────────────────────
  async function exportPDF() {
    setBusy('pdf')
    setOpen(false)
    try {
      const { default: jsPDF } = await import('jspdf')
      const doc = new jsPDF({ unit: 'pt', format: 'letter' })
      const W = doc.internal.pageSize.getWidth()
      const margin = 48
      const col = W - margin * 2
      let y = margin

      const LINE = 14
      const SECTION_GAP = 10
      const rule = () => {
        doc.setDrawColor(200, 200, 200)
        doc.line(margin, y, W - margin, y)
        y += SECTION_GAP
      }

      // Header
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(20)
      doc.setTextColor(0, 50, 98) // berkeley-blue
      doc.text('Berkeley Budget Lab', margin, y)
      y += LINE * 1.5
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.setTextColor(100, 100, 100)
      doc.text(`Scenario Export  ·  ${date}`, margin, y)
      y += LINE * 2
      rule()

      // Gap Status
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.setTextColor(40, 40, 40)
      doc.text('GAP STATUS', margin, y)
      y += LINE * 1.3
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      const pct = Math.round(gap_closed_pct)
      const gapLine = gap_closed_pct >= 100
        ? `Fully closed near-term  (${formatMoney(effective_impact_now ?? impact_min_total)} effective now)`
        : `${pct}% effective near-term  (${formatMoney(effective_impact_now ?? impact_min_total)} of ${formatMoney(budget.deficit)} gap)`
      doc.text(gapLine, margin + 12, y)
      y += LINE * 2

      // Structural balance
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.text('STRUCTURAL BALANCE', margin, y)
      y += LINE * 1.3
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      if (activeLevers.length === 0) {
        doc.text('No levers selected', margin + 12, y)
      } else {
        doc.setTextColor(structurally_balanced ? 0 : 180, structurally_balanced ? 120 : 0, 0)
        doc.text(
          structurally_balanced
            ? '✓  Balanced — recurring revenues ≥ recurring costs'
            : '✗  Not balanced — ' + (gap_closed_pct < 100 ? 'gap not fully closed' : 'relies on temporary measures'),
          margin + 12, y
        )
        doc.setTextColor(40, 40, 40)
      }
      y += LINE * 1.2
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.text(`Future budget pressure: ${PRESSURE_LABELS[future_pressure]}`, margin + 12, y)
      y += LINE * 2

      // Levers
      rule()
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.setTextColor(40, 40, 40)
      doc.text(`SELECTED LEVERS (${activeLevers.length})`, margin, y)
      y += LINE * 1.3

      if (activeLevers.length === 0) {
        doc.setFont('helvetica', 'italic')
        doc.setFontSize(10)
        doc.text('None selected', margin + 12, y)
        y += LINE
      } else {
        // Group by type
        const groups = ['revenue', 'spending', 'structural', 'temporary', 'capital']
        for (const grp of groups) {
          const grpLevers = activeLevers.filter((l) => l.type === grp)
          if (grpLevers.length === 0) continue

          doc.setFont('helvetica', 'bold')
          doc.setFontSize(9)
          doc.setTextColor(120, 120, 120)
          doc.text(TYPE_LABELS[grp].toUpperCase(), margin + 12, y)
          y += LINE * 1.1

          for (const l of grpLevers) {
            // Check new page
            if (y > doc.internal.pageSize.getHeight() - 80) {
              doc.addPage()
              y = margin
            }
            doc.setFont('helvetica', 'bold')
            doc.setFontSize(10)
            doc.setTextColor(40, 40, 40)
            doc.text(`• ${l.name_simple}`, margin + 20, y)

            // Right-aligned impact
            const impact = l.impact_min === 0 && l.impact_max === 0
              ? 'No direct $ impact'
              : `${formatMoney(l.impact_min)}–${formatMoney(l.impact_max)}`
            doc.setFont('helvetica', 'normal')
            doc.setFontSize(9)
            doc.setTextColor(80, 80, 80)
            const impactW = doc.getTextWidth(impact)
            doc.text(impact, W - margin - impactW, y)

            y += LINE * 1.1
            // Description (wrapped)
            doc.setFont('helvetica', 'normal')
            doc.setFontSize(8.5)
            doc.setTextColor(110, 110, 110)
            const descLines = doc.splitTextToSize(l.description_simple, col - 32)
            doc.text(descLines, margin + 28, y)
            y += descLines.length * LINE * 0.95 + 4
          }
          y += 4
        }
      }

      // Warnings
      if (warnings.length > 0) {
        rule()
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(11)
        doc.setTextColor(40, 40, 40)
        doc.text('WARNINGS', margin, y)
        y += LINE * 1.3

        const WARNING_TEXT = {
          not_structural: 'This plan does not fix the underlying deficit.',
          too_temporary:  'This plan mainly uses savings or delays costs — it doesn\'t fix the structural problem.',
          future_pressure: 'This will make future budgets harder to balance.',
          low_confidence: 'Some estimates are uncertain — actual savings may vary significantly.',
          too_delayed:    'Much of this plan\'s savings won\'t materialize for 1–3 years.',
        }
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(10)
        doc.setTextColor(160, 80, 0)
        for (const w of warnings) {
          if (WARNING_TEXT[w]) {
            const lines = doc.splitTextToSize(`⚠  ${WARNING_TEXT[w]}`, col - 12)
            doc.text(lines, margin + 12, y)
            y += lines.length * LINE * 1.1
          }
        }
        doc.setTextColor(40, 40, 40)
        y += 6
      }

      // Protected services
      if (protectedCategories.length > 0) {
        rule()
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(11)
        doc.setTextColor(40, 40, 40)
        doc.text('PROTECTED SERVICES', margin, y)
        y += LINE * 1.3
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(10)
        for (const catId of protectedCategories) {
          const conflict = (categoryImpact[catId] ?? 0) > 0
          doc.setTextColor(conflict ? 160 : 0, conflict ? 80 : 100, 0)
          const label = CATEGORY_LABELS[catId] ?? catId
          doc.text(
            `  ${conflict ? '⚠' : '✓'}  ${label}${conflict ? ' — active levers affect this service' : ''}`,
            margin + 12, y
          )
          y += LINE * 1.2
        }
        doc.setTextColor(40, 40, 40)
        y += 6
      }

      // Footer
      if (y > doc.internal.pageSize.getHeight() - 60) {
        doc.addPage()
        y = margin
      }
      rule()
      doc.setFont('helvetica', 'italic')
      doc.setFontSize(8)
      doc.setTextColor(150, 150, 150)
      doc.text('Generated by Berkeley Budget Lab  ·  https://ericdf.github.io/budget_lab/', margin, y)

      doc.save(`berkeley-budget-scenario-${Date.now()}.pdf`)
    } finally {
      setBusy(null)
    }
  }

  // ── PNG ──────────────────────────────────────────────────────────────
  async function exportPNG() {
    const target = document.getElementById('impact-panel-capture')
    if (!target) return
    setBusy('png')
    setOpen(false)
    try {
      const { toPng } = await import('html-to-image')
      const dataUrl = await toPng(target, {
        backgroundColor: '#f3f4f6',
        pixelRatio: 2,
        style: { borderRadius: '12px', padding: '12px' },
      })
      const link = document.createElement('a')
      link.download = `berkeley-budget-scenario-${Date.now()}.png`
      link.href = dataUrl
      link.click()
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={!!busy || selectedLevers.length === 0}
        className="text-xs text-white/70 hover:text-white border border-white/30 hover:border-white/60 rounded-lg px-2.5 py-1.5 transition-colors disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5"
      >
        {busy ? (
          <span className="animate-pulse">Exporting…</span>
        ) : (
          <>
            <span>↓</span>
            <span>Export</span>
          </>
        )}
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden min-w-[140px]">
            <button
              onClick={exportPDF}
              className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"
            >
              <span>📄</span>
              <span>Download PDF</span>
            </button>
            <button
              onClick={exportPNG}
              className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"
            >
              <span>🖼</span>
              <span>Download PNG</span>
            </button>
          </div>
        </>
      )}
    </div>
  )
}
