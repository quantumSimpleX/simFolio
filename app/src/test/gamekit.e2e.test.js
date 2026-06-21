// E2E — gamekit.e2e.test.js
// End-to-end badge-unlock scenarios using createEngine + createMemoryPorts (fake ports).
// Each scenario mirrors a row from GAMtest.md §E2E and §5 of GAMreq.md.

import { describe, it, expect } from 'vitest'
import { createEngine, createMemoryPorts } from '../gamekit/index'

const MS_PER_DAY = 24 * 60 * 60 * 1000
const UID = 'user-e2e'

// ---------------------------------------------------------------------------
// Full simFolio metric/achievement config (declarative, zero per-badge code)
// Mirrors GAMreq.md §5 badge mapping
// ---------------------------------------------------------------------------
const metrics = [
  // Event-derived
  { id: 'tradeCount', kind: 'count', match: { type: 'trade.placed' } },
  { id: 'limitOrders', kind: 'count', match: { type: 'trade.placed', where: { type: { eq: 'LIMIT' } } } },
  { id: 'distinctStockViews', kind: 'distinct', match: { type: 'stock.viewed' }, prop: 'ticker' },
  {
    id: 'contraBuys',
    kind: 'threshold-event',
    match: { type: 'trade.placed', where: { side: { eq: 'BUY' } } },
    prop: 'dayChange',
    op: 'lte',
    value: -10,
  },
  {
    id: 'momoBuys',
    kind: 'threshold-event',
    match: { type: 'trade.placed', where: { side: { eq: 'BUY' } } },
    prop: 'dayChange',
    op: 'gte',
    value: 5,
  },
  { id: 'reflections', kind: 'count', match: { type: 'sell.reflected' } },
  { id: 'heldThroughDrop', kind: 'count', match: { type: 'position.heldThroughDrop' } },
  { id: 'macroQuestions', kind: 'count', match: { type: 'chat.sent', where: { macro: { eq: true } } } },
  // Gauge metrics
  { id: 'heldDistinct', kind: 'gauge', source: 'heldDistinct' },
  { id: 'etfHeld', kind: 'gauge', source: 'etfHeld' },
  { id: 'etfDistinct', kind: 'gauge', source: 'etfDistinct' },
  { id: 'cryptoHeld', kind: 'gauge', source: 'cryptoHeld' },
  { id: 'councilSize', kind: 'gauge', source: 'councilSize' },
  { id: 'positionOpen', kind: 'gauge', source: 'positionOpen' },
  // Duration
  {
    id: 'maxHoldDays',
    kind: 'duration',
    match: { type: 'trade.placed', where: { side: { eq: 'BUY' } } },
    since: 'first',
    while: 'positionOpen',
  },
]

const achievements = [
  { id: 'first_trade', condition: { metric: 'tradeCount', op: '>=', value: 1 } },
  { id: 'limit', condition: { metric: 'limitOrders', op: '>=', value: 1 } },
  { id: 'diversified', condition: { metric: 'heldDistinct', op: '>=', value: 5 } },
  { id: 'etf', condition: { metric: 'etfHeld', op: '>=', value: 1 } },
  { id: 'etf2', condition: { metric: 'etfDistinct', op: '>=', value: 3 } },
  { id: 'first_crypto', condition: { metric: 'cryptoHeld', op: '>=', value: 1 } },
  { id: 'researcher', condition: { metric: 'distinctStockViews', op: '>=', value: 10 } },
  { id: 'contrarian', condition: { metric: 'contraBuys', op: '>=', value: 1 } },
  { id: 'momentum', condition: { metric: 'momoBuys', op: '>=', value: 1 } },
  { id: 'patient', condition: { metric: 'maxHoldDays', op: '>=', value: 30 } },
  { id: 'long_term', condition: { metric: 'maxHoldDays', op: '>=', value: 90 } },
  { id: 'steady', condition: { metric: 'heldThroughDrop', op: '>=', value: 1 } },
  { id: 'reflection', condition: { metric: 'reflections', op: '>=', value: 1 } },
  { id: 'council', condition: { metric: 'councilSize', op: '>=', value: 2 } },
  {
    id: 'macro',
    condition: {
      all: [
        { metric: 'councilSize', op: '>=', value: 1 },
        { metric: 'macroQuestions', op: '>=', value: 1 },
      ],
    },
  },
]

