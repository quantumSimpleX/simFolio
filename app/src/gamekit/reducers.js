// reducers.js — foldEvents() + per-kind incremental fold logic (pure, no IO).
//
// Gauge kinds hold no materialized state and are skipped here. Each fold takes
// the prior internal state for one metric, the matching events, and returns the
// next state. foldEvents() aggregates across all metric defs and also returns
// the per-metric delta states that a MetricStore can apply.

import { matchEvent, compare } from './matcher'

const MS_PER_DAY = 24 * 60 * 60 * 1000

/** Whole-day index (UTC) for a timestamp — used for streak period bucketing. */
function dayIndex(ts) {
  return Math.floor(ts / MS_PER_DAY)
}

/** Period index for a timestamp under day|week bucketing. */
function periodIndex(ts, period) {
  const d = dayIndex(ts)
  return period === 'week' ? Math.floor(d / 7) : d
}

function foldCount(def, prev, events) {
  let n = (prev && prev.n) || 0
  for (const ev of events) if (matchEvent(ev, def.match)) n += 1
  return { n }
}

function foldDistinct(def, prev, events) {
  const set = prev && Array.isArray(prev.set) ? prev.set.slice() : []
  const seen = new Set(set)
  for (const ev of events) {
    if (!matchEvent(ev, def.match)) continue
    const key = (ev.props || {})[def.prop]
    if (key === undefined || key === null) continue
    if (!seen.has(key)) {
      seen.add(key)
      set.push(key)
    }
  }
  return { set }
}

function foldSum(def, prev, events) {
  let v = (prev && prev.v) || 0
  for (const ev of events) {
    if (!matchEvent(ev, def.match)) continue
    const x = (ev.props || {})[def.prop]
    if (typeof x === 'number') v += x
  }
  return { v }
}

function foldMax(def, prev, events) {
  let v = prev && typeof prev.v === 'number' ? prev.v : undefined
  for (const ev of events) {
    if (!matchEvent(ev, def.match)) continue
    const x = (ev.props || {})[def.prop]
    if (typeof x === 'number' && (v === undefined || x > v)) v = x
  }
  return { v: v === undefined ? 0 : v }
}

function foldThresholdEvent(def, prev, events) {
  let n = (prev && prev.n) || 0
  for (const ev of events) {
    if (!matchEvent(ev, def.match)) continue
    const x = (ev.props || {})[def.prop]
    if (compare(x, def.op, def.value)) n += 1
  }
  return { n }
}

function foldDuration(def, prev, events) {
  let firstTs = prev && prev.firstTs
  let lastTs = prev && prev.lastTs
  for (const ev of events) {
    if (!matchEvent(ev, def.match)) continue
    const ts = ev.ts
    if (firstTs === undefined || firstTs === null || ts < firstTs) firstTs = ts
    if (lastTs === undefined || lastTs === null || ts > lastTs) lastTs = ts
  }
  const next = {}
  if (firstTs !== undefined && firstTs !== null) next.firstTs = firstTs
  if (lastTs !== undefined && lastTs !== null) next.lastTs = lastTs
  return next
}

function foldStreak(def, prev, events) {
  let lastPeriod = prev && prev.lastPeriod
  let length = (prev && prev.length) || 0
  for (const ev of events) {
    if (!matchEvent(ev, def.match)) continue
    const p = periodIndex(ev.ts, def.period)
    if (lastPeriod === undefined || lastPeriod === null) {
      lastPeriod = p
      length = 1
    } else if (p === lastPeriod) {
      // same period — no change to streak length
    } else if (p === lastPeriod + 1) {
      lastPeriod = p
      length += 1
    } else if (p > lastPeriod) {
      // gap — streak resets
      lastPeriod = p
      length = 1
    }
  }
  return { lastPeriod, length }
}

const FOLDS = {
  count: foldCount,
  distinct: foldDistinct,
  sum: foldSum,
  max: foldMax,
  'threshold-event': foldThresholdEvent,
  duration: foldDuration,
  streak: foldStreak,
}

/**
 * Fold a batch of events into materialized metric state.
 * Gauge metrics are skipped (they have no internal state). Deterministic and
 * idempotent on an empty event batch (deltas only include touched metrics).
 *
 * @param {import('./types').MetricDef[]} metricDefs
 * @param {Record<string, any>} prevState  metricId -> internal state
 * @param {import('./types').GameEvent[]} events
 * @param {import('./types').Clock} [clock]
 * @returns {{ nextState: Record<string, any>, deltas: Record<string, any> }}
 */
export function foldEvents(metricDefs, prevState, events, clock) {
  const now = clock ? clock.now() : Date.now()
  const prior = prevState || {}
  const evts = (events || []).map((ev) => (ev.ts === undefined || ev.ts === null ? { ...ev, ts: now } : ev))
  const nextState = { ...prior }
  const deltas = {}

  for (const def of metricDefs) {
    const fold = FOLDS[def.kind]
    if (!fold) continue // gauge or unknown — no materialized state
    const prev = prior[def.id]
    const next = fold(def, prev, evts)
    nextState[def.id] = next
    deltas[def.id] = next
  }

  return { nextState, deltas }
}
