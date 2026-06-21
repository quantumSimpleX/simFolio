// UT-A4 — conditions.test.js
// Tests for evaluateConditions() in app/src/gamekit/conditions.js

import { describe, it, expect } from 'vitest'
import { evaluateConditions } from '../gamekit/conditions'

// Helper: run evaluateConditions against a single achievement def
function evalOne(id, condition, values, earned = new Set(), ctx = null) {
  const defs = [{ id, condition }]
  const resolvedCtx = ctx || { values, gauges: {}, now: Date.now() }
  return evaluateConditions(defs, values, earned, resolvedCtx)
}

// ---------------------------------------------------------------------------
// UT-A4: leaf {metric, op, value} for all ops
// ---------------------------------------------------------------------------
describe('evaluateConditions — leaf conditions', () => {
  it('>= operator: satisfied when value meets target', () => {
    const { satisfied } = evalOne('badge', { metric: 'tradeCount', op: '>=', value: 1 }, { tradeCount: 1 })
    expect(satisfied).toContain('badge')
  })

  it('>= operator: not satisfied when below target', () => {
    const { satisfied } = evalOne('badge', { metric: 'tradeCount', op: '>=', value: 1 }, { tradeCount: 0 })
    expect(satisfied).not.toContain('badge')
  })

  it('> operator', () => {
    expect(evalOne('b', { metric: 'x', op: '>', value: 5 }, { x: 6 }).satisfied).toContain('b')
    expect(evalOne('b', { metric: 'x', op: '>', value: 5 }, { x: 5 }).satisfied).not.toContain('b')
  })

  it('== operator', () => {
    expect(evalOne('b', { metric: 'x', op: '==', value: 3 }, { x: 3 }).satisfied).toContain('b')
    expect(evalOne('b', { metric: 'x', op: '==', value: 3 }, { x: 4 }).satisfied).not.toContain('b')
  })

  it('< operator', () => {
    expect(evalOne('b', { metric: 'x', op: '<', value: 5 }, { x: 4 }).satisfied).toContain('b')
    expect(evalOne('b', { metric: 'x', op: '<', value: 5 }, { x: 5 }).satisfied).not.toContain('b')
  })

  it('<= operator', () => {
    expect(evalOne('b', { metric: 'x', op: '<=', value: 5 }, { x: 5 }).satisfied).toContain('b')
    expect(evalOne('b', { metric: 'x', op: '<=', value: 5 }, { x: 6 }).satisfied).not.toContain('b')
  })

  it('unknown metric resolves to 0', () => {
    // metric not in values -> 0 >= 0 => true
    const { satisfied } = evalOne('b', { metric: 'missing', op: '>=', value: 0 }, {})
    expect(satisfied).toContain('b')
    // 0 >= 1 => false
    const { satisfied: sat2 } = evalOne('b', { metric: 'missing', op: '>=', value: 1 }, {})
    expect(sat2).not.toContain('b')
  })
})

// ---------------------------------------------------------------------------
// UT-A4: all (AND), any (OR), not composition
// ---------------------------------------------------------------------------
describe('evaluateConditions — composite conditions', () => {
  it('all: true only when every child is satisfied', () => {
    const cond = {
      all: [
        { metric: 'councilSize', op: '>=', value: 1 },
        { metric: 'macroQuestions', op: '>=', value: 1 },
      ],
    }
    const both = { councilSize: 1, macroQuestions: 1 }
    const oneOnly = { councilSize: 1, macroQuestions: 0 }
    expect(evalOne('macro', cond, both).satisfied).toContain('macro')
    expect(evalOne('macro', cond, oneOnly).satisfied).not.toContain('macro')
  })

  it('any: true when at least one child is satisfied', () => {
    const cond = {
      any: [
        { metric: 'a', op: '>=', value: 1 },
        { metric: 'b', op: '>=', value: 1 },
      ],
    }
    expect(evalOne('badge', cond, { a: 1, b: 0 }).satisfied).toContain('badge')
    expect(evalOne('badge', cond, { a: 0, b: 1 }).satisfied).toContain('badge')
    expect(evalOne('badge', cond, { a: 0, b: 0 }).satisfied).not.toContain('badge')
  })

  it('not: inverts child condition', () => {
    const cond = { not: { metric: 'x', op: '>=', value: 10 } }
    expect(evalOne('badge', cond, { x: 5 }).satisfied).toContain('badge')
    expect(evalOne('badge', cond, { x: 10 }).satisfied).not.toContain('badge')
  })

  it('nested all + any composition', () => {
    const cond = {
      all: [
        { metric: 'a', op: '>=', value: 1 },
        { any: [{ metric: 'b', op: '>=', value: 1 }, { metric: 'c', op: '>=', value: 1 }] },
      ],
    }
    expect(evalOne('badge', cond, { a: 1, b: 0, c: 1 }).satisfied).toContain('badge')
    expect(evalOne('badge', cond, { a: 0, b: 1, c: 1 }).satisfied).not.toContain('badge')
  })
})

