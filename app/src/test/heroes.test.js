import { describe, it, expect } from 'vitest'
import {
  HERO_DATA, matchHeroes, rankHeroesForSelection,
  candidateHeroes, resolveSelectionHeroes, heroIdFromName,
} from '../data/heroes'

describe('HERO_DATA', () => {
  it('has 20 selectable heroes plus Sage', () => {
    const ids = Object.keys(HERO_DATA)
    expect(ids).toContain('sage')
    expect(ids.filter(id => id !== 'sage')).toHaveLength(20)
  })
  it('every hero has the fields the UI renders', () => {
    for (const h of Object.values(HERO_DATA)) {
      expect(h.id).toBeTruthy()
      expect(h.name).toBeTruthy()
      expect(h.initials).toBeTruthy()
      expect(h.style).toBeTruthy()
      expect(h.color).toBeTruthy()
      expect(h.philosophy).toBeTruthy()
    }
  })
})

describe('candidateHeroes', () => {
  it('returns the pool of 19 (excludes sage and warren)', () => {
    const pool = candidateHeroes()
    expect(pool).toHaveLength(19)
    const ids = pool.map(c => c.id)
    expect(ids).not.toContain('sage')
    expect(ids).not.toContain('warren')
  })
  it('exposes id/name/style/philosophy for the prompt', () => {
    for (const c of candidateHeroes()) {
      expect(c.id).toBeTruthy()
      expect(c.name).toBeTruthy()
      expect(c.style).toBeTruthy()
      expect(c.philosophy).toBeTruthy()
    }
  })
})

describe('resolveSelectionHeroes', () => {
  it('pins Warren first and appends 7 valid LLM ids', () => {
    const out = resolveSelectionHeroes({
      llmIds: ['burry', 'simons', 'griffin', 'tepper', 'icahn', 'ackman', 'loeb'],
      answers: {},
    })
    expect(out[0]).toBe('warren')
    expect(out).toHaveLength(8)
    expect(out.slice(1)).toEqual(['burry', 'simons', 'griffin', 'tepper', 'icahn', 'ackman', 'loeb'])
  })
  it('drops unknown ids plus warren/sage from the LLM list', () => {
    const out = resolveSelectionHeroes({
      llmIds: ['warren', 'sage', 'not_a_hero', 'cathie', 'ray'],
      answers: {},
    })
    expect(out).toContain('cathie')
    expect(out).toContain('ray')
    expect(out.filter(id => id === 'warren')).toHaveLength(1) // only the pinned one
    expect(out).not.toContain('sage')
    expect(out).not.toContain('not_a_hero')
  })
  it('de-duplicates while preserving order', () => {
    const out = resolveSelectionHeroes({ llmIds: ['ray', 'ray', 'cathie', 'ray'], answers: {} })
    expect(out[1]).toBe('ray')
    expect(out[2]).toBe('cathie')
    expect(new Set(out).size).toBe(out.length)
  })
  it('fills a short LLM list from the rule-based fallback', () => {
    const out = resolveSelectionHeroes({ llmIds: ['burry', 'simons'], answers: {} })
    expect(out).toHaveLength(8)
    expect(out[1]).toBe('burry')
    expect(out[2]).toBe('simons')
    expect(new Set(out).size).toBe(8)
  })
  it('returns a complete Warren-first list from a pure fallback (empty llmIds)', () => {
    const out = resolveSelectionHeroes({ llmIds: [], answers: { goal: ['Spreading risk through asset diversification'] } })
    expect(out[0]).toBe('warren')
    expect(out).toHaveLength(8)
    expect(out).not.toContain('sage')
  })
  it('tolerates missing/garbage input', () => {
    expect(resolveSelectionHeroes()[0]).toBe('warren')
    expect(resolveSelectionHeroes({ llmIds: 'nope' })).toHaveLength(8)
  })
})

describe('heroIdFromName', () => {
  it('maps a known investor name to its id', () => {
    expect(heroIdFromName('Cathie Wood')).toBe('cathie')
    expect(heroIdFromName('warren')).toBe('warren')
  })
  it('returns null for the no-mention sentinel and empty input', () => {
    expect(heroIdFromName("I don't follow any particular investor")).toBeNull()
    expect(heroIdFromName('')).toBeNull()
    expect(heroIdFromName(undefined)).toBeNull()
  })
})

describe('matchHeroes', () => {
  it('prioritises a directly mentioned hero', () => {
    const ids = matchHeroes({ heroMention: 'Cathie Wood' })
    expect(ids[0]).toBe('cathie')
    expect(ids).toHaveLength(3)
  })
  it('ignores the no-mention sentinel', () => {
    const ids = matchHeroes({ heroMention: "I don't follow any particular investor" })
    expect(ids[0]).not.toBe(undefined)
  })
  it('routes short horizons to Lynch', () => {
    expect(matchHeroes({ horizon: 'Less than a year' })[0]).toBe('lynch')
  })
  it('falls back to the explorer trio with no signals', () => {
    expect(matchHeroes({})).toEqual(['cathie', 'lynch', 'warren'])
  })
})

describe('rankHeroesForSelection', () => {
  it('always pins Warren Buffett first', () => {
    expect(rankHeroesForSelection({})[0]).toBe('warren')
    expect(rankHeroesForSelection({ goal: ['Spreading risk through asset diversification'] })[0]).toBe('warren')
  })
  it('returns 8 unique heroes by default', () => {
    const ids = rankHeroesForSelection({ goal: ['Harnessing exponential compound wealth growth'], horizon: '10+ years' })
    expect(ids).toHaveLength(8)
    expect(new Set(ids).size).toBe(8)
    expect(ids).not.toContain('sage')
  })
  it('ranks diversification-aligned heroes higher for that goal', () => {
    // Use the full ordering so both heroes are present (cathie isn't in the default top-8 here).
    const ids = rankHeroesForSelection({ goal: ['Spreading risk through asset diversification'] }, 21)
    expect(ids.indexOf('ray')).toBeLessThan(ids.indexOf('cathie'))
  })
  it('handles a free-text goal string without crashing', () => {
    const ids = rankHeroesForSelection({ goal: 'I want to learn', horizon: '1 – 3 years' })
    expect(ids).toHaveLength(8)
  })
  it('respects the count argument', () => {
    expect(rankHeroesForSelection({}, 3)).toHaveLength(3)
  })
})
