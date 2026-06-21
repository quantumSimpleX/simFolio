// metrics.js — computeMetrics(): internal state + live gauges -> numeric values.

const MS_PER_DAY = 24 * 60 * 60 * 1000

/**
 * Reduce materialized state and live gauges to a flat map of numeric metric
 * values. Unknown kinds and missing state resolve to 0.
 *
 * Duration metrics convert their tracked timestamp to whole elapsed days using
 * `clock.now()`. The `while` guard is honored upstream (the engine clears
 * guarded duration state when the gauge is falsy); this function just measures
 * the day delta from whatever state it is given.
 *
 * @param {import('./types').MetricDef[]} metricDefs
 * @param {Record<string, any>} internalState  metricId -> internal state
 * @param {Record<string, number>} gaugeState   gauge source -> number
 * @param {import('./types').Clock} [clock]
 * @returns {Record<string, number>}
 */
export function computeMetrics(metricDefs, internalState, gaugeState, clock) {
  const now = clock ? clock.now() : Date.now()
  const state = internalState || {}
  const gauges = gaugeState || {}
  const out = {}

  for (const def of metricDefs) {
    out[def.id] = valueFor(def, state[def.id], gauges, now)
  }
  return out
}

function valueFor(def, s, gauges, now) {
  switch (def.kind) {
    case 'count':
    case 'threshold-event':
      return (s && s.n) || 0
    case 'distinct':
      return s && Array.isArray(s.set) ? s.set.length : 0
    case 'sum':
    case 'max':
      return (s && typeof s.v === 'number') ? s.v : 0
    case 'streak':
      return (s && s.length) || 0
    case 'gauge': {
      const g = gauges[def.source]
      return typeof g === 'number' ? g : 0
    }
    case 'duration': {
      if (!s) return 0
      const anchor = def.since === 'last' ? s.lastTs : s.firstTs
      if (anchor === undefined || anchor === null) return 0
      return Math.floor((now - anchor) / MS_PER_DAY)
    }
    default:
      return 0
  }
}