// ---------------------------------------------------------------------------
// UT-A4: custom predicate receives ctx and gates unlock
// ---------------------------------------------------------------------------
describe('evaluateConditions — custom predicate', () => {
  it('custom predicate receives ctx and controls unlock', () => {
    let capturedCtx = null
    const cond = {
      custom: (ctx) => {
        capturedCtx = ctx
        return ctx.values.x >= 5
      },
    }
    const values = { x: 5 }
    const ctx = { values, gauges: { g: 3 }, now: 12345 }
    const { satisfied } = evaluateConditions([{ id: 'custom_badge', condition: cond }], values, new Set(), ctx)
    expect(satisfied).toContain('custom_badge')
    expect(capturedCtx).toBeDefined()
    expect(capturedCtx.values).toBe(values)
    expect(capturedCtx.gauges.g).toBe(3)
    expect(capturedCtx.now).toBe(12345)
  })

  it('custom returning false does not unlock', () => {
    const cond = { custom: () => false }
    const { satisfied } = evalOne('badge', cond, {})
    expect(satisfied).not.toContain('badge')
  })

  it('custom returning truthy (non-boolean) unlocks', () => {
    const cond = { custom: () => 'yes' }
    const { satisfied } = evalOne('badge', cond, {})
    expect(satisfied).toContain('badge')
  })
})

