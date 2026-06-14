import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

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

export function useHeroChat(heroId, portfolioContext) {
  const { session } = useAuth()
  const qc = useQueryClient()
  const { user } = useAuth()

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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hero-history', user?.id, heroId] })
    },
  })
}
