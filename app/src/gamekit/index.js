// index.js — public surface of the gamekit package.
//
// Importing this folder must require nothing outside it. Re-exports the engine
// factory, the pure IO-free helpers, and an in-memory ports factory for tests.

export { createEngine } from './engine'
export { matchEvent, compare } from './matcher'
export { foldEvents } from './reducers'
export { computeMetrics } from './metrics'
export { evaluateConditions } from './conditions'

/**
 * In-memory fake ports for tests. State is held in plain Maps keyed by userId.
 * MetricStore.apply shallow-merges per-metric deltas (full-state replacement per
 * metric, matching foldEvents' delta shape).
 *
 * @param {{
 *   gauges?: Record<string, Record<string, number>> | ((userId: string) => Record<string, number>),
 *   now?: () => number,
 * }} [opts]
 * @returns {import('./types').Ports}
 */
export function createMemoryPorts(opts = {}) {
  const metricState = new Map() // userId -> { [metricId]: state }
  const earnedState = new Map() // userId -> Set<id>
  const gaugeOpt = opts.gauges

  const metricStore = {
    async get(userId) {
      return metricState.get(userId) || {}
    },
    async apply(userId, deltas) {
      const cur = metricState.get(userId) || {}
      const next = { ...cur, ...deltas }
      metricState.set(userId, next)
      return next
    },
  }

  const stateProvider = {
    async read(userId) {
      if (typeof gaugeOpt === 'function') return gaugeOpt(userId) || {}
      if (gaugeOpt && gaugeOpt[userId]) return gaugeOpt[userId]
      return {}
    },
  }

  const achievementStore = {
    async earned(userId) {
      return new Set(earnedState.get(userId) || [])
    },
    async award(userId, ids) {
      const set = earnedState.get(userId) || new Set()
      for (const id of ids) set.add(id)
      earnedState.set(userId, set)
    },
  }

  const clock = { now: opts.now || (() => Date.now()) }

  return { metricStore, stateProvider, achievementStore, clock }
}
