import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { BADGES } from '../tokens'
import { computeProgression } from '../gamification/defs'

// Legacy rows carry 'council' until migration 005 renames them to 'mentor'.
// Alias on read so derived progression is correct before the migration lands.
const aliasType = (t) => (t === 'council' ? 'mentor' : t)

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

  const rows = earned ?? []
  const earnedIds = new Set(rows.map(a => aliasType(a.achievement_type)))

  const badges = BADGES.map(b => ({
    ...b,
    earned: earnedIds.has(b.id),
    unlocked_at: rows.find(a => aliasType(a.achievement_type) === b.id)?.unlocked_at ?? null,
  }))

  const earnedCount = badges.filter(b => b.earned).length
  const { medals, trophies, medalCount, trophyCount } = computeProgression(earnedIds)

  return { badges, medals, trophies, earnedCount, medalCount, trophyCount, isLoading }
}
