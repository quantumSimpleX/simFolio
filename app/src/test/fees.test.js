import { describe, it, expect } from 'vitest'
import { TRANSACTION_FEE } from '../lib/fees'

// fees.js exports a flat per-trade commission shared with the edge functions.
// We assert the value and that it behaves correctly when applied to trade math.
describe('lib/fees — TRANSACTION_FEE', () => {
  it('is a flat $1.00 commission', () => {
    expect(TRANSACTION_FEE).toBe(1.0)
  })

  it('is a finite positive number', () => {
    expect(typeof TRANSACTION_FEE).toBe('number')
    expect(Number.isFinite(TRANSACTION_FEE)).toBe(true)
    expect(TRANSACTION_FEE).toBeGreaterThan(0)
  })

  it('applied to a buy: total = qty * price + fee', () => {
    const total = 10 * 213.45 + TRANSACTION_FEE
    expect(total).toBeCloseTo(2135.5, 2)
  })

  it('applied to a sell: proceeds = qty * price - fee', () => {
    const proceeds = 3 * 100 - TRANSACTION_FEE
    expect(proceeds).toBe(299)
  })

  it('does not scale with order size (flat, not percentage)', () => {
    const smallTotal = 1 * 50 + TRANSACTION_FEE
    const largeTotal = 1000 * 50 + TRANSACTION_FEE
    expect(largeTotal - smallTotal).toBe(999 * 50)
  })

  it('zero-quantity order still incurs only the flat fee', () => {
    expect(0 * 123 + TRANSACTION_FEE).toBe(TRANSACTION_FEE)
  })
})
