import { describe, it, expect } from 'vitest'
import { HERO_DATA, matchHeroes, rankHeroesForSelection } from '../data/heroes'

describe('HERO_DATA', () => {
  it('has 8 selectable heroes plus Sage', () => {
    const ids = Object.keys(HERO_DATA)
    expect(ids).toContain('sage')
    expect(ids.filter(id => id !== 'sage')).toHaveLength(8)
  })
  it('every hero has the fields the UI renders', () => {
    for (const h of Object.values(HERO_DATA)) {
      expect(h.id).toBeTruthy()
      expect(h.name).toBeTruthy()
      expect(h.initials).toBeTruthy()
      expect(h.style).toBeTruthy()
      expect(h.color).toBeTruthy()
    }
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
    const ids = rankHeroesForSelection({ goal: ['Spreading risk through asset diversification'] })
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
