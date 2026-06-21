import { createContext, createElement, useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { usePortfolio } from '../hooks/usePortfolio'
import { useOrders } from '../hooks/useOrders'
import { useAchievements } from '../hooks/useAchievements'
import { useHeroSelections } from '../hooks/useHeroSelections'
import { createEngine } from '../gamekit'
import { createMetricStore } from './metricStore'
import { createStateProvider } from './stateProvider'
import { createAchievementStore } from './achievementStore'
import { METRICS, ACHIEVEMENTS } from './defs'

// Holds the reveal queue + track entry point so call sites and BadgeEarned can
// reach them without prop-drilling. The engine itself lives in the driver hook.
const GamificationContext = createContext(null)

// Gauge state for the StateProvider is read from the live React Query caches
// rather than re-fetching: getPositions returns raw positions, getCouncilSize
// returns the current council count. These are filled by the driver each render.

export function GamificationProvider({ children }) {
  const { user } = useAuth()
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { raw } = usePortfolio()
  const { data: orders } = useOrders()
  const { badges } = useAchievements()
  const { heroes } = useHeroSelections()

  // Reveal queue: ids of freshly-unlocked badges awaiting their full-screen moment.
  const [queue, setQueue] = useState([])

  // Latest live state, read by the StateProvider getters via refs so the engine
  // (created once) always sees current data without being re-instantiated.
  // Refs are mirrored from props in an effect (never written during render).
  const positions = raw?.positions
  const positionsRef = useRef([])
  const councilRef = useRef(0)
  useEffect(() => {
    positionsRef.current = positions ?? []
    councilRef.current = heroes?.length ?? 0
  })

  const syncedRef = useRef(false) // first backfill done?
  const writingRef = useRef(false) // evaluate in flight, avoid double-fire

  // Engine is created exactly once via a lazy useState initializer. The
  // StateProvider getters close over refs and are only invoked when the engine
  // calls them during evaluate() — never during render — so reading the refs is
  // safe here. (react-hooks/refs can't see through the deferred call.)
  /* eslint-disable react-hooks/refs */
  const [engine] = useState(() =>
    createEngine({
      metrics: METRICS,
      achievements: ACHIEVEMENTS,
      ports: {
        metricStore: createMetricStore(supabase),
        stateProvider: createStateProvider({
          getPositions: () => Promise.resolve(positionsRef.current),
          getCouncilSize: () => Promise.resolve(councilRef.current),
        }),
        achievementStore: createAchievementStore(supabase),
      },
    }),
  )
  /* eslint-enable react-hooks/refs */

  // runEvaluate(): evaluate, persist, and enqueue any new unlocks. The FIRST
  // evaluation after data load is a silent backfill (no reveal) — matching the
  // retired useAchievementEngine.
  const runEvaluate = useCallback(async () => {
    if (!user || writingRef.current) return
    writingRef.current = true
    try {
      const { unlocked } = await engine.evaluate(user.id)
      const firstSync = !syncedRef.current
      syncedRef.current = true
      if (unlocked.length > 0) {
        await qc.invalidateQueries({ queryKey: ['achievements'] })
        if (!firstSync) setQueue((q) => [...q, ...unlocked.map((a) => a.id)])
      }
    } finally {
      writingRef.current = false
    }
  }, [user, engine, qc])

  // track(): fold an event into the metric store, then evaluate. Guarded so a
  // null user (dev session bypass) is a no-op instead of a crash.
  const track = useCallback(
    async (type, props) => {
      if (!user) return
      await engine.track(user.id, { type, ts: Date.now(), props: props ?? {} })
      await runEvaluate()
    },
    [user, engine, runEvaluate],
  )

  // Re-evaluate when the inputs that gauge/duration badges depend on change.
  // Stable signature so the effect only fires on real changes.
  const earnedSig = badges.filter((b) => b.earned).map((b) => b.id).sort().join(',')
  const dataReady = !!user && Array.isArray(orders) && Array.isArray(positions)
  const signature = dataReady
    ? `${orders.length}|${positions.map((p) => `${p.ticker}:${p.total_qty}`).join(',')}|${heroes.length}|${earnedSig}`
    : 'pending'

  useEffect(() => {
    if (dataReady) runEvaluate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature])

  // When the queue is non-empty, route to the reveal screen. Subsequent items
  // are drained in place by BadgeEarned, so this only acts when not already there.
  useEffect(() => {
    if (queue.length > 0 && pathname !== '/badge-earned') {
      navigate('/badge-earned')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue.length, pathname])

  // advance(): drop the head of the queue (called when a reveal is dismissed).
  const advance = useCallback(() => setQueue((q) => q.slice(1)), [])

  const value = useMemo(
    () => ({ track, queue, currentId: queue[0] ?? null, advance }),
    [track, queue, advance],
  )

  // eslint-disable-next-line react-hooks/refs
  return createElement(GamificationContext.Provider, { value }, children)
}

// useTrack(): call-site entry point. track(type, props) emits an event.
// eslint-disable-next-line react-refresh/only-export-components
export function useTrack() {
  const ctx = useContext(GamificationContext)
  // Outside the provider (or before mount) tracking is a safe no-op.
  return ctx?.track ?? (() => {})
}

// useReveal(): consumed by BadgeEarned to drain the queue one item at a time.
// eslint-disable-next-line react-refresh/only-export-components
export function useReveal() {
  const ctx = useContext(GamificationContext)
  return {
    currentId: ctx?.currentId ?? null,
    queue: ctx?.queue ?? [],
    advance: ctx?.advance ?? (() => {}),
  }
}

// Null-render component mirroring the retired AchievementEngine. The provider
// does the work; this exists so App can mount the driver declaratively.
export function GamificationEngine() {
  return null
}