function makeEngine(gauges = {}, nowMs) {
  const ports = createMemoryPorts({
    gauges: { [UID]: gauges },
    ...(nowMs !== undefined ? { now: () => nowMs } : {}),
  })
  const engine = createEngine({ metrics, achievements, ports })
  return { engine, ports }
}

function ev(type, props = {}, ts) {
  return { type, props, ...(ts !== undefined ? { ts } : {}) }
}

// ---------------------------------------------------------------------------
// E2E: first_trade unlocks after one trade.placed
// ---------------------------------------------------------------------------
describe('E2E: first_trade', () => {
  it('unlocks after one trade.placed event', async () => {
    const { engine } = makeEngine()
    await engine.track(UID, ev('trade.placed', { side: 'BUY', type: 'MARKET' }))
    const { unlocked } = await engine.evaluate(UID)
    const ids = unlocked.map((u) => u.id)
    expect(ids).toContain('first_trade')
  })

  it('does not unlock before any trade event', async () => {
    const { engine } = makeEngine()
    const { unlocked } = await engine.evaluate(UID)
    expect(unlocked.map((u) => u.id)).not.toContain('first_trade')
  })
})

// ---------------------------------------------------------------------------
// E2E: researcher unlocks after 10 distinct stock.viewed
// ---------------------------------------------------------------------------
describe('E2E: researcher', () => {
  it('unlocks after exactly 10 distinct tickers viewed', async () => {
    const { engine } = makeEngine()
    const tickers = ['AAPL', 'NVDA', 'TSLA', 'MSFT', 'AMZN', 'GOOG', 'META', 'NFLX', 'AMD', 'INTC']
    await engine.track(UID, tickers.map((t) => ev('stock.viewed', { ticker: t })))
    const { unlocked } = await engine.evaluate(UID)
    expect(unlocked.map((u) => u.id)).toContain('researcher')
  })

  it('does NOT unlock after only 9 distinct tickers', async () => {
    const { engine } = makeEngine()
    const tickers = ['AAPL', 'NVDA', 'TSLA', 'MSFT', 'AMZN', 'GOOG', 'META', 'NFLX', 'AMD']
    await engine.track(UID, tickers.map((t) => ev('stock.viewed', { ticker: t })))
    const { unlocked } = await engine.evaluate(UID)
    expect(unlocked.map((u) => u.id)).not.toContain('researcher')
  })

  it('duplicate views of same ticker do not count twice', async () => {
    const { engine } = makeEngine()
    // 5 unique tickers, each viewed twice
    const tickers = ['AAPL', 'NVDA', 'TSLA', 'MSFT', 'AMZN']
    await engine.track(UID, [
      ...tickers.map((t) => ev('stock.viewed', { ticker: t })),
      ...tickers.map((t) => ev('stock.viewed', { ticker: t })),
    ])
    const { unlocked } = await engine.evaluate(UID)
    expect(unlocked.map((u) => u.id)).not.toContain('researcher')
  })
})

// ---------------------------------------------------------------------------
// E2E: contrarian unlocks on a BUY with dayChange <= -10
// ---------------------------------------------------------------------------
describe('E2E: contrarian', () => {
  it('unlocks on BUY with dayChange = -10 (boundary)', async () => {
    const { engine } = makeEngine()
    await engine.track(UID, ev('trade.placed', { side: 'BUY', dayChange: -10 }))
    const { unlocked } = await engine.evaluate(UID)
    expect(unlocked.map((u) => u.id)).toContain('contrarian')
  })

  it('unlocks on BUY with dayChange < -10', async () => {
    const { engine } = makeEngine()
    await engine.track(UID, ev('trade.placed', { side: 'BUY', dayChange: -25 }))
    const { unlocked } = await engine.evaluate(UID)
    expect(unlocked.map((u) => u.id)).toContain('contrarian')
  })

  it('does NOT unlock on BUY with dayChange = -9 (above threshold)', async () => {
    const { engine } = makeEngine()
    await engine.track(UID, ev('trade.placed', { side: 'BUY', dayChange: -9 }))
    const { unlocked } = await engine.evaluate(UID)
    expect(unlocked.map((u) => u.id)).not.toContain('contrarian')
  })

  it('does NOT unlock on SELL even with dayChange <= -10', async () => {
    const { engine } = makeEngine()
    await engine.track(UID, ev('trade.placed', { side: 'SELL', dayChange: -20 }))
    const { unlocked } = await engine.evaluate(UID)
    expect(unlocked.map((u) => u.id)).not.toContain('contrarian')
  })
})

