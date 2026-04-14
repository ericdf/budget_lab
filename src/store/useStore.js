import { create } from 'zustand'
import levers from '../data/levers.json'
import portfolios from '../data/portfolios.json'
import budget from '../data/budget.json'
import { calculateScenario } from '../utils/calculations'

const useStore = create((set, get) => ({
  advancedMode: false,
  selectedLevers: [],
  protectedCategories: [],

  // Derived scenario (recomputed on every toggle)
  scenario: calculateScenario([], levers, budget.deficit),

  toggleAdvancedMode() {
    set((s) => ({ advancedMode: !s.advancedMode }))
  },

  toggleLever(leverId) {
    set((s) => {
      const next = s.selectedLevers.includes(leverId)
        ? s.selectedLevers.filter((id) => id !== leverId)
        : [...s.selectedLevers, leverId]
      return {
        selectedLevers: next,
        scenario: calculateScenario(next, levers, budget.deficit),
      }
    })
  },

  applyPortfolio(portfolioId) {
    const portfolio = portfolios.find((p) => p.id === portfolioId)
    if (!portfolio) return
    set(() => {
      const next = [...portfolio.default_levers]
      return {
        selectedLevers: next,
        scenario: calculateScenario(next, levers, budget.deficit),
      }
    })
  },

  toggleProtect(categoryId) {
    set((s) => ({
      protectedCategories: s.protectedCategories.includes(categoryId)
        ? s.protectedCategories.filter((id) => id !== categoryId)
        : [...s.protectedCategories, categoryId],
    }))
  },

  clearAll() {
    set(() => ({
      selectedLevers: [],
      scenario: calculateScenario([], levers, budget.deficit),
    }))
  },
}))

export default useStore
