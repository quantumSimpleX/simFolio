// UT-A5 — engine.test.js
// Tests for createEngine() in app/src/gamekit/engine.js, using createMemoryPorts()

import { describe, it, expect } from 'vitest'
import { createEngine, createMemoryPorts } from '../gamekit/index'

const MS_PER_DAY = 24 * 60 * 60 * 1000
const UID = 'user-1'

// Minimal metric/achievement sets for each test group

function makeCountEngine(opts = {}) {
  const ports = createMemoryPorts(opts)
  const metrics = [{ id: 'tradeCount', kind: 'count', match: { type: 'trade.placed' } }]
  const achievements = [
    { id: 'first_trade', condition: { metric: 'tradeCount', op: '>=', value: 1 } },
  ]
  const engine = createEngine({ metrics, achievements, ports })
  return { engine, ports }
}

function ev(type, props = {}) {
  return { type, props }
}

// ---------------------------------------------------------------------------
// UT-A5: track folds deltas into MetricStore without awarding
// ---------------------------------------------------------------------------
describe('engine.track', () => {
  it('folds events into MetricStore without awarding', async () => {
    const { engine, ports } = makeCountEngine()
    await engine.track(UID, ev('trade.placed'))
    // Award should not have been called — earnedSet still empty
    const earned = await ports.achievementStore.earned(UID)
    expect(earned.size).toBe(0)
    // MetricStore should have count state
    const state = await ports.metricStore.get(UID)
    expect(state.tradeCount).toEqual({ n: 1 })
  })

  it('accepts a single event (non-array)', async () => {
    const { engine, ports } = makeCountEngine()
    await engine.track(UID, ev('trade.placed'))
    const state = await ports.metricStore.get(UID)
    expect(state.tradeCount.n).toBe(1)
  })

  it('accepts an array of events', async () => {
    const { engine, ports } = makeCountEngine()
    await engine.track(UID, [ev('trade.placed'), ev('trade.placed'), ev('trade.placed')])
    const state = await ports.metricStore.get(UID)
    expect(state.tradeCount.n).toBe(3)
  })

  it('track is cumulative across calls', async () => {
    const { engine, ports } = makeCountEngine()
    await engine.track(UID, ev('trade.placed'))
    await engine.track(UID, ev('trade.placed'))
    const state = await ports.metricStore.get(UID)
    expect(state.tradeCount.n).toBe(2)
  })

  it('empty event array is a no-op (no MetricStore write)', async () => {
    const { engine, ports } = makeCountEngine()
    await engine.track(UID, [])
    const state = await ports.metricStore.get(UID)
    // state is still the empty default
    expect(state).toEqual({})
  })
})

