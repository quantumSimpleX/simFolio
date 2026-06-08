import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { HERO_DATA } from '../data/heroes'

export function useHeroSelections() {
  const { user } = useAuth()

  const { data, isLoading } = useQuery({
    queryKey: ['hero-selections', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('hero_selections')
        .select('hero_id')
        .eq('user_id', user.id)
      if (error) throw error
      return data ?? []
    },
    enabled: !!user,
  })

  const heroes = (data ?? [])
    .map(s => HERO_DATA[s.hero_id])
    .filter(Boolean)

  return { heroes, isLoading }
}
