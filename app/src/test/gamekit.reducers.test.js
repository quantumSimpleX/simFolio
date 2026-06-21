// UT-A2 — reducers.test.js
// Tests for foldEvents() and all per-kind fold logic in app/src/gamekit/reducers.js

import { describe, it, expect } from 'vitest'
import { foldEvents } from '../gamekit/reducers'

const MS_PER_DAY = 24 * 60 * 60 * 1000

// Helper: make a GameEvent
const ev = (type, props = {}, ts) => ({ type, props, ...(ts !== undefined ? { ts } : {}) })

// ---------------------------------------------------------------------------
// Helpers — single-metric fold wrappers
// ---------------------------------------------------------------------------
function fold(def, prev, events, clock) {
  const defs = [def]
  const prevState = prev ? { [def.id]: prev } : {}
  const { nextState } = foldEvents(defs, prevState, events, clock)
  return nextState[def.id]
}

// ---------------------------------------------------------------------------
// UT-A2: count
// ---------------------------------------------------------------------------
describe('foldEvents — count', () => {
  const def = { id: 'tradeCount', kind: 'count', match: { type: 'trade.placed' } }

  it('increments on matching events', () => {
    const s = fold(def, undefined, [ev('trade.placed'), ev('trade.placed')])
    expect(s.n).toBe(2)
  })

  it('ignores non-matching events', () => {
    const s = fold(def, undefined, [ev('stock.viewed'), ev('chat.sent')])
    expect(s.n).toBe(0)
  })

  it('accumulates from prior state', () => {
    const s = fold(def, { n: 3 }, [ev('trade.placed')])
    expect(s.n).toBe(4)
  })

  it('empty event list returns prevState unchanged', () => {
    const s = fold(def, { n: 7 }, [])
    expect(s.n).toBe(7)
  })
})

// ---------------------------------------------------------------------------
// UT-A2: distinct
// ---------------------------------------------------------------------------
describe('foldEvents — distinct', () => {
  const def = {
    id: 'distinctViews',
    kind: 'distinct',
    match: { type: 'stock.viewed' },
    prop: 'ticker',
  }

  it('dedupes by prop value', () => {
    const s = fold(def, undefined, [
      ev('stock.viewed', { ticker: 'AAPL' }),
      ev('stock.viewed', { ticker: 'AAPL' }),
      ev('stock.viewed', { ticker: 'NVDA' }),
    ])
    expect(s.set).toHaveLength(2)
    expect(s.set).toContain('AAPL')
    expect(s.set).toContain('NVDA')
  })

  it('merges with prior set', () => {
    const s = fold(def, { set: ['AAPL'] }, [ev('stock.viewed', { ticker: 'TSLA' })])
    expect(s.set).toHaveLength(2)
  })

  it('skips events where prop is undefined/null', () => {
    const s = fold(def, undefined, [ev('stock.viewed', {})])
    expect(s.set).toHaveLength(0)
  })

  it('empty event list returns prev set unchanged', () => {
    const s = fold(def, { set: ['AAPL', 'NVDA'] }, [])
    expect(s.set).toHaveLength(2)
  })
})

// ---------------------------------------------------------------------------
// UT-A2: sum
// ---------------------------------------------------------------------------
describe('foldEvents — sum', () => {
  const def = {
    id: 'totalVolume',
    kind: 'sum',
    match: { type: 'trade.placed' },
    prop: 'qty',
  }

  it('sums numeric prop values', () => {
    const s = fold(def, undefined, [
      ev('trade.placed', { qty: 10 }),
      ev('trade.placed', { qty: 5 }),
    ])
    expect(s.v).toBe(15)
  })

  it('skips non-numeric prop values', () => {
    const s = fold(def, undefined, [ev('trade.placed', { qty: 'big' })])
    expect(s.v).toBe(0)
  })

  it('accumulates from prior state', () => {
    const s = fold(def, { v: 100 }, [ev('trade.placed', { qty: 20 })])
    expect(s.v).toBe(120)
  })
})

