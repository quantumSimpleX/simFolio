import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { BADGES } from '../tokens'

export function useAchievements() {
  const { user } = useAuth()

  const { data: earned, isLoading } = useQuery({
    queryKey: ['achievements', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('achievements')
        .select('achievement_type, unlocked_at')
        .eq('user_id', user.id)
      if (error) throw error
      return data ?? []
    },
    enabled: !!user,
  })

  const earnedIds = new Set((earned ?? []).map(a => a.achievement_type))

  const badges = BADGES.map(b => ({
    ...b,
    earned: earnedIds.has(b.id),
    unlocked_at: (earned ?? []).find(a => a.achievement_type === b.id)?.unlocked_at ?? null,
  }))

  const earnedCount = badges.filter(b => b.earned).length
  const medalCount  = Math.floor(earnedCount / 10)
  const trophyCount = Math.floor(medalCount / 10)

  return { badges, earnedCount, medalCount, trophyCount, isLoading }
}
