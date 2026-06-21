import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { candidateHeroes, resolveSelectionHeroes, resolveMentorHeroes } from '../data/heroes'

const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour

// Stable hash of the preference fields that actually drive the LLM ranking.
// Ignores ephemeral fields like `stocks` so adding tickers doesn't invalidate.
function answersHash(answers) {
  const { goal, horizon, frequency, experience, heroMention } = answers ?? {}
  return JSON.stringify({ goal, horizon, frequency, experience, heroMention })
}

function lsKey(includeWarren, pinnedId) {
  return `simfolio_hero_ranking_${includeWarren ? 'mentor' : 'onboarding'}_${pinnedId ?? 'none'}`
}

function readCache(key, hash) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const { h, result, fetchedAt } = JSON.parse(raw)
    if (h !== hash) return null               // preferences changed
    if (Date.now() - fetchedAt > CACHE_TTL_MS) return null  // expired
    return result
  } catch { return null }
}

function writeCache(key, hash, result) {
  try {
    localStorage.setItem(key, JSON.stringify({ h: hash, result, fetchedAt: Date.now() }))
  } catch { /* quota errors ignored */ }
}

// Ranks the hero pool for the selection grid via the LLM (`rank-heroes` edge function). Always
// resolves to a complete, valid list — the LLM ranking when available, otherwise the deterministic
// rule-based fallback — so the grid never breaks on a slow or failing model call.
//
// Two modes:
//  - onboarding (default): ranks 7 from the 19-hero pool; Warren is pinned first → 8 total.
//  - find-a-mentor (`includeWarren: true, count: 8`): ranks 8 freely from all 20; Warren not pinned.
//
// `pinnedId` (find-a-mentor only): when the user named an investor they admire, that hero is
// pinned into the list, excluded from the candidate pool, and the LLM ranks the remaining slots
// (caller passes count: 7) so the admired hero is always one of the 8.
//
// Results are cached in localStorage for 1 hour per preference fingerprint and mode.
// If the user changes their investment preferences, the cache is automatically invalidated.
export function useHeroRanking(answers, { enabled = true, includeWarren = false, count = 7, pinnedId = null } = {}) {
  const { session } = useAuth()
  const active = enabled && !!session?.access_token

  const hash = answersHash(answers)
  const cacheKey = lsKey(includeWarren, pinnedId)

  const query = useQuery({
    queryKey: ['hero-ranking', hash, includeWarren, count, pinnedId],
    queryFn: async () => {
      // Return localStorage cache if fresh and preferences unchanged
      const cached = readCache(cacheKey, hash)
      if (cached) return cached

      const candidates = candidateHeroes(includeWarren).filter(h => h.id !== pinnedId)
      const { data, error } = await supabase.functions.invoke('rank-heroes', {
        body: { answers, candidates, count },
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)
      const result = Array.isArray(data?.ranked) ? data.ranked : []
      writeCache(cacheKey, hash, result)
      return result
    },
    enabled: active,
    retry: false,
    staleTime: Infinity,
  })

  const llmIds = query.isSuccess ? query.data : []
  const heroIds = includeWarren
    ? resolveMentorHeroes({ llmIds, answers, pinnedId })
    : resolveSelectionHeroes({ llmIds, answers })

  return { heroIds, isLoading: active && query.isLoading, isError: query.isError }
}
