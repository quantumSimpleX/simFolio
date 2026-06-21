// UT-B3 — stateProvider adapter tests (pure given injected fns, no IO)
// Coverage target: >90% lines on src/gamification/stateProvider.js

import { describe, it, expect, vi } from 'vitest'
import { createStateProvider } from '../gamification/stateProvider'

// Helper: build a position row
const pos = (ticker, asset_type, total_qty = 1) => ({ ticker, asset_type, total_qty })

function makeProvider(positions, councilSize = 0) {
  const getPositions   = vi.fn().mockResolvedValue(positions)
  const getCouncilSize = vi.fn().mockResolvedValue(councilSize)
  const provider = createStateProvider({ getPositions, getCouncilSize })
  return { provider, getPositions, getCouncilSize }
}

describe('stateProvider — gauge derivations', () => {
  it('returns all-zero gauges when portfolio is empty', async () => {
    const { provider } = makeProvider([])
    const state = await provider.read('user-1')
    expect(state).toEqual({
      heldDistinct: 0,
      etfHeld: 0,
      etfDistinct: 0,
      cryptoHeld: 0,
      councilSize: 0,
      positionOpen: 0,
    })
  })

  it('derives heldDistinct as count of distinct tickers with qty > 0', async () => {
    const positions = [
      pos('AAPL', 'STOCK', 5),
      pos('MSFT', 'STOCK', 2),
      pos('AAPL', 'STOCK', 1), // duplicate ticker — should not double-count
    ]
    const { provider } = makeProvider(positions)
    const state = await provider.read('user-1')
    expect(state.heldDistinct).toBe(2) // AAPL + MSFT (deduplicated)
  })

  it('excludes zero-qty positions from heldDistinct', async () => {
    const positions = [
      pos('AAPL', 'STOCK', 5),
      pos('TSLA', 'STOCK', 0),
      pos('MSFT', 'STOCK', 0),
    ]
    const { provider } = makeProvider(positions)
    const state = await provider.read('user-1')
    expect(state.heldDistinct).toBe(1) // only AAPL
  })

  it('derives etfHeld as count of ETF positions with qty > 0', async () => {
    const positions = [
      pos('VTI', 'ETF', 10),
      pos('QQQ', 'ETF', 5),
      pos('AAPL', 'STOCK', 3),
    ]
    const { provider } = makeProvider(positions)
    const state = await provider.read('user-1')
    expect(state.etfHeld).toBe(2)
  })

  it('excludes zero-qty ETF positions from etfHeld', async () => {
    const positions = [
      pos('VTI', 'ETF', 0),
      pos('QQQ', 'ETF', 5),
    ]
    const { provider } = makeProvider(positions)
    const state = await provider.read('user-1')
    expect(state.etfHeld).toBe(1)
  })

  it('derives etfDistinct as count of distinct ETF tickers with qty > 0', async () => {
    const positions = [
      pos('VTI', 'ETF', 10),
      pos('QQQ', 'ETF', 5),
      pos('SPY', 'ETF', 3),
      pos('VTI', 'ETF', 2), // same ticker again
    ]
    const { provider } = makeProvider(positions)
    const state = await provider.read('user-1')
    expect(state.etfDistinct).toBe(3) // VTI, QQQ, SPY
  })

  it('derives cryptoHeld as count of CRYPTO positions with qty > 0', async () => {
    const positions = [
      pos('BTC', 'CRYPTO', 0.5),
      pos('ETH', 'CRYPTO', 2),
      pos('AAPL', 'STOCK', 3),
    ]
    const { provider } = makeProvider(positions)
    const state = await provider.read('user-1')
    expect(state.cryptoHeld).toBe(2)
  })

  it('excludes zero-qty CRYPTO positions from cryptoHeld', async () => {
    const positions = [
      pos('BTC', 'CRYPTO', 0),
      pos('ETH', 'CRYPTO', 1),
    ]
    const { provider } = makeProvider(positions)
    const state = await provider.read('user-1')
    expect(state.cryptoHeld).toBe(1)
  })

  it('derives councilSize from getCouncilSize', async () => {
    const { provider } = makeProvider([], 3)
    const state = await provider.read('user-1')
    expect(state.councilSize).toBe(3)
  })

  it('defaults councilSize to 0 when getCouncilSize returns null', async () => {
    const getPositions   = vi.fn().mockResolvedValue([])
    const getCouncilSize = vi.fn().mockResolvedValue(null)
    const provider = createStateProvider({ getPositions, getCouncilSize })
    const state = await provider.read('user-1')
    expect(state.councilSize).toBe(0)
  })

  it('sets positionOpen to 1 when any position has qty > 0', async () => {
    const positions = [pos('AAPL', 'STOCK', 5), pos('TSLA', 'STOCK', 0)]
    const { provider } = makeProvider(positions)
    const state = await provider.read('user-1')
    expect(state.positionOpen).toBe(1)
  })

  it('sets positionOpen to 0 when all positions have qty = 0', async () => {
    const positions = [pos('AAPL', 'STOCK', 0), pos('TSLA', 'STOCK', 0)]
    const { provider } = makeProvider(positions)
    const state = await provider.read('user-1')
    expect(state.positionOpen).toBe(0)
  })

  it('sets positionOpen to 0 when portfolio is empty', async () => {
    const { provider } = makeProvider([])
    const state = await provider.read('user-1')
    expect(state.positionOpen).toBe(0)
  })

  it('handles getPositions returning null (treats as empty)', async () => {
    const getPositions   = vi.fn().mockResolvedValue(null)
    const getCouncilSize = vi.fn().mockResolvedValue(0)
    const provider = createStateProvider({ getPositions, getCouncilSize })
    const state = await provider.read('user-1')
    expect(state.heldDistinct).toBe(0)
    expect(state.positionOpen).toBe(0)
  })

  it('handles total_qty as a string (parseFloat coercion)', async () => {
    // DB returns numeric columns as strings in some drivers
    const positions = [{ ticker: 'AAPL', asset_type: 'STOCK', total_qty: '3.5' }]
    const { provider } = makeProvider(positions)
    const state = await provider.read('user-1')
    expect(state.heldDistinct).toBe(1)
    expect(state.positionOpen).toBe(1)
  })

  it('treats missing total_qty (undefined) as zero — excludes from held', async () => {
    const positions = [{ ticker: 'AAPL', asset_type: 'STOCK' }] // no total_qty field
    const { provider } = makeProvider(positions)
    const state = await provider.read('user-1')
    expect(state.heldDistinct).toBe(0)
  })

  it('mixed portfolio: STOCK/ETF/CRYPTO — all gauges correct simultaneously', async () => {
    const positions = [
      pos('AAPL', 'STOCK', 5),
      pos('MSFT', 'STOCK', 3),
      pos('VTI',  'ETF',   10),
      pos('QQQ',  'ETF',   4),
      pos('SPY',  'ETF',   2),
      pos('BTC',  'CRYPTO', 0.1),
      pos('TSLA', 'STOCK', 0),  // sold — excluded everywhere
    ]
    const { provider } = makeProvider(positions, 2)
    const state = await provider.read('user-1')

    expect(state.heldDistinct).toBe(6)   // AAPL MSFT VTI QQQ SPY BTC
    expect(state.etfHeld).toBe(3)         // VTI QQQ SPY
    expect(state.etfDistinct).toBe(3)     // VTI QQQ SPY (all distinct)
    expect(state.cryptoHeld).toBe(1)      // BTC
    expect(state.councilSize).toBe(2)
    expect(state.positionOpen).toBe(1)
  })
})
