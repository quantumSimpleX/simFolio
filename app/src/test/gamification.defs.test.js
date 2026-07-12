// UT-B5 — defs.js config validation tests
// Asserts: 15 badge ids present + unique; all metric references valid;
// macro is the only composite (all/any/not); names/descs come from BADGES tokens.
// Coverage target: >90% lines on src/gamification/defs.js

import { describe, it, expect } from 'vitest'
import { METRICS, ACHIEVEMENTS, MEDALS, TROPHIES, computeProgression } from '../gamification/defs'
import { BADGES } from '../tokens'

// Valid gauge source names (from stateProvider.read())
const GAUGE_SOURCES = new Set([
  'heldDistinct',
  'etfHeld',
  'etfDistinct',
  'cryptoHeld',
  'councilSize',
  'heldThroughDrop',
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
      'steady', 'reflection', 'mentor', 'macro',
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

describe('defs — mentor badge (was council)', () => {
  it('has a "mentor" achievement and no "council" achievement', () => {
    const ids = new Set(ACHIEVEMENTS.map((a) => a.id))
    expect(ids.has('mentor')).toBe(true)
    expect(ids.has('council')).toBe(false)
  })

  it('"mentor" is a config-only >= 1 condition on the mentorChosen metric', () => {
    const mentor = ACHIEVEMENTS.find((a) => a.id === 'mentor')
    expect(mentor.condition).toEqual({ metric: 'mentorChosen', op: '>=', value: 1 })
  })

  it('mentorChosen is a count metric matching the hero.unlocked event', () => {
    const m = METRICS.find((x) => x.id === 'mentorChosen')
    expect(m).toBeDefined()
    expect(m.kind).toBe('count')
    expect(m.match).toEqual({ type: 'hero.unlocked' })
  })
})

describe('defs — steady gauge metric (was event count)', () => {
  it('heldThroughDrop is now a gauge metric, not an event count', () => {
    const m = METRICS.find((x) => x.id === 'heldThroughDrop')
    expect(m).toBeDefined()
    expect(m.kind).toBe('gauge')
    expect(m.source).toBe('heldThroughDrop')
    expect(m.match).toBeUndefined()
  })

  it('no metric matches the removed position.heldThroughDrop event', () => {
    const evented = METRICS.filter((m) => m.match?.type === 'position.heldThroughDrop')
    expect(evented).toHaveLength(0)
  })

  it('"steady" condition still references the heldThroughDrop metric', () => {
    const steady = ACHIEVEMENTS.find((a) => a.id === 'steady')
    expect(steady.condition).toEqual({ metric: 'heldThroughDrop', op: '>=', value: 1 })
  })
})

describe('defs — MEDALS / TROPHIES invariants (§2.3)', () => {
  const BADGE_IDS = new Set(ACHIEVEMENTS.map((a) => a.id))
  const MEDAL_IDS = new Set(MEDALS.map((m) => m.id))
  const TROPHY_IDS = new Set(TROPHIES.map((t) => t.id))

  it('every badge id in every medal exists in ACHIEVEMENTS', () => {
    for (const medal of MEDALS) {
      for (const id of medal.badges) {
        expect(BADGE_IDS.has(id), `medal "${medal.id}" references unknown badge "${id}"`).toBe(true)
      }
    }
  })

  it('every medal id in every trophy exists in MEDALS', () => {
    for (const trophy of TROPHIES) {
      for (const id of trophy.medals) {
        expect(MEDAL_IDS.has(id), `trophy "${trophy.id}" references unknown medal "${id}"`).toBe(true)
      }
    }
  })

  it('every medal threshold is 1 <= threshold <= badge set size', () => {
    for (const medal of MEDALS) {
      expect(medal.threshold).toBeGreaterThanOrEqual(1)
      expect(medal.threshold).toBeLessThanOrEqual(medal.badges.length)
    }
  })

  it('every trophy threshold is 1 <= threshold <= medal set size', () => {
    for (const trophy of TROPHIES) {
      expect(trophy.threshold).toBeGreaterThanOrEqual(1)
      expect(trophy.threshold).toBeLessThanOrEqual(trophy.medals.length)
    }
  })

  it('medal and trophy ids are unique', () => {
    expect(MEDAL_IDS.size).toBe(MEDALS.length)
    expect(TROPHY_IDS.size).toBe(TROPHIES.length)
  })

  it('medal/trophy ids are disjoint from badge ids and from each other', () => {
    for (const id of MEDAL_IDS) expect(BADGE_IDS.has(id)).toBe(false)
    for (const id of TROPHY_IDS) {
      expect(BADGE_IDS.has(id)).toBe(false)
      expect(MEDAL_IDS.has(id)).toBe(false)
    }
  })
})

describe('defs — computeProgression', () => {
  const nameToBadgeIds = (medalId) => MEDALS.find((m) => m.id === medalId).badges

  it('empty set: nothing earned, all progress 0', () => {
    const { medals, trophies, medalCount, trophyCount } = computeProgression(new Set())
    expect(medalCount).toBe(0)
    expect(trophyCount).toBe(0)
    for (const m of medals) {
      expect(m.earned).toBe(false)
      expect(m.earnedCount).toBe(0)
      expect(m.progress).toBe(0)
    }
    for (const t of trophies) expect(t.earned).toBe(false)
  })

  it('thematic medal partial: below threshold is not earned, progress is fractional', () => {
    const traderBadges = nameToBadgeIds('medal_trader') // threshold 4
    const { medals } = computeProgression(new Set(traderBadges.slice(0, 2)))
    const trader = medals.find((m) => m.id === 'medal_trader')
    expect(trader.earnedCount).toBe(2)
    expect(trader.earned).toBe(false)
    expect(trader.progress).toBeCloseTo(0.5)
  })

  it('thematic medal complete: full set earns the medal at progress 1', () => {
    const traderBadges = nameToBadgeIds('medal_trader')
    const { medals, medalCount } = computeProgression(new Set(traderBadges))
    const trader = medals.find((m) => m.id === 'medal_trader')
    expect(trader.earned).toBe(true)
    expect(trader.earnedCount).toBe(4)
    expect(trader.progress).toBe(1)
    expect(medalCount).toBeGreaterThanOrEqual(1)
  })

  it('milestone medals at 5 / 10 / 15 earned badges', () => {
    const all = ACHIEVEMENTS.map((a) => a.id)

    const at5 = computeProgression(new Set(all.slice(0, 5)))
    expect(at5.medals.find((m) => m.id === 'medal_explorer_1').earned).toBe(true)
    expect(at5.medals.find((m) => m.id === 'medal_explorer_2').earned).toBe(false)
    expect(at5.medals.find((m) => m.id === 'medal_explorer_3').earned).toBe(false)

    const at10 = computeProgression(new Set(all.slice(0, 10)))
    expect(at10.medals.find((m) => m.id === 'medal_explorer_2').earned).toBe(true)
    expect(at10.medals.find((m) => m.id === 'medal_explorer_3').earned).toBe(false)

    const at15 = computeProgression(new Set(all))
    expect(at15.medals.find((m) => m.id === 'medal_explorer_3').earned).toBe(true)
  })

  it('milestone progress clamps to 1 when earned exceeds threshold', () => {
    const all = ACHIEVEMENTS.map((a) => a.id) // 15 badges
    const { medals } = computeProgression(new Set(all))
    const explorer1 = medals.find((m) => m.id === 'medal_explorer_1') // threshold 5
    expect(explorer1.earnedCount).toBe(15)
    expect(explorer1.progress).toBe(1)
  })

  it('a single badge counts toward both its thematic medal and the milestone medals', () => {
    const { medals } = computeProgression(new Set(['first_trade']))
    expect(medals.find((m) => m.id === 'medal_trader').earnedCount).toBe(1)
    expect(medals.find((m) => m.id === 'medal_explorer_1').earnedCount).toBe(1)
  })

  it('trophy is earned only when all medals are earned', () => {
    const all = ACHIEVEMENTS.map((a) => a.id)

    // 14 of 15 badges: every thematic set except student is complete, and no explorer_3.
    const almost = computeProgression(new Set(all.slice(0, 14)))
    expect(almost.trophies[0].earned).toBe(false)
    expect(almost.trophyCount).toBe(0)

    const complete = computeProgression(new Set(all))
    expect(complete.medalCount).toBe(MEDALS.length)
    expect(complete.trophies[0].earned).toBe(true)
    expect(complete.trophyCount).toBe(1)
  })

  it('accepts an array as well as a Set', () => {
    const traderBadges = nameToBadgeIds('medal_trader')
    const { medals } = computeProgression(traderBadges)
    expect(medals.find((m) => m.id === 'medal_trader').earned).toBe(true)
  })
})
