import { describe, it, expect } from 'vitest'
import { candidateHeroes, resolveMentorHeroes, HERO_DATA } from '../data/heroes'

describe('candidateHeroes', () => {
  it('defaults to the 19-hero pool (excludes sage and warren)', () => {
    const ids = candidateHeroes().map(c => c.id)
    expect(ids).toHaveLength(19)
    expect(ids).not.toContain('warren')
    expect(ids).not.toContain('sage')
  })

  it('includeWarren=true returns all 20 with Warren in the pool', () => {
    const ids = candidateHeroes(true).map(c => c.id)
    expect(ids).toHaveLength(20)
    expect(ids).toContain('warren')
    expect(ids).not.toContain('sage')
  })
})

describe('resolveMentorHeroes', () => {
  it('keeps 8 valid LLM ids in order without pinning Warren', () => {
    const llm = ['cathie', 'ray', 'soros', 'burry', 'simons', 'griffin', 'tepper', 'icahn']
    const out = resolveMentorHeroes({ llmIds: llm, answers: {} })
    expect(out).toEqual(llm)
    expect(out[0]).not.toBe('warren')
  })

  it('keeps Warren when the LLM ranks him — not pinned, not dropped', () => {
    const out = resolveMentorHeroes({ llmIds: ['cathie', 'warren', 'ray'], answers: {} })
    expect(out).toContain('warren')
    expect(out[0]).toBe('cathie')
  })

  it('drops unknown ids and sage, de-duplicates, and caps at 8', () => {
    const out = resolveMentorHeroes({
      llmIds: ['ray', 'ray', 'sage', 'not_a_hero', 'cathie'],
      answers: {},
    })
    expect(out.filter(x => x === 'ray')).toHaveLength(1)
    expect(out).not.toContain('sage')
    expect(out).not.toContain('not_a_hero')
    expect(out.length).toBeLessThanOrEqual(8)
    expect(new Set(out).size).toBe(out.length)
  })

  it('fills a short LLM list from the rule-based ranking to 8 unique', () => {
    const out = resolveMentorHeroes({
      llmIds: ['burry', 'simons'],
      answers: { goal: ['Spreading risk through asset diversification'] },
    })
    expect(out).toHaveLength(8)
    expect(out[0]).toBe('burry')
    expect(out[1]).toBe('simons')
    expect(new Set(out).size).toBe(8)
    out.forEach(id => expect(HERO_DATA[id]).toBeTruthy())
  })

  it('returns a complete 8 from a pure fallback (empty llmIds)', () => {
    expect(resolveMentorHeroes({ llmIds: [], answers: {} })).toHaveLength(8)
  })

  it('tolerates missing/garbage input', () => {
    expect(resolveMentorHeroes()).toHaveLength(8)
    expect(resolveMentorHeroes({ llmIds: 'nope' })).toHaveLength(8)
  })
})
