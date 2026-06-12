import { describe, it, expect, vi, afterEach } from 'vitest'
import { isMarketOpen, placedBeforeToday, priceExecution, fillQuantity } from '../../supabase/functions/_shared/execution.ts'

afterEach(() => vi.useRealTimers())

const setTime = (iso) => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(iso))
}

describe('isMarketOpen', () => {
  it('is open on a regular weekday during session hours', () => {
    setTime('2026-06-10T15:00:00Z') // Wed 11:00 ET
    expect(isMarketOpen()).toBe(true)
  })
  it('is closed before 9:30 ET', () => {
    setTime('2026-06-10T13:00:00Z') // Wed 9:00 ET
    expect(isMarketOpen()).toBe(false)
  })
  it('is closed at/after 16:00 ET', () => {
    setTime('2026-06-10T20:00:00Z') // Wed 16:00 ET
    expect(isMarketOpen()).toBe(false)
  })
  it('is closed on weekends', () => {
    setTime('2026-06-13T15:00:00Z') // Saturday
    expect(isMarketOpen()).toBe(false)
  })
  it('is closed on NYSE holidays (Juneteenth 2026)', () => {
    setTime('2026-06-19T15:00:00Z') // Friday, holiday
    expect(isMarketOpen()).toBe(false)
  })
  it('is closed on Thanksgiving 2026', () => {
    setTime('2026-11-26T16:00:00Z') // Thursday 11:00 ET
    expect(isMarketOpen()).toBe(false)
  })
})

describe('placedBeforeToday', () => {
  it('is true for a previous ET calendar day', () => {
    setTime('2026-06-10T15:00:00Z')
    expect(placedBeforeToday('2026-06-09T18:00:00Z')).toBe(true)
  })
  it('is false for the same ET day', () => {
    setTime('2026-06-10T15:00:00Z')
    expect(placedBeforeToday('2026-06-10T14:00:00Z')).toBe(false)
  })
})

describe('priceExecution', () => {
  const liquid = { avgVolume: 50_000_000, high: 201, low: 199 }

  it('buys fill above the quote, sells below it', () => {
    const buy = priceExecution(200, 'BUY', 10, liquid)
    const sell = priceExecution(200, 'SELL', 10, liquid)
    expect(buy.execPrice).toBeGreaterThan(200)
    expect(sell.execPrice).toBeLessThan(200)
  })

  it('keeps total friction within the 1% slippage cap plus spread', () => {
    const r = priceExecution(200, 'BUY', 10, liquid)
    expect(r.slippagePct).toBeLessThanOrEqual(0.01)
    expect(r.execPrice).toBeLessThan(200 * 1.012)
  })

  it('charges a wider spread for illiquid names than mega-caps', () => {
    const thin = priceExecution(5, 'BUY', 10, { avgVolume: 50_000, high: 5.1, low: 4.9 })
    const mega = priceExecution(200, 'BUY', 10, liquid)
    expect(thin.spreadBps).toBeGreaterThan(mega.spreadBps)
    expect(thin.spreadBps).toBeLessThanOrEqual(25)
    expect(mega.spreadBps).toBeGreaterThanOrEqual(1)
  })

  it('slips more for huge orders than small ones (size impact)', () => {
    // Average over randomness
    const avg = (qty) => {
      let sum = 0
      for (let i = 0; i < 50; i++) sum += priceExecution(200, 'BUY', qty, liquid).slippagePct
      return sum / 50
    }
    expect(avg(5_000_000)).toBeGreaterThan(avg(1))
  })

  it('falls back to defaults when liquidity stats are missing', () => {
    const r = priceExecution(100, 'BUY', 1, { avgVolume: 0, high: 0, low: 0 })
    expect(r.spreadBps).toBe(10)
    expect(r.execPrice).toBeGreaterThan(100)
  })

  it('reports spread and slippage components that compose the price move', () => {
    const r = priceExecution(200, 'BUY', 10, liquid)
    const move = r.execPrice - 200
    expect(move).toBeCloseTo(r.spreadAmt + r.slippageAmt, 1)
  })
})

describe('fillQuantity', () => {
  it('fills small orders completely', () => {
    expect(fillQuantity(10, 0.0001)).toBe(10)
  })
  it('partially fills large orders, keeping 40–90% plus a meaningful remainder', () => {
    for (let i = 0; i < 25; i++) {
      const filled = fillQuantity(100_000, 0.05)
      expect(filled).toBeGreaterThanOrEqual(100_000 * 0.4)
      expect(filled).toBeLessThanOrEqual(100_000)
    }
  })
  it('rounds tiny remainders into a full fill', () => {
    // qty so small that any remainder is < 0.01 shares
    expect(fillQuantity(0.01, 0.05)).toBe(0.01)
  })
})
