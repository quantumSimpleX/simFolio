// UT-A3 — metrics.test.js
// Tests for computeMetrics() in app/src/gamekit/metrics.js

import { describe, it, expect } from 'vitest'
import { computeMetrics } from '../gamekit/metrics'

const MS_PER_DAY = 24 * 60 * 60 * 1000

// ---------------------------------------------------------------------------
// UT-A3: each kind resolves to a number from internal state
// ---------------------------------------------------------------------------
describe('computeMetrics — count and threshold-event', () => {
  it('count: returns n from state', () => {
    const defs = [{ id: 'tradeCount', kind: 'count' }]
    const out = computeMetrics(defs, { tradeCount: { n: 7 } }, {})
    expect(out.tradeCount).toBe(7)
  })

  it('count: missing state returns 0', () => {
    const defs = [{ id: 'tradeCount', kind: 'count' }]
    const out = computeMetrics(defs, {}, {})
    expect(out.tradeCount).toBe(0)
  })

  it('threshold-event: returns n from state', () => {
    const defs = [{ id: 'contraBuys', kind: 'threshold-event' }]
    const out = computeMetrics(defs, { contraBuys: { n: 3 } }, {})
    expect(out.contraBuys).toBe(3)
  })
})

describe('computeMetrics — distinct', () => {
  it('returns set.length', () => {
    const defs = [{ id: 'views', kind: 'distinct' }]
    const out = computeMetrics(defs, { views: { set: ['AAPL', 'NVDA', 'TSLA'] } }, {})
    expect(out.views).toBe(3)
  })

  it('missing state returns 0', () => {
    const defs = [{ id: 'views', kind: 'distinct' }]
    expect(computeMetrics(defs, {}, {}).views).toBe(0)
  })

  it('non-array set returns 0', () => {
    const defs = [{ id: 'views', kind: 'distinct' }]
    expect(computeMetrics(defs, { views: { set: null } }, {}).views).toBe(0)
  })
})

describe('computeMetrics — sum and max', () => {
  it('sum: returns v', () => {
    const defs = [{ id: 's', kind: 'sum' }]
    expect(computeMetrics(defs, { s: { v: 42.5 } }, {}).s).toBe(42.5)
  })

  it('max: returns v', () => {
    const defs = [{ id: 'm', kind: 'max' }]
    expect(computeMetrics(defs, { m: { v: 200 } }, {}).m).toBe(200)
  })

  it('missing state for sum/max returns 0', () => {
    const defs = [{ id: 's', kind: 'sum' }, { id: 'm', kind: 'max' }]
    const out = computeMetrics(defs, {}, {})
    expect(out.s).toBe(0)
    expect(out.m).toBe(0)
  })
})

describe('computeMetrics — streak', () => {
  it('returns length from state', () => {
    const defs = [{ id: 'streak', kind: 'streak' }]
    expect(computeMetrics(defs, { streak: { length: 12 } }, {}).streak).toBe(12)
  })

  it('missing state returns 0', () => {
    const defs = [{ id: 'streak', kind: 'streak' }]
    expect(computeMetrics(defs, {}, {}).streak).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// UT-A3: gauge resolves from gaugeState; missing source -> 0
// ---------------------------------------------------------------------------
describe('computeMetrics — gauge', () => {
  it('reads from gaugeState by source key', () => {
    const defs = [{ id: 'heldDistinct', kind: 'gauge', source: 'heldDistinct' }]
    const out = computeMetrics(defs, {}, { heldDistinct: 5 })
    expect(out.heldDistinct).toBe(5)
  })

  it('missing source in gaugeState returns 0', () => {
    const defs = [{ id: 'heldDistinct', kind: 'gauge', source: 'heldDistinct' }]
    const out = computeMetrics(defs, {}, {})
    expect(out.heldDistinct).toBe(0)
  })

  it('non-numeric gauge value returns 0', () => {
    const defs = [{ id: 'heldDistinct', kind: 'gauge', source: 'heldDistinct' }]
    const out = computeMetrics(defs, {}, { heldDistinct: 'many' })
    expect(out.heldDistinct).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// UT-A3: duration converts firstTs/lastTs to days using injected clock
// ---------------------------------------------------------------------------
describe('computeMetrics — duration', () => {
  it('since:first — returns floor((now - firstTs) / MS_PER_DAY)', () => {
    const defs = [{ id: 'holdDays', kind: 'duration', since: 'first' }]
    const firstTs = 0
    const clock = { now: () => 31 * MS_PER_DAY }
    const out = computeMetrics(defs, { holdDays: { firstTs, lastTs: 15 * MS_PER_DAY } }, {}, clock)
    expect(out.holdDays).toBe(31)
  })

  it('since:last — returns floor((now - lastTs) / MS_PER_DAY)', () => {
    const defs = [{ id: 'holdDays', kind: 'duration', since: 'last' }]
    const lastTs = 5 * MS_PER_DAY
    const clock = { now: () => 10 * MS_PER_DAY }
    const out = computeMetrics(defs, { holdDays: { firstTs: 0, lastTs } }, {}, clock)
    expect(out.holdDays).toBe(5)
  })

  it('no state returns 0', () => {
    const defs = [{ id: 'holdDays', kind: 'duration', since: 'first' }]
    const out = computeMetrics(defs, {}, {}, { now: () => Date.now() })
    expect(out.holdDays).toBe(0)
  })

  it('missing anchor timestamp returns 0', () => {
    const defs = [{ id: 'holdDays', kind: 'duration', since: 'first' }]
    // state exists but firstTs is missing
    const clock = { now: () => 10 * MS_PER_DAY }
    const out = computeMetrics(defs, { holdDays: { lastTs: 1000 } }, {}, clock)
    expect(out.holdDays).toBe(0)
  })

  it('uses Date.now() when no clock injected', () => {
    const defs = [{ id: 'holdDays', kind: 'duration', since: 'first' }]
    // firstTs in the past — just assert it returns a non-negative integer
    const firstTs = Date.now() - 2 * MS_PER_DAY
    const out = computeMetrics(defs, { holdDays: { firstTs } }, {})
    expect(out.holdDays).toBeGreaterThanOrEqual(1)
  })
})

// ---------------------------------------------------------------------------
// UT-A3: unknown metric id / empty state -> 0
// ---------------------------------------------------------------------------
describe('computeMetrics — unknown kind / empty', () => {
  it('unknown kind returns 0', () => {
    const defs = [{ id: 'weird', kind: 'funky-future' }]
    const out = computeMetrics(defs, { weird: { data: 99 } }, {})
    expect(out.weird).toBe(0)
  })

  it('empty defs returns empty object', () => {
    const out = computeMetrics([], {}, {})
    expect(out).toEqual({})
  })

  it('null internalState handled gracefully', () => {
    const defs = [{ id: 'c', kind: 'count' }]
    expect(() => computeMetrics(defs, null, {})).not.toThrow()
    expect(computeMetrics(defs, null, {}).c).toBe(0)
  })

  it('null gaugeState handled gracefully', () => {
    const defs = [{ id: 'g', kind: 'gauge', source: 'g' }]
    expect(() => computeMetrics(defs, {}, null)).not.toThrow()
    expect(computeMetrics(defs, {}, null).g).toBe(0)
  })
})
