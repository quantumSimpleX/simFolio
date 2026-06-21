// engine.js — createEngine(): orchestrates track/evaluate/progress over the
// pure helpers + injected ports. Contains zero domain knowledge.

import { foldEvents } from './reducers'
import { computeMetrics } from './metrics'
import { evaluateConditions } from './conditions'

const DEFAULT_CLOCK = { now: () => Date.now() }

/**
 * Apply the `while` guard to duration metrics: a duration metric whose guard
 * gauge is falsy contributes no elapsed time, so its state is hidden from the
 * value computation. Non-guarded metrics pass through untouched.
 */
function guardState(metricDefs, internalState, gauges) {
  let copy = null
  for (const def of metricDefs) {
    if (def.kind !== 'duration' || !def.while) continue
    if (!gauges[def.while]) {
      if (!copy) copy = { ...internalState }
      delete copy[def.id]
    }
  }
  return copy || internalState
}

/**
 * @param {{
 *   metrics: import('./types').MetricDef[],
 *   achievements: import('./types').AchievementDef[],
 *   ports: import('./types').Ports,
 * }} config
 * @returns {import('./types').Engine}
 */
export function createEngine({ metrics, achievements, ports }) {
  const clock = (ports && ports.clock) || DEFAULT_CLOCK
  const { metricStore, stateProvider, achievementStore } = ports

  async function track(userId, eventOrEvents) {
    const events = Array.isArray(eventOrEvents) ? eventOrEvents : [eventOrEvents]
    if (events.length === 0) return
    const prevState = await metricStore.get(userId)
    const { deltas } = foldEvents(metrics, prevState, events, clock)
    await metricStore.apply(userId, deltas)
  }

  async function readValues(userId) {
    const [internalState, gauges, earned] = await Promise.all([
      metricStore.get(userId),
      stateProvider.read(userId),
      achievementStore.earned(userId),
    ])
    const guarded = guardState(metrics, internalState || {}, gauges || {})
    const values = computeMetrics(metrics, guarded, gauges || {}, clock)
    return { values, gauges: gauges || {}, earned: earned || new Set() }
  }

  async function evaluate(userId) {
    const { values, gauges, earned } = await readValues(userId)
    const ctx = { values, gauges, now: clock.now() }
    const { satisfied, progress } = evaluateConditions(achievements, values, earned, ctx)
    if (satisfied.length > 0) await achievementStore.award(userId, satisfied)
    const byId = new Map(achievements.map((a) => [a.id, a]))
    const unlocked = satisfied.map((id) => byId.get(id)).filter(Boolean)
    return { unlocked, progress }
  }

  async function progress(userId) {
    const { values, gauges, earned } = await readValues(userId)
    const ctx = { values, gauges, now: clock.now() }
    return evaluateConditions(achievements, values, earned, ctx).progress
  }

  return { track, evaluate, progress }
}
