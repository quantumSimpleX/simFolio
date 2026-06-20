import { describe, it, expect } from 'vitest'
import { evaluateEarned, EXECUTION_RULES, BEHAVIORAL_STUBS } from '../lib/achievements'

const pos = (ticker, asset_type, total_qty = 1) => ({ ticker, asset_type, total_qty })
const order = (over = {}) => ({ type: 'MARKET', side: 'BUY', ...over })

describe('evaluateEarned', () => {
  it('awards nothing with no activity', () => {
    expect(evaluateEarned({ orders: [], positions: [] }).size).toBe(0)
  })

  it('first_trade on any order', () => {
    expect(evaluateEarned({ orders: [order()], positions: [] }).has('first_trade')).toBe(true)
  })

  it('limit only when a LIMIT order exists', () => {
    expect(evaluateEarned({ orders: [order()], positions: [] }).has('limit')).toBe(false)
    expect(evaluateEarned({ orders: [order({ type: 'LIMIT' })], positions: [] }).has('limit')).toBe(true)
  })

  it('diversified needs 5 distinct held tickers', () => {
    const four = ['A', 'B', 'C', 'D'].map((t) => pos(t, 'STOCK'))
    expect(evaluateEarned({ orders: [], positions: four }).has('diversified')).toBe(false)
    expect(evaluateEarned({ orders: [], positions: [...four, pos('E', 'STOCK')] }).has('diversified')).toBe(true)
  })

  it('ignores positions with zero qty', () => {
    const held = ['A', 'B', 'C', 'D'].map((t) => pos(t, 'STOCK'))
    const sold = pos('E', 'STOCK', 0)
    expect(evaluateEarned({ orders: [], positions: [...held, sold] }).has('diversified')).toBe(false)
  })

  it('etf and etf2 by ETF holdings', () => {
    const oneEtf = [pos('VTI', 'ETF')]
    expect(evaluateEarned({ orders: [], positions: oneEtf }).has('etf')).toBe(true)
    expect(evaluateEarned({ orders: [], positions: oneEtf }).has('etf2')).toBe(false)
    const threeEtf = [pos('VTI', 'ETF'), pos('QQQ', 'ETF'), pos('SPY', 'ETF')]
    expect(evaluateEarned({ orders: [], positions: threeEtf }).has('etf2')).toBe(true)
  })

  it('first_crypto by crypto holding', () => {
    expect(evaluateEarned({ orders: [], positions: [pos('BTC', 'CRYPTO')] }).has('first_crypto')).toBe(true)
  })

  it('tolerates undefined inputs', () => {
    expect(evaluateEarned({}).size).toBe(0)
  })

  it('rules and stubs do not overlap', () => {
    const ruleIds = new Set(EXECUTION_RULES.map((r) => r.id))
    expect(BEHAVIORAL_STUBS.some((id) => ruleIds.has(id))).toBe(false)
  })
})