// ---------------------------------------------------------------------------
// E2E: diversified unlocks when held distinct reaches 5 (gauge)
// ---------------------------------------------------------------------------
describe('E2E: diversified', () => {
  it('unlocks when heldDistinct gauge = 5', async () => {
    const { engine } = makeEngine({ heldDistinct: 5 })
    const { unlocked } = await engine.evaluate(UID)
    expect(unlocked.map((u) => u.id)).toContain('diversified')
  })

  it('unlocks when heldDistinct gauge > 5', async () => {
    const { engine } = makeEngine({ heldDistinct: 7 })
    const { unlocked } = await engine.evaluate(UID)
    expect(unlocked.map((u) => u.id)).toContain('diversified')
  })

  it('does NOT unlock when heldDistinct = 4', async () => {
    const { engine } = makeEngine({ heldDistinct: 4 })
    const { unlocked } = await engine.evaluate(UID)
    expect(unlocked.map((u) => u.id)).not.toContain('diversified')
  })

  it('unlocks purely from gauge without any track() calls', async () => {
    const { engine } = makeEngine({ heldDistinct: 5 })
    // intentionally no track() — gauge is live from StateProvider
    const { unlocked } = await engine.evaluate(UID)
    expect(unlocked.map((u) => u.id)).toContain('diversified')
  })
})

// ---------------------------------------------------------------------------
// E2E: council unlocks at councilSize >= 2 (gauge)
// ---------------------------------------------------------------------------
describe('E2E: council', () => {
  it('unlocks at councilSize = 2', async () => {
    const { engine } = makeEngine({ councilSize: 2 })
    const { unlocked } = await engine.evaluate(UID)
    expect(unlocked.map((u) => u.id)).toContain('council')
  })

  it('does NOT unlock at councilSize = 1', async () => {
    const { engine } = makeEngine({ councilSize: 1 })
    const { unlocked } = await engine.evaluate(UID)
    expect(unlocked.map((u) => u.id)).not.toContain('council')
  })

  it('does NOT unlock at councilSize = 0', async () => {
    const { engine } = makeEngine({ councilSize: 0 })
    const { unlocked } = await engine.evaluate(UID)
    expect(unlocked.map((u) => u.id)).not.toContain('council')
  })
})

// ---------------------------------------------------------------------------
// E2E: patient unlocks when maxHoldDays >= 30 (clock-advance + positionOpen guard)
// ---------------------------------------------------------------------------
describe('E2E: patient', () => {
  it('unlocks when maxHoldDays >= 30 via injected clock', async () => {
    const fixedNow = 200 * MS_PER_DAY
    const { engine } = makeEngine({ positionOpen: 1 }, fixedNow)
    // Simulate a BUY 35 days before our fixed clock
    const buyTs = fixedNow - 35 * MS_PER_DAY
    await engine.track(UID, ev('trade.placed', { side: 'BUY' }, buyTs))
    const { unlocked } = await engine.evaluate(UID)
    expect(unlocked.map((u) => u.id)).toContain('patient')
  })

  it('does NOT unlock when only 29 days have elapsed', async () => {
    const fixedNow = 200 * MS_PER_DAY
    const { engine } = makeEngine({ positionOpen: 1 }, fixedNow)
    const buyTs = fixedNow - 29 * MS_PER_DAY
    await engine.track(UID, ev('trade.placed', { side: 'BUY' }, buyTs))
    const { unlocked } = await engine.evaluate(UID)
    expect(unlocked.map((u) => u.id)).not.toContain('patient')
  })

  it('does NOT unlock when positionOpen guard is 0 (position closed)', async () => {
    const fixedNow = 200 * MS_PER_DAY
    const { engine } = makeEngine({ positionOpen: 0 }, fixedNow)
    const buyTs = fixedNow - 60 * MS_PER_DAY
    await engine.track(UID, ev('trade.placed', { side: 'BUY' }, buyTs))
    const { unlocked } = await engine.evaluate(UID)
    expect(unlocked.map((u) => u.id)).not.toContain('patient')
  })
})