// ---------------------------------------------------------------------------
// UT-A5: evaluate awards newly-satisfied, returns unlocked
// ---------------------------------------------------------------------------
describe('engine.evaluate', () => {
  it('awards newly-satisfied achievement and returns it in unlocked', async () => {
    const { engine, ports } = makeCountEngine()
    await engine.track(UID, ev('trade.placed'))
    const { unlocked } = await engine.evaluate(UID)
    expect(unlocked).toHaveLength(1)
    expect(unlocked[0].id).toBe('first_trade')
    const earned = await ports.achievementStore.earned(UID)
    expect(earned.has('first_trade')).toBe(true)
  })

  it('re-evaluate with no change returns empty unlocked', async () => {
    const { engine } = makeCountEngine()
    await engine.track(UID, ev('trade.placed'))
    await engine.evaluate(UID) // first: unlocks first_trade
    const { unlocked } = await engine.evaluate(UID) // second: already earned
    expect(unlocked).toHaveLength(0)
  })

  it('evaluate returns multiple unlocks when two conditions newly satisfied', async () => {
    const ports = createMemoryPorts()
    const metrics = [
      { id: 'tradeCount', kind: 'count', match: { type: 'trade.placed' } },
      { id: 'views', kind: 'distinct', match: { type: 'stock.viewed' }, prop: 'ticker' },
    ]
    const achievements = [
      { id: 'first_trade', condition: { metric: 'tradeCount', op: '>=', value: 1 } },
      { id: 'researcher', condition: { metric: 'views', op: '>=', value: 1 } },
    ]
    const engine = createEngine({ metrics, achievements, ports })
    await engine.track(UID, [ev('trade.placed'), ev('stock.viewed', { ticker: 'AAPL' })])
    const { unlocked } = await engine.evaluate(UID)
    expect(unlocked).toHaveLength(2)
    const ids = unlocked.map((u) => u.id)
    expect(ids).toContain('first_trade')
    expect(ids).toContain('researcher')
  })

  it('gauge-only badge unlocks from StateProvider without any track()', async () => {
    const ports = createMemoryPorts({ gauges: { [UID]: { heldDistinct: 5 } } })
    const metrics = [{ id: 'heldDistinct', kind: 'gauge', source: 'heldDistinct' }]
    const achievements = [
      { id: 'diversified', condition: { metric: 'heldDistinct', op: '>=', value: 5 } },
    ]
    const engine = createEngine({ metrics, achievements, ports })
    // No track() calls at all
    const { unlocked } = await engine.evaluate(UID)
    expect(unlocked).toHaveLength(1)
    expect(unlocked[0].id).toBe('diversified')
  })
})