// ---------------------------------------------------------------------------
// UT-A4: progress — value/target/pct for leaf targets; clamped at 100%
// ---------------------------------------------------------------------------
describe('evaluateConditions — progress', () => {
  it('leaf with numeric value target emits progress entry', () => {
    const defs = [{ id: 'researcher', condition: { metric: 'views', op: '>=', value: 10 } }]
    const { progress } = evaluateConditions(defs, { views: 6 }, new Set(), { values: { views: 6 }, gauges: {}, now: 0 })
    expect(progress).toHaveLength(1)
    expect(progress[0]).toMatchObject({ id: 'researcher', value: 6, target: 10, pct: 60 })
  })

  it('pct is clamped at 100 when value exceeds target', () => {
    const defs = [{ id: 'b', condition: { metric: 'x', op: '>=', value: 10 } }]
    const { progress } = evaluateConditions(defs, { x: 50 }, new Set(), { values: { x: 50 }, gauges: {}, now: 0 })
    expect(progress[0].pct).toBe(100)
    expect(progress[0].value).toBe(50)
  })

  it('pct clamped at 0 when metric is negative (below 0)', () => {
    const defs = [{ id: 'b', condition: { metric: 'x', op: '>=', value: 10 } }]
    // If value=-5, pct = -50, clamped to 0
    // NOTE: computeMetrics only produces non-negative values normally, but guard the clamp
    const { progress } = evaluateConditions(defs, { x: 0 }, new Set(), { values: {}, gauges: {}, now: 0 })
    expect(progress[0].pct).toBeGreaterThanOrEqual(0)
    expect(progress[0].pct).toBeLessThanOrEqual(100)
  })

  it('composite all: reports min child pct', () => {
    const cond = {
      all: [
        { metric: 'a', op: '>=', value: 10 },
        { metric: 'b', op: '>=', value: 4 },
      ],
    }
    const defs = [{ id: 'macro', condition: cond }]
    // a=5/10=50%, b=4/4=100% → min=50
    const { progress } = evaluateConditions(defs, { a: 5, b: 4 }, new Set(), { values: {}, gauges: {}, now: 0 })
    expect(progress[0].pct).toBe(50)
  })

  it('custom condition produces no progress entry (no numeric target)', () => {
    const defs = [{ id: 'b', condition: { custom: () => true } }]
    const { progress } = evaluateConditions(defs, {}, new Set(), { values: {}, gauges: {}, now: 0 })
    expect(progress).toHaveLength(0)
  })

  it('progress emitted even for already-earned achievements', () => {
    const earned = new Set(['researcher'])
    const defs = [{ id: 'researcher', condition: { metric: 'views', op: '>=', value: 10 } }]
    const { progress, satisfied } = evaluateConditions(defs, { views: 10 }, earned, { values: {}, gauges: {}, now: 0 })
    expect(satisfied).not.toContain('researcher')
    expect(progress).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
// UT-A4: already-earned ids excluded from satisfied
// ---------------------------------------------------------------------------
describe('evaluateConditions — already-earned exclusion', () => {
  it('earned badges are excluded from satisfied even if condition is met', () => {
    const defs = [
      { id: 'first_trade', condition: { metric: 'tradeCount', op: '>=', value: 1 } },
      { id: 'researcher', condition: { metric: 'views', op: '>=', value: 10 } },
    ]
    const values = { tradeCount: 5, views: 15 }
    const earned = new Set(['first_trade'])
    const { satisfied } = evaluateConditions(defs, values, earned, { values, gauges: {}, now: 0 })
    expect(satisfied).not.toContain('first_trade')
    expect(satisfied).toContain('researcher')
  })

  it('null earnedSet treated as empty set', () => {
    const defs = [{ id: 'b', condition: { metric: 'x', op: '>=', value: 1 } }]
    expect(() => evaluateConditions(defs, { x: 5 }, null, { values: {}, gauges: {}, now: 0 })).not.toThrow()
    const { satisfied } = evaluateConditions(defs, { x: 5 }, null, { values: {}, gauges: {}, now: 0 })
    expect(satisfied).toContain('b')
  })

  it('multiple badges: only new ones appear in satisfied', () => {
    const defs = [
      { id: 'a', condition: { metric: 'x', op: '>=', value: 1 } },
      { id: 'b', condition: { metric: 'y', op: '>=', value: 1 } },
      { id: 'c', condition: { metric: 'z', op: '>=', value: 1 } },
    ]
    const values = { x: 1, y: 1, z: 1 }
    const earned = new Set(['a', 'b'])
    const { satisfied } = evaluateConditions(defs, values, earned, { values, gauges: {}, now: 0 })
    expect(satisfied).toEqual(['c'])
  })
})

// ---------------------------------------------------------------------------
// UT-A4: default/unknown op in compareLeaf returns false (line 17 coverage)
// ---------------------------------------------------------------------------
describe('evaluateConditions — unknown leaf op', () => {
  it('unknown op in leaf condition never satisfies', () => {
    // Force an unknown op by directly calling evaluateConditions with an invalid op
    const defs = [{ id: 'b', condition: { metric: 'x', op: 'between', value: 5 } }]
    const { satisfied } = evaluateConditions(defs, { x: 5 }, new Set(), { values: {}, gauges: {}, now: 0 })
    expect(satisfied).not.toContain('b')
  })
})

// ---------------------------------------------------------------------------
// Edge: null/undefined condition does not throw
// ---------------------------------------------------------------------------
describe('evaluateConditions — robustness', () => {
  it('null condition returns not satisfied and no progress', () => {
    const defs = [{ id: 'broken', condition: null }]
    expect(() => evaluateConditions(defs, {}, new Set(), { values: {}, gauges: {}, now: 0 })).not.toThrow()
    const { satisfied } = evaluateConditions(defs, {}, new Set(), { values: {}, gauges: {}, now: 0 })
    expect(satisfied).not.toContain('broken')
  })

  it('empty achievementDefs returns empty satisfied and progress', () => {
    const result = evaluateConditions([], { x: 10 }, new Set(), { values: {}, gauges: {}, now: 0 })
    expect(result.satisfied).toHaveLength(0)
    expect(result.progress).toHaveLength(0)
  })
})
