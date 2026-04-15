import { create } from 'zustand'
import deptData from '../data/departments.json'

const defaultSelections = Object.fromEntries(
  deptData.departments.map((d) => [d.id, 'B'])
)

const defaultStrategyFlags = {
  outsourcingAllowed: false,
  countyShiftAllowed: false,
  adminReductionAllowed: false,
}

const useStore = create((set) => ({
  // 'tax' = tax passes (moderate cuts), 'no-tax' = tax fails (deeper cuts)
  scenario: 'no-tax',

  // department id → 'A' | 'B' | 'C'
  selections: { ...defaultSelections },

  strategyFlags: { ...defaultStrategyFlags },

  setScenario(scenario) {
    set({ scenario })
  },

  setDeptState(deptId, state) {
    set((s) => ({
      selections: { ...s.selections, [deptId]: state },
    }))
  },

  toggleStrategy(flagKey) {
    set((s) => ({
      strategyFlags: {
        ...s.strategyFlags,
        [flagKey]: !s.strategyFlags[flagKey],
      },
    }))
  },

  resetAll() {
    set({
      selections: { ...defaultSelections },
      strategyFlags: { ...defaultStrategyFlags },
    })
  },
}))

export default useStore
