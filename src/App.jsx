import React from 'react'
import TopBar from './components/TopBar'
import DepartmentTable from './components/DepartmentTable'
import ImpactPanel from './components/ImpactPanel'

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <TopBar />

      <div className="flex flex-col lg:flex-row gap-4 p-4 flex-1 items-start">
        {/* Main: department prioritization table */}
        <DepartmentTable />

        {/* Right: impact summary + CTA */}
        <ImpactPanel />
      </div>

      <footer className="text-center text-xs text-gray-400 py-4 border-t border-gray-200 px-4">
        Berkeley Budget Lab · Helps translate budget tradeoffs into clear input to City Council.
        Based on City Manager scenarios; this is a decision aid, not an official budget projection.
        <span className="block font-mono text-gray-300 mt-1">{__COMMIT__}</span>
      </footer>
    </div>
  )
}
