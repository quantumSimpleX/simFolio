import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useTrack } from '../gamification/useGamification'

// Replace the user's advising hero. The council is a single row today, so we clear the existing
// selection(s) and insert the chosen one, then refresh the hero-selections query — which re-points
// the chat (it runs against heroes[0]) at the new hero and its own conversation thread.
export function useChangeHero() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const track = useTrack()

  return useMutation({
    mutationFn: async (heroId) => {
      const { error: delErr } = await supabase
        .from('hero_selections')
        .delete()
        .eq('user_id', user.id)
      if (delErr) throw delErr

      const { error: insErr } = await supabase
        .from('hero_selections')
        .insert({ user_id: user.id, hero_id: heroId })
      if (insErr) throw insErr

      return heroId
    },
    onSuccess: (heroId) => {
      qc.invalidateQueries({ queryKey: ['hero-selections', user?.id] })
      track('hero.unlocked', { heroId })
    },
  })
}
