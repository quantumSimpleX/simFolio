import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { candidateHeroes, resolveSelectionHeroes, resolveMentorHeroes } from '../data/heroes'

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
export function useHeroRanking(answers, { enabled = true, includeWarren = false, count = 7, pinnedId = null } = {}) {
  const { session } = useAuth()
  const active = enabled && !!session?.access_token

  const query = useQuery({
    queryKey: ['hero-ranking', answers, includeWarren, count, pinnedId],
    queryFn: async () => {
      const candidates = candidateHeroes(includeWarren).filter(h => h.id !== pinnedId)
      const { data, error } = await supabase.functions.invoke('rank-heroes', {
        body: { answers, candidates, count },
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)
      return Array.isArray(data?.ranked) ? data.ranked : []
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
