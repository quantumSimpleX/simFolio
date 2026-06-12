import { describe, it, expect, vi, afterEach } from 'vitest'
import { isMarketOpen } from '../hooks/useQuotes'
import { TRANSACTION_FEE } from '../lib/fees'

afterEach(() => vi.useRealTimers())

const setTime = (iso) => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(iso))
}

describe('client isMarketOpen', () => {
  it('open mid-session on a weekday', () => {
    setTime('2026-06-10T15:00:00Z') // Wed 11:00 ET
    expect(isMarketOpen()).toBe(true)
  })
  it('closed on Saturday', () => {
    setTime('2026-06-13T15:00:00Z')
    expect(isMarketOpen()).toBe(false)
  })
  it('closed on July 3rd 2026 (observed Independence Day)', () => {
    setTime('2026-07-03T15:00:00Z')
    expect(isMarketOpen()).toBe(false)
  })
  it('closed overnight', () => {
    setTime('2026-06-10T03:00:00Z')
    expect(isMarketOpen()).toBe(false)
  })
})

describe('fees', () => {
  it('flat transaction fee is $1.00', () => {
    expect(TRANSACTION_FEE).toBe(1.0)
  })
})
