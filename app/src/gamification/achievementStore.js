// AchievementStore adapter — reads/writes the existing `achievements` table.
// Mirrors the upsert/onConflict pattern from the retired useAchievementEngine.

export function createAchievementStore(supabase) {
  async function earned(userId) {
    const { data, error } = await supabase
      .from('achievements')
      .select('achievement_type')
      .eq('user_id', userId)

    if (error || !data) return new Set()
    return new Set(data.map((r) => r.achievement_type))
  }

  async function award(userId, ids) {
    if (!ids || ids.length === 0) return
    await supabase
      .from('achievements')
      .upsert(
        ids.map((id) => ({ user_id: userId, achievement_type: id })),
        { onConflict: 'user_id,achievement_type', ignoreDuplicates: true },
      )
  }

  return { earned, award }
}
