// UT-B5 — defs.js config validation tests
// Asserts: 15 badge ids present + unique; all metric references valid;
// macro is the only composite (all/any/not); names/descs come from BADGES tokens.
// Coverage target: >90% lines on src/gamification/defs.js

import { describe, it, expect } from 'vitest'
import { METRICS, ACHIEVEMENTS } from '../gamification/defs'
import { BADGES } from '../tokens'

// Valid gauge source names (from stateProvider.read())
const GAUGE_SOURCES = new Set([
  'heldDistinct',
  'etfHeld',
  'etfDistinct',
  'cryptoHeld',
  'councilSize',
  'positionOpen',
])

const METRIC_IDS = new Set(METRICS.map((m) => m.id))

// Extract all metric refs from a condition (recursive)
function extractMetricRefs(condition) {
  if (!condition) return []
  if (condition.metric) return [condition.metric]
  if (condition.all)  return condition.all.flatMap(extractMetricRefs)
  if (condition.any)  return condition.any.flatMap(extractMetricRefs)
  if (condition.not)  return extractMetricRefs(condition.not)
  if (condition.custom) return [] // custom predicate — no metric ref
  return []
}

// Returns true if the condition is a composite (all/any/not)
function isComposite(condition) {
  return !!(condition.all || condition.any || condition.not)
}

describe('defs — METRICS', () => {
  it('exports METRICS as a non-empty array', () => {
    expect(Array.isArray(METRICS)).toBe(true)
    expect(METRICS.length).toBeGreaterThan(0)
  })

  it('every metric has a non-empty string id', () => {
    for (const m of METRICS) {
      expect(typeof m.id).toBe('string')
      expect(m.id.length).toBeGreaterThan(0)
    }
  })

  it('metric ids are unique', () => {
    const ids = METRICS.map((m) => m.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('every metric has a valid kind', () => {
    const validKinds = new Set([
      'count', 'distinct', 'sum', 'max', 'threshold-event',
      'gauge', 'duration', 'streak',
    ])
    for (const m of METRICS) {
      expect(validKinds.has(m.kind), `metric "${m.id}" kind "${m.kind}" not valid`).toBe(true)
    }
  })

  it('gauge metrics have a source that is a known gauge source', () => {
    const gauges = METRICS.filter((m) => m.kind === 'gauge')
    expect(gauges.length).toBeGreaterThan(0)
    for (const m of gauges) {
      expect(
        GAUGE_SOURCES.has(m.source),
        `gauge "${m.id}" source "${m.source}" not in GAUGE_SOURCES`,
      ).toBe(true)
    }
  })
})

describe('defs — ACHIEVEMENTS', () => {
  it('exports ACHIEVEMENTS as an array with exactly 15 entries', () => {
    expect(Array.isArray(ACHIEVEMENTS)).toBe(true)
    expect(ACHIEVEMENTS).toHaveLength(15)
  })

  it('all 15 badge ids from GAMreq §5 are present', () => {
    const expectedIds = [
      'first_trade', 'limit', 'diversified', 'etf', 'etf2', 'first_crypto',
      'researcher', 'contrarian', 'momentum', 'patient', 'long_term',
      'steady', 'reflection', 'council', 'macro',
    ]
    const actualIds = new Set(ACHIEVEMENTS.map((a) => a.id))
    for (const id of expectedIds) {
      expect(actualIds.has(id), `missing badge id: "${id}"`).toBe(true)
    }
  })

  it('achievement ids are unique', () => {
    const ids = ACHIEVEMENTS.map((a) => a.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('every achievement has a condition object', () => {
    for (const a of ACHIEVEMENTS) {
      expect(typeof a.condition).toBe('object')
      expect(a.condition).not.toBeNull()
    }
  })

  it('every metric reference in conditions resolves to a defined METRIC id or a gauge source', () => {
    for (const a of ACHIEVEMENTS) {
      const refs = extractMetricRefs(a.condition)
      for (const ref of refs) {
        const valid = METRIC_IDS.has(ref) || GAUGE_SOURCES.has(ref)
        expect(
          valid,
          `achievement "${a.id}" references unknown metric/source: "${ref}"`,
        ).toBe(true)
      }
    }
  })

  it('"macro" is the only achievement with a composite condition (all/any/not)', () => {
    const composites = ACHIEVEMENTS.filter((a) => isComposite(a.condition))
    expect(composites).toHaveLength(1)
    expect(composites[0].id).toBe('macro')
  })

  it('"macro" condition is an "all" composite with councilSize and macroQuestions', () => {
    const macro = ACHIEVEMENTS.find((a) => a.id === 'macro')
    expect(macro.condition.all).toBeDefined()
    expect(macro.condition.all).toHaveLength(2)

    const refs = extractMetricRefs(macro.condition)
    expect(refs).toContain('councilSize')
    expect(refs).toContain('macroQuestions')
  })

  it('no achievement uses a custom predicate (config-only assertion from UT-B5)', () => {
    // GAMreq AC2: all 15 badges defined purely as config — no custom functions
    function hasCustom(condition) {
      if (!condition) return false
      if (condition.custom) return true
      if (condition.all) return condition.all.some(hasCustom)
      if (condition.any) return condition.any.some(hasCustom)
      if (condition.not) return hasCustom(condition.not)
      return false
    }
    for (const a of ACHIEVEMENTS) {
      expect(
        hasCustom(a.condition),
        `achievement "${a.id}" uses a custom predicate — violates config-only requirement`,
      ).toBe(false)
    }
  })
})

describe('defs — name/description from BADGES tokens', () => {
  const badgeMap = Object.fromEntries(BADGES.map((b) => [b.id, b]))

  it('every achievement that appears in BADGES gets its name from the token', () => {
    for (const a of ACHIEVEMENTS) {
      const token = badgeMap[a.id]
      if (!token) continue // if badge id not in tokens, skip (separate issue)
      expect(a.name).toBe(token.name)
    }
  })

  it('every achievement that appears in BADGES gets its description from the token', () => {
    for (const a of ACHIEVEMENTS) {
      const token = badgeMap[a.id]
      if (!token) continue
      expect(a.description).toBe(token.desc)
    }
  })

  it('all 15 achievement ids exist in BADGES', () => {
    const badgeIds = new Set(BADGES.map((b) => b.id))
    for (const a of ACHIEVEMENTS) {
      expect(
        badgeIds.has(a.id),
        `achievement id "${a.id}" has no corresponding BADGES token`,
      ).toBe(true)
    }
  })
})
