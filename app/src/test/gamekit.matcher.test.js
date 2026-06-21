// UT-A1 — matcher.test.js
// Tests for matchEvent() and compare() in app/src/gamekit/matcher.js

import { describe, it, expect } from 'vitest'
import { matchEvent, compare } from '../gamekit/matcher'

// ---------------------------------------------------------------------------
// compare()
// ---------------------------------------------------------------------------
describe('compare', () => {
  it('eq: strict equality', () => {
    expect(compare('BUY', 'eq', 'BUY')).toBe(true)
    expect(compare('BUY', 'eq', 'SELL')).toBe(false)
    expect(compare(0, 'eq', 0)).toBe(true)
    expect(compare(0, 'eq', false)).toBe(false)
  })

  it('ne: strict inequality', () => {
    expect(compare('BUY', 'ne', 'SELL')).toBe(true)
    expect(compare('BUY', 'ne', 'BUY')).toBe(false)
  })

  it('gt: value > target', () => {
    expect(compare(5, 'gt', 4)).toBe(true)
    expect(compare(4, 'gt', 4)).toBe(false)
    expect(compare(3, 'gt', 4)).toBe(false)
  })

  it('gte: value >= target', () => {
    expect(compare(4, 'gte', 4)).toBe(true)
    expect(compare(5, 'gte', 4)).toBe(true)
    expect(compare(3, 'gte', 4)).toBe(false)
  })

  it('lt: value < target', () => {
    expect(compare(3, 'lt', 4)).toBe(true)
    expect(compare(4, 'lt', 4)).toBe(false)
    expect(compare(5, 'lt', 4)).toBe(false)
  })

  it('lte: value <= target', () => {
    expect(compare(4, 'lte', 4)).toBe(true)
    expect(compare(3, 'lte', 4)).toBe(true)
    expect(compare(5, 'lte', 4)).toBe(false)
  })

  it('in: value in array', () => {
    expect(compare('BUY', 'in', ['BUY', 'SELL'])).toBe(true)
    expect(compare('HOLD', 'in', ['BUY', 'SELL'])).toBe(false)
    expect(compare('BUY', 'in', [])).toBe(false)
    // non-array target: false
    expect(compare('BUY', 'in', 'BUY')).toBe(false)
  })

  it('undefined/null value does not satisfy ordered ops (gt/gte/lt/lte)', () => {
    expect(compare(undefined, 'gt', 0)).toBe(false)
    expect(compare(undefined, 'gte', 0)).toBe(false)
    expect(compare(undefined, 'lt', 100)).toBe(false)
    expect(compare(undefined, 'lte', 100)).toBe(false)
    expect(compare(null, 'gt', 0)).toBe(false)
    expect(compare(null, 'gte', 0)).toBe(false)
  })

  it('unknown op returns false', () => {
    expect(compare(5, 'between', 1)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// matchEvent()
// ---------------------------------------------------------------------------
describe('matchEvent', () => {
  const ev = (type, props = {}) => ({ type, props })

  it('matches when type matches and no where clause', () => {
    expect(matchEvent(ev('trade.placed'), { type: 'trade.placed' })).toBe(true)
  })

  it('rejects mismatched type', () => {
    expect(matchEvent(ev('stock.viewed'), { type: 'trade.placed' })).toBe(false)
  })

  it('empty matcher {} matches any event', () => {
    expect(matchEvent(ev('trade.placed'), {})).toBe(true)
    expect(matchEvent(ev('anything'), {})).toBe(true)
  })

  it('undefined matcher matches any event', () => {
    expect(matchEvent(ev('trade.placed'), undefined)).toBe(true)
  })

  it('where.eq filters on prop value', () => {
    const matcher = { type: 'trade.placed', where: { side: { eq: 'BUY' } } }
    expect(matchEvent(ev('trade.placed', { side: 'BUY' }), matcher)).toBe(true)
    expect(matchEvent(ev('trade.placed', { side: 'SELL' }), matcher)).toBe(false)
  })

  it('where.ne filters on prop value', () => {
    const matcher = { type: 'trade.placed', where: { side: { ne: 'SELL' } } }
    expect(matchEvent(ev('trade.placed', { side: 'BUY' }), matcher)).toBe(true)
    expect(matchEvent(ev('trade.placed', { side: 'SELL' }), matcher)).toBe(false)
  })

  it('where.gt / gte / lt / lte work', () => {
    const matcherGt = { where: { dayChange: { gt: 5 } } }
    expect(matchEvent(ev('t', { dayChange: 6 }), matcherGt)).toBe(true)
    expect(matchEvent(ev('t', { dayChange: 5 }), matcherGt)).toBe(false)

    const matcherLte = { where: { dayChange: { lte: -10 } } }
    expect(matchEvent(ev('t', { dayChange: -10 }), matcherLte)).toBe(true)
    expect(matchEvent(ev('t', { dayChange: -9 }), matcherLte)).toBe(false)
  })

  it('where.in matches array membership', () => {
    const matcher = { where: { type: { in: ['LIMIT', 'STOP'] } } }
    expect(matchEvent(ev('t', { type: 'LIMIT' }), matcher)).toBe(true)
    expect(matchEvent(ev('t', { type: 'MARKET' }), matcher)).toBe(false)
  })

  it('multiple where conditions — all must pass (AND semantics)', () => {
    const matcher = {
      type: 'trade.placed',
      where: { side: { eq: 'BUY' }, dayChange: { lte: -10 } },
    }
    expect(matchEvent(ev('trade.placed', { side: 'BUY', dayChange: -15 }), matcher)).toBe(true)
    expect(matchEvent(ev('trade.placed', { side: 'BUY', dayChange: 2 }), matcher)).toBe(false)
    expect(matchEvent(ev('trade.placed', { side: 'SELL', dayChange: -15 }), matcher)).toBe(false)
  })

  it('missing/undefined props do not throw and do not match gt/lt', () => {
    const matcher = { where: { dayChange: { gt: 0 } } }
    // props is present but key is missing
    expect(() => matchEvent(ev('t', {}), matcher)).not.toThrow()
    expect(matchEvent(ev('t', {}), matcher)).toBe(false)
    // props itself is absent
    expect(() => matchEvent({ type: 't' }, matcher)).not.toThrow()
    expect(matchEvent({ type: 't' }, matcher)).toBe(false)
  })

  it('missing prop satisfies eq undefined but not gt', () => {
    const eqMatcher = { where: { side: { eq: undefined } } }
    // eq with undefined prop and undefined target matches
    expect(matchEvent(ev('t', {}), eqMatcher)).toBe(true)
  })
})
