import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { candidateHeroes, resolveSelectionHeroes } from '../data/heroes'

// Ranks the hero pool (everyone except Warren Buffett) for the onboarding selection grid using the
// LLM, via the `rank-heroes` edge function. Always resolves to a complete, valid 8-hero list:
// the LLM ranking when available, otherwise the deterministic rule-based fallback — so onboarding
// never breaks on a slow or failing model call.
export function useHeroRanking(answers, { enabled = true } = {}) {
  const { session } = useAuth()
  const active = enabled && !!session?.access_token

  const query = useQuery({
    queryKey: ['hero-ranking', answers],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('rank-heroes', {
        body: { answers, candidates: candidateHeroes() },
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
  const heroIds = resolveSelectionHeroes({ llmIds, answers })

  return { heroIds, isLoading: active && query.isLoading, isError: query.isError }
}