// ---------------------------------------------------------------------------
// E2E: macro — composite all: councilSize>=1 AND macro chat.sent
// ---------------------------------------------------------------------------
describe('E2E: macro', () => {
  it('unlocks when councilSize>=1 AND at least one macro chat.sent', async () => {
    const { engine } = makeEngine({ councilSize: 1 })
    await engine.track(UID, ev('chat.sent', { macro: true }))
    const { unlocked } = await engine.evaluate(UID)
    expect(unlocked.map((u) => u.id)).toContain('macro')
  })

  it('does NOT unlock when councilSize=0 even with macro question', async () => {
    const { engine } = makeEngine({ councilSize: 0 })
    await engine.track(UID, ev('chat.sent', { macro: true }))
    const { unlocked } = await engine.evaluate(UID)
    expect(unlocked.map((u) => u.id)).not.toContain('macro')
  })

  it('does NOT unlock when councilSize>=1 but no macro question sent', async () => {
    const { engine } = makeEngine({ councilSize: 2 })
    await engine.track(UID, ev('chat.sent', { macro: false }))
    const { unlocked } = await engine.evaluate(UID)
    expect(unlocked.map((u) => u.id)).not.toContain('macro')
  })

  it('does NOT unlock when chat.sent has no macro flag', async () => {
    const { engine } = makeEngine({ councilSize: 2 })
    await engine.track(UID, ev('chat.sent', {}))
    const { unlocked } = await engine.evaluate(UID)
    expect(unlocked.map((u) => u.id)).not.toContain('macro')
  })

  it('council NOT required for macro — only councilSize>=1 is (council requires >=2)', async () => {
    // macro needs councilSize >= 1; council badge needs >= 2
    const { engine } = makeEngine({ councilSize: 1 })
    await engine.track(UID, ev('chat.sent', { macro: true }))
    const { unlocked } = await engine.evaluate(UID)
    const ids = unlocked.map((u) => u.id)
    expect(ids).toContain('macro')
    expect(ids).not.toContain('council')
  })
})

// ---------------------------------------------------------------------------
// E2E: multiple simultaneous unlocks — reveal queue source
// ---------------------------------------------------------------------------
describe('E2E: multiple simultaneous unlocks', () => {
  it('returns multiple unlocks in a single evaluate() call', async () => {
    // contrarian + first_trade both satisfied at once
    const { engine } = makeEngine()
    await engine.track(UID, ev('trade.placed', { side: 'BUY', dayChange: -15 }))
    const { unlocked } = await engine.evaluate(UID)
    const ids = unlocked.map((u) => u.id)
    expect(ids).toContain('first_trade')
    expect(ids).toContain('contrarian')
    expect(unlocked.length).toBeGreaterThanOrEqual(2)
  })

  it('second evaluate() returns empty after all satisfied in first', async () => {
    const { engine } = makeEngine()
    await engine.track(UID, ev('trade.placed', { side: 'BUY', dayChange: -15 }))
    await engine.evaluate(UID)
    const { unlocked } = await engine.evaluate(UID)
    expect(unlocked).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// E2E: already-earned excluded (silent backfill pattern)
// ---------------------------------------------------------------------------
describe('E2E: already-earned exclusion', () => {
  it('previously awarded badges do not re-appear in unlocked', async () => {
    const { engine, ports } = makeEngine()
    // Manually mark first_trade as already earned
    await ports.achievementStore.award(UID, ['first_trade'])
    await engine.track(UID, ev('trade.placed', { side: 'BUY' }))
    const { unlocked } = await engine.evaluate(UID)
    expect(unlocked.map((u) => u.id)).not.toContain('first_trade')
  })
})

// ---------------------------------------------------------------------------
// E2E: progress pct clamped 0..100 across the full config
// ---------------------------------------------------------------------------
describe('E2E: progress pct clamping', () => {
  it('progress pct never exceeds 100 even when value far exceeds target', async () => {
    const { engine } = makeEngine()
    // Track 50 distinct tickers (target is 10)
    const tickers = Array.from({ length: 50 }, (_, i) => `TICK${i}`)
    await engine.track(UID, tickers.map((t) => ev('stock.viewed', { ticker: t })))
    const bars = await engine.progress(UID)
    const researcherBar = bars.find((b) => b.id === 'researcher')
    expect(researcherBar).toBeDefined()
    expect(researcherBar.pct).toBeLessThanOrEqual(100)
    expect(researcherBar.pct).toBeGreaterThanOrEqual(0)
  })

  it('progress pct is 0 for 0/target', async () => {
    const { engine } = makeEngine()
    const bars = await engine.progress(UID)
    const firstTradeBar = bars.find((b) => b.id === 'first_trade')
    expect(firstTradeBar).toBeDefined()
    expect(firstTradeBar.pct).toBe(0)
  })
})
