import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { usePortfolio } from './usePortfolio'
import { useOrders } from './useOrders'
import { useAchievements } from './useAchievements'
import { evaluateEarned } from '../lib/achievements'

// Runs once (mounted in App). Watches the user's orders + positions, evaluates
// execution-derived badge rules, and persists any newly-qualified badges to the
// `achievements` table.
//
// Reveal policy: the FIRST sync after data loads is a silent backfill — we never
// flash a full-screen moment for badges the user already qualified for before
// this session. After that, a freshly-earned badge navigates to the reveal.
export function useAchievementEngine() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { raw } = usePortfolio()
  const { data: orders } = useOrders()
  const { badges } = useAchievements()

  const syncedRef = useRef(false) // first backfill done?
  const writingRef = useRef(false) // insert in flight, avoid double-fire

  const positions = raw?.positions
  const dataReady = !!user && Array.isArray(orders) && Array.isArray(positions)

  // Stable signature so the effect only re-runs when inputs actually change.
  const earnedIds = new Set(badges.filter((b) => b.earned).map((b) => b.id))
  const signature = dataReady
    ? `${orders.length}|${positions.map((p) => `${p.ticker}:${p.total_qty}`).join(',')}|${[...earnedIds].sort().join(',')}`
    : 'pending'

  useEffect(() => {
    if (!dataReady || writingRef.current) return

    const satisfied = evaluateEarned({ orders, positions })
    const toInsert = [...satisfied].filter((id) => !earnedIds.has(id))

    if (toInsert.length === 0) {
      syncedRef.current = true
      return
    }

    const firstSync = !syncedRef.current
    writingRef.current = true

    ;(async () => {
      const { error } = await supabase
        .from('achievements')
        .upsert(
          toInsert.map((id) => ({ user_id: user.id, achievement_type: id })),
          { onConflict: 'user_id,achievement_type', ignoreDuplicates: true },
        )

      if (!error) {
        await qc.invalidateQueries({ queryKey: ['achievements'] })

        // Backfill is silent; only later unlocks get a reveal moment.
        if (!firstSync) {
          const badge = badges.find((b) => b.id === toInsert[0])
          if (badge) navigate('/badge-earned', { state: { badge, tier: 'badge' } })
        }
      }

      syncedRef.current = true
      writingRef.current = false
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature])
}

// Null render component so the hook can be mounted declaratively in the tree.
export function AchievementEngine() {
  useAchievementEngine()
  return null
}
