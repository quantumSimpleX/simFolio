import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useTrack } from '../gamification/useGamification'

// Lightweight macro/market-conditions topic detector for the `macro` badge.
// A keyword hit is enough — the engine just needs the boolean.
const MACRO_TERMS = [
  'macro', 'inflation', 'interest rate', 'rates', 'fed', 'recession',
  'gdp', 'economy', 'market conditions', 'unemployment', 'tariff', 'bond yield',
]
function isMacro(message) {
  const m = (message || '').toLowerCase()
  return MACRO_TERMS.some((t) => m.includes(t))
}

export function useHeroHistory(heroId) {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['hero-history', user?.id, heroId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hero_conversations')
        .select('role, content, created_at, model')
        .eq('user_id', user.id)
        .eq('hero_id', heroId)
        .order('created_at', { ascending: true })
        .limit(50)
      // Retry without `model` if the column hasn't been added yet, so chat
      // history keeps working before the migration is applied.
      if (error?.message?.includes('model')) {
        const retry = await supabase
          .from('hero_conversations')
          .select('role, content, created_at')
          .eq('user_id', user.id)
          .eq('hero_id', heroId)
          .order('created_at', { ascending: true })
          .limit(50)
        if (retry.error) throw retry.error
        return retry.data ?? []
      }
      if (error) throw error
      return data ?? []
    },
    enabled: !!user && !!heroId,
  })
}

// Cross-hero variant of useHeroHistory: same query shape but without the
// `.eq('hero_id')` filter and with `hero_id` selected, so the UI can render a
// single unified chat timeline across all heroes. Pagination is a follow-up.
export function useConversationHistory() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['conversation-history', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hero_conversations')
        .select('role, content, created_at, model, hero_id')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })
        .limit(100)
      // Retry without `model` if the column hasn't been added yet, so chat
      // history keeps working before the migration is applied.
      if (error?.message?.includes('model')) {
        const retry = await supabase
          .from('hero_conversations')
          .select('role, content, created_at, hero_id')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true })
          .limit(100)
        if (retry.error) throw retry.error
        return retry.data ?? []
      }
      if (error) throw error
      return data ?? []
    },
    enabled: !!user,
  })
}

export function useHeroChat(heroId, portfolioContext) {
  const { session } = useAuth()
  const qc = useQueryClient()
  const { user } = useAuth()
  const track = useTrack()
  const key = ['hero-history', user?.id, heroId]
  const convoKey = ['conversation-history', user?.id]

  return useMutation({
    mutationFn: async (message) => {
      const { data, error } = await supabase.functions.invoke('hero-chat', {
        body: { hero_id: heroId, message, portfolio_context: portfolioContext },
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (error) throw error
      if (data.error) throw new Error(data.error)
      console.log('[HeroChat] reply from model:', data.model)
      return { reply: data.reply, model: data.model }
    },
    // Show the user's message immediately (like any chat app); the "Calling …"
    // indicator then renders below it while the reply is pending.
    onMutate: async (message) => {
      track('chat.sent', { macro: isMacro(message) })
      await qc.cancelQueries({ queryKey: key })
      await qc.cancelQueries({ queryKey: convoKey })
      const previous = qc.getQueryData(key)
      const previousConvo = qc.getQueryData(convoKey)
      const now = new Date().toISOString()
      qc.setQueryData(key, old => [
        ...(old ?? []),
        { role: 'user', content: message, created_at: now },
      ])
      // Cross-hero timeline: tag the user's message with the current hero so
      // the unified view can attribute it correctly.
      qc.setQueryData(convoKey, old => [
        ...(old ?? []),
        { role: 'user', content: message, created_at: now, hero_id: heroId },
      ])
      return { previous, previousConvo }
    },
    onError: (_err, _message, ctx) => {
      if (ctx) {
        qc.setQueryData(key, ctx.previous)
        qc.setQueryData(convoKey, ctx.previousConvo)
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key })
      qc.invalidateQueries({ queryKey: convoKey })
    },
  })
}
