import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts'
import { buildRankingPrompt, parseRankedIds } from './parse.ts'

const VALID = ['munger', 'lynch', 'bogle', 'ray', 'cathie', 'soros', 'graham']

Deno.test('parseRankedIds: clean {"ranked": [...]} JSON', () => {
  const raw = JSON.stringify({ ranked: ['lynch', 'cathie', 'ray'] })
  assertEquals(parseRankedIds(raw, VALID), ['lynch', 'cathie', 'ray'])
})

Deno.test('parseRankedIds: bare JSON array', () => {
  assertEquals(parseRankedIds('["bogle","graham"]', VALID), ['bogle', 'graham'])
})

Deno.test('parseRankedIds: JSON wrapped in prose', () => {
  const raw = 'Sure! Here is the ranking:\n{"ranked": ["soros", "ray"]}\nHope that helps.'
  assertEquals(parseRankedIds(raw, VALID), ['soros', 'ray'])
})

Deno.test('parseRankedIds: drops invalid ids and Warren/unknowns', () => {
  const raw = '{"ranked": ["warren", "lynch", "not_a_hero", "bogle"]}'
  assertEquals(parseRankedIds(raw, VALID), ['lynch', 'bogle'])
})

Deno.test('parseRankedIds: de-duplicates, preserves order', () => {
  const raw = '["ray","ray","cathie","ray"]'
  assertEquals(parseRankedIds(raw, VALID), ['ray', 'cathie'])
})

Deno.test('parseRankedIds: caps at 7', () => {
  const ids = [...VALID, 'munger', 'lynch'] // 9 entries, 7 unique valid
  const raw = JSON.stringify({ ranked: ids })
  assertEquals(parseRankedIds(raw, VALID).length, 7)
})

Deno.test('parseRankedIds: returns [] on unparseable input', () => {
  assertEquals(parseRankedIds('the model refused to answer', VALID), [])
  assertEquals(parseRankedIds('', VALID), [])
})

Deno.test('buildRankingPrompt: includes roster ids and answers', () => {
  const { system, user } = buildRankingPrompt(
    { goal: ['Spreading risk through asset diversification'], horizon: '10+ years' },
    [{ id: 'ray', name: 'Ray Dalio', style: 'Macro', philosophy: 'Diversify' }],
  )
  assertEquals(system.includes('ray: Ray Dalio'), true)
  assertEquals(system.includes('Warren Buffett'), true) // exclusion instruction
  assertEquals(user.includes('10+ years'), true)
})