// ---------------------------------------------------------------------------
// UT-A2: max
// ---------------------------------------------------------------------------
describe('foldEvents — max', () => {
  const def = {
    id: 'maxQty',
    kind: 'max',
    match: { type: 'trade.placed' },
    prop: 'qty',
  }

  it('tracks the maximum prop value', () => {
    const s = fold(def, undefined, [
      ev('trade.placed', { qty: 50 }),
      ev('trade.placed', { qty: 200 }),
      ev('trade.placed', { qty: 10 }),
    ])
    expect(s.v).toBe(200)
  })

  it('max persists from prior state if no larger value arrives', () => {
    const s = fold(def, { v: 500 }, [ev('trade.placed', { qty: 100 })])
    expect(s.v).toBe(500)
  })

  it('prior state can be beaten by new event', () => {
    const s = fold(def, { v: 50 }, [ev('trade.placed', { qty: 200 })])
    expect(s.v).toBe(200)
  })

  it('no events and no prior: returns 0', () => {
    const s = fold(def, undefined, [])
    expect(s.v).toBe(0)
  })

  it('skips non-numeric prop values', () => {
    const s = fold(def, undefined, [ev('trade.placed', { qty: 'many' })])
    expect(s.v).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// UT-A2: threshold-event
// ---------------------------------------------------------------------------
describe('foldEvents — threshold-event', () => {
  const def = {
    id: 'contraBuys',
    kind: 'threshold-event',
    match: { type: 'trade.placed', where: { side: { eq: 'BUY' } } },
    prop: 'dayChange',
    op: 'lte',
    value: -10,
  }

  it('counts events where prop satisfies op/value', () => {
    const s = fold(def, undefined, [
      ev('trade.placed', { side: 'BUY', dayChange: -15 }),
      ev('trade.placed', { side: 'BUY', dayChange: -10 }),
    ])
    expect(s.n).toBe(2)
  })

  it('excludes events where prop does not satisfy threshold', () => {
    const s = fold(def, undefined, [
      ev('trade.placed', { side: 'BUY', dayChange: -9 }),
      ev('trade.placed', { side: 'BUY', dayChange: 5 }),
    ])
    expect(s.n).toBe(0)
  })

  it('excludes events that fail the matcher (wrong side)', () => {
    const s = fold(def, undefined, [
      ev('trade.placed', { side: 'SELL', dayChange: -15 }),
    ])
    expect(s.n).toBe(0)
  })

  it('accumulates from prior state', () => {
    const s = fold(def, { n: 1 }, [ev('trade.placed', { side: 'BUY', dayChange: -20 })])
    expect(s.n).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// UT-A2: duration
// ---------------------------------------------------------------------------
describe('foldEvents — duration', () => {
  const def = {
    id: 'holdDuration',
    kind: 'duration',
    match: { type: 'trade.placed' },
    since: 'first',
  }

  it('records firstTs on the first matching event', () => {
    const ts = Date.now()
    const s = fold(def, undefined, [ev('trade.placed', {}, ts)])
    expect(s.firstTs).toBe(ts)
  })

  it('firstTs stays at the earliest; lastTs advances', () => {
    const t1 = 1000
    const t2 = 2000
    const t3 = 3000
    const s = fold(def, undefined, [
      ev('trade.placed', {}, t2),
      ev('trade.placed', {}, t1),
      ev('trade.placed', {}, t3),
    ])
    expect(s.firstTs).toBe(t1)
    expect(s.lastTs).toBe(t3)
  })

  it('firstTs persists from prior state', () => {
    const earlyTs = 1000
    const laterTs = 99999
    const s = fold(def, { firstTs: earlyTs }, [ev('trade.placed', {}, laterTs)])
    expect(s.firstTs).toBe(earlyTs)
    expect(s.lastTs).toBe(laterTs)
  })

  it('since:last — uses lastTs when computing metrics (state tracking)', () => {
    const defLast = { ...def, since: 'last' }
    const t1 = 1000
    const t2 = 9000
    const s = fold(defLast, undefined, [ev('trade.placed', {}, t1), ev('trade.placed', {}, t2)])
    expect(s.lastTs).toBe(t2)
    expect(s.firstTs).toBe(t1)
  })

  it('empty events: returns empty object when no prior state', () => {
    const s = fold(def, undefined, [])
    // No firstTs/lastTs because no events matched
    expect(s.firstTs).toBeUndefined()
    expect(s.lastTs).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// UT-A2: streak
// ---------------------------------------------------------------------------
describe('foldEvents — streak', () => {
  const def = {
    id: 'loginStreak',
    kind: 'streak',
    match: { type: 'session.start' },
    period: 'day',
  }

  const DAY = MS_PER_DAY

  it('starts streak at 1 for first matching event', () => {
    const s = fold(def, undefined, [ev('session.start', {}, DAY)])
    expect(s.length).toBe(1)
  })

  it('increments on consecutive day', () => {
    const s = fold(def, { lastPeriod: 1, length: 1 }, [ev('session.start', {}, 2 * DAY)])
    expect(s.length).toBe(2)
  })

  it('does not double-count within same period', () => {
    const s = fold(def, { lastPeriod: 1, length: 3 }, [
      ev('session.start', {}, DAY + 1000),
      ev('session.start', {}, DAY + 2000),
    ])
    expect(s.length).toBe(3)
  })

  it('resets on gap of more than one period', () => {
    const s = fold(def, { lastPeriod: 1, length: 5 }, [ev('session.start', {}, 10 * DAY)])
    expect(s.length).toBe(1)
  })

  it('week-period streak uses 7-day buckets', () => {
    const weekDef = { ...def, period: 'week' }
    // Period 0: days 0-6, Period 1: days 7-13
    const s = fold(weekDef, { lastPeriod: 0, length: 1 }, [ev('session.start', {}, 7 * DAY)])
    expect(s.length).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// UT-A2: gauge skipped (no internal state / no deltas)
// ---------------------------------------------------------------------------
describe('foldEvents — gauge', () => {
  const def = {
    id: 'heldDistinct',
    kind: 'gauge',
    source: 'heldDistinct',
  }

  it('gauge kind produces no delta in foldEvents', () => {
    const { deltas } = foldEvents([def], {}, [ev('trade.placed')], undefined)
    expect(deltas).not.toHaveProperty('heldDistinct')
  })

  it('gauge kind produces no nextState entry beyond prev', () => {
    const { nextState } = foldEvents([def], {}, [ev('trade.placed')], undefined)
    expect(nextState).not.toHaveProperty('heldDistinct')
  })
})

// ---------------------------------------------------------------------------
// UT-A2: idempotent empty fold
// ---------------------------------------------------------------------------
describe('foldEvents — idempotent empty fold', () => {
  it('empty event list returns prevState unchanged for all kinds', () => {
    const defs = [
      { id: 'c', kind: 'count', match: { type: 'x' } },
      { id: 'd', kind: 'distinct', match: { type: 'x' }, prop: 'ticker' },
      { id: 's', kind: 'sum', match: { type: 'x' }, prop: 'v' },
      { id: 'm', kind: 'max', match: { type: 'x' }, prop: 'v' },
      { id: 't', kind: 'threshold-event', match: { type: 'x' }, prop: 'v', op: 'gt', value: 0 },
      { id: 'dur', kind: 'duration', match: { type: 'x' }, since: 'first' },
      { id: 'str', kind: 'streak', match: { type: 'x' }, period: 'day' },
    ]
    const prev = {
      c: { n: 5 },
      d: { set: ['A', 'B'] },
      s: { v: 42 },
      m: { v: 99 },
      t: { n: 3 },
      dur: { firstTs: 1000, lastTs: 2000 },
      str: { lastPeriod: 10, length: 7 },
    }
    const { nextState } = foldEvents(defs, prev, [], undefined)
    expect(nextState.c).toEqual({ n: 5 })
    expect(nextState.d).toEqual({ set: ['A', 'B'] })
    expect(nextState.s).toEqual({ v: 42 })
    expect(nextState.m).toEqual({ v: 99 })
    expect(nextState.t).toEqual({ n: 3 })
    expect(nextState.dur).toEqual({ firstTs: 1000, lastTs: 2000 })
    expect(nextState.str).toEqual({ lastPeriod: 10, length: 7 })
  })

  it('null prevState treated as empty (no throw)', () => {
    const def = { id: 'c', kind: 'count', match: { type: 'x' } }
    expect(() => foldEvents([def], null, [], undefined)).not.toThrow()
    const { nextState } = foldEvents([def], null, [], undefined)
    expect(nextState.c.n).toBe(0)
  })
})