// ---------------------------------------------------------------------------
// UT-A5: progress() returns bars without awarding
// ---------------------------------------------------------------------------
describe('engine.progress', () => {
  it('returns progress bars without awarding', async () => {
    const ports = createMemoryPorts()
    const metrics = [
      { id: 'views', kind: 'distinct', match: { type: 'stock.viewed' }, prop: 'ticker', target: 10 },
    ]
    const achievements = [
      { id: 'researcher', condition: { metric: 'views', op: '>=', value: 10 } },
    ]
    const engine = createEngine({ metrics, achievements, ports })
    // Track 5 of 10 distinct views
    await engine.track(UID, [
      ev('stock.viewed', { ticker: 'A' }),
      ev('stock.viewed', { ticker: 'B' }),
      ev('stock.viewed', { ticker: 'C' }),
      ev('stock.viewed', { ticker: 'D' }),
      ev('stock.viewed', { ticker: 'E' }),
    ])
    const bars = await engine.progress(UID)
    expect(bars).toHaveLength(1)
    expect(bars[0].id).toBe('researcher')
    expect(bars[0].value).toBe(5)
    expect(bars[0].target).toBe(10)
    expect(bars[0].pct).toBe(50)
    // No award should have happened
    const earned = await ports.achievementStore.earned(UID)
    expect(earned.size).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// UT-A5: createMemoryPorts gauges as object (per-userId lookup, index.js line 42)
// ---------------------------------------------------------------------------
describe('createMemoryPorts — gauge object form (per-userId)', () => {
  it('gauges passed as object keyed by userId are returned by stateProvider', async () => {
    const ports = createMemoryPorts({
      gauges: {
        'user-a': { heldDistinct: 3 },
        'user-b': { heldDistinct: 7 },
      },
    })
    const a = await ports.stateProvider.read('user-a')
    const b = await ports.stateProvider.read('user-b')
    const none = await ports.stateProvider.read('user-c')
    expect(a.heldDistinct).toBe(3)
    expect(b.heldDistinct).toBe(7)
    expect(none).toEqual({})
  })
})

// UT-A5: DEFAULT_CLOCK fallback (no clock in ports)
// ---------------------------------------------------------------------------
describe('engine — DEFAULT_CLOCK fallback', () => {
  it('createEngine without a clock port uses Date.now() (DEFAULT_CLOCK path)', async () => {
    // Construct ports manually without a clock property
    const ports = createMemoryPorts()
    delete ports.clock
    const metrics = [{ id: 'tradeCount', kind: 'count', match: { type: 'trade.placed' } }]
    const achievements = [{ id: 'first_trade', condition: { metric: 'tradeCount', op: '>=', value: 1 } }]
    const engine = createEngine({ metrics, achievements, ports })
    await engine.track(UID, { type: 'trade.placed', props: {} })
    const { unlocked } = await engine.evaluate(UID)
    expect(unlocked.map((u) => u.id)).toContain('first_trade')
  })
})

// UT-A5: guardState first-copy branch (line 20)
// ---------------------------------------------------------------------------
describe('engine — guardState first-copy branch', () => {
  it('guardState creates copy on first deletion (covers !copy branch)', async () => {
    const fixedNow = 100 * 24 * 60 * 60 * 1000
    // Two guarded duration metrics — exercises copy creation and second deletion reuse
    const ports = createMemoryPorts({
      gauges: { [UID]: { posA: 0, posB: 0 } },
      now: () => fixedNow,
    })
    const metrics = [
      { id: 'durA', kind: 'duration', match: { type: 'trade.placed' }, since: 'first', while: 'posA' },
      { id: 'durB', kind: 'duration', match: { type: 'trade.placed' }, since: 'first', while: 'posB' },
    ]
    const achievements = [
      { id: 'p30', condition: { metric: 'durA', op: '>=', value: 30 } },
      { id: 'p60', condition: { metric: 'durB', op: '>=', value: 60 } },
    ]
    const engine = createEngine({ metrics, achievements, ports })
    const earliestTs = fixedNow - 90 * 24 * 60 * 60 * 1000
    await ports.metricStore.apply(UID, {
      durA: { firstTs: earliestTs },
      durB: { firstTs: earliestTs },
    })
    // Both guards are 0 — both duration metrics should be suppressed
    const { unlocked } = await engine.evaluate(UID)
    expect(unlocked.map((u) => u.id)).not.toContain('p30')
    expect(unlocked.map((u) => u.id)).not.toContain('p60')
  })
})

// UT-A5: duration badge with injected clock
// ---------------------------------------------------------------------------
describe('engine — duration + while guard', () => {
  it('guarded duration is hidden when gauge is falsy', async () => {
    // positionOpen gauge = 0 → duration state should be cleared by engine
    const ports = createMemoryPorts({ gauges: { [UID]: { positionOpen: 0 } } })
    const metrics = [
      { id: 'holdDuration', kind: 'duration', match: { type: 'trade.placed' }, since: 'first', while: 'positionOpen' },
    ]
    const achievements = [{ id: 'patient', condition: { metric: 'holdDuration', op: '>=', value: 30 } }]
    const engine = createEngine({ metrics, achievements, ports })
    // Put a firstTs 60 days ago in the store manually
    const sixtyDaysAgo = Date.now() - 60 * MS_PER_DAY
    await ports.metricStore.apply(UID, { holdDuration: { firstTs: sixtyDaysAgo } })
    // Even though 60 days have passed, positionOpen is 0 so the guard suppresses it
    const { unlocked } = await engine.evaluate(UID)
    expect(unlocked).toHaveLength(0)
  })

  it('duration badge unlocks when guard is truthy and time has elapsed', async () => {
    const fixedNow = 100 * MS_PER_DAY
    const ports = createMemoryPorts({
      gauges: { [UID]: { positionOpen: 1 } },
      now: () => fixedNow,
    })
    const metrics = [
      { id: 'holdDuration', kind: 'duration', match: { type: 'trade.placed' }, since: 'first', while: 'positionOpen' },
    ]
    const achievements = [{ id: 'patient', condition: { metric: 'holdDuration', op: '>=', value: 30 } }]
    const engine = createEngine({ metrics, achievements, ports })
    // Simulate firstTs 35 days before our fixed now
    const firstTs = fixedNow - 35 * MS_PER_DAY
    await ports.metricStore.apply(UID, { holdDuration: { firstTs } })
    const { unlocked } = await engine.evaluate(UID)
    expect(unlocked).toHaveLength(1)
    expect(unlocked[0].id).toBe('patient')
  })
})
