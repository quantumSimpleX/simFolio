import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '../context/AuthContext'
import { ThemeProvider } from '../context/ThemeContext'
import { LanguageProvider } from '../context/LanguageContext'
import { __setTableData, supabase } from './supabaseMock'

import { useBreakpoint, useIsMobile } from '../hooks/useBreakpoint'
import { useWatchlist } from '../hooks/useWatchlist'
import { useOrders, useCancelOrder } from '../hooks/useOrders'
import { useAchievements } from '../hooks/useAchievements'
import { useHeroSelections } from '../hooks/useHeroSelections'
import { useSymbolSearch } from '../hooks/useSymbolSearch'
import { usePlaceOrder } from '../hooks/usePlaceOrder'
import { useHeroRanking } from '../hooks/useHeroRanking'
import { useAuth } from '../context/AuthContext'

// Exposes both the live session and the mutation so tests can wait for the
// AuthProvider to settle before placing an order (the hook branches on session).
function usePlaceOrderWithAuth() {
  const { session } = useAuth()
  const m = usePlaceOrder()
  return { session, m }
}

// Fresh QueryClient + full provider stack per render, mirroring renderWithProviders.
function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  })
  return function Wrapper({ children }) {
    return (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <ThemeProvider>
            <LanguageProvider>
              <MemoryRouter>{children}</MemoryRouter>
            </LanguageProvider>
          </ThemeProvider>
        </AuthProvider>
      </QueryClientProvider>
    )
  }
}

function setInnerWidth(w) {
  Object.defineProperty(window, 'innerWidth', { value: w, configurable: true, writable: true })
}

describe('useBreakpoint', () => {
  it('reports mobile / tablet / desktop from window.innerWidth', () => {
    setInnerWidth(500)
    const { result, rerender } = renderHook(() => useBreakpoint())
    expect(result.current).toBe('mobile')

    setInnerWidth(800)
    act(() => { window.dispatchEvent(new Event('resize')) })
    expect(result.current).toBe('tablet')

    setInnerWidth(1400)
    act(() => { window.dispatchEvent(new Event('resize')) })
    expect(result.current).toBe('desktop')

    rerender()
  })

  it('useIsMobile is true only below 768px', () => {
    setInnerWidth(500)
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(true)

    setInnerWidth(1024)
    act(() => { window.dispatchEvent(new Event('resize')) })
    expect(result.current).toBe(false)
  })
})

describe('useWatchlist', () => {
  beforeEach(() => __setTableData('watchlist', []))

  it('loads the user rows, then add/remove/has reflect state', async () => {
    __setTableData('watchlist', [{ ticker: 'NVDA' }])
    const { result } = renderHook(() => useWatchlist(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.watchlist).toEqual(['NVDA']))
    expect(result.current.isWatching('nvda')).toBe(true)
    expect(result.current.isWatching('AAPL')).toBe(false)

    // add (lowercase is normalised). The mock ignores writes, so mirror the
    // backend write into the seeded table for the post-settle refetch.
    act(() => {
      __setTableData('watchlist', [{ ticker: 'NVDA' }, { ticker: 'AAPL' }])
      result.current.addToWatchlist('aapl')
    })
    await waitFor(() => expect(result.current.isWatching('AAPL')).toBe(true))
    expect(supabase.from).toHaveBeenCalledWith('watchlist')

    // adding a duplicate does not grow the list
    const lenBefore = result.current.watchlist.length
    act(() => result.current.addToWatchlist('AAPL'))
    expect(result.current.watchlist.length).toBe(lenBefore)

    act(() => {
      __setTableData('watchlist', [{ ticker: 'NVDA' }])
      result.current.removeFromWatchlist('aapl')
    })
    await waitFor(() => expect(result.current.isWatching('AAPL')).toBe(false))
  })

  it('is empty when the user has no rows', async () => {
    const { result } = renderHook(() => useWatchlist(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.watchlist).toEqual([]))
  })
})

describe('useOrders / useCancelOrder', () => {
  it('returns rows seeded for the logged-in user', async () => {
    __setTableData('orders', [
      { order_id: 'o1', user_id: 'test-user', ticker: 'AAPL', status: 'FILLED', executions: [] },
    ])
    const { result } = renderHook(() => useOrders(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(1)
    expect(result.current.data[0].order_id).toBe('o1')
  })

  it('useCancelOrder resolves through the update chain', async () => {
    const { result } = renderHook(() => useCancelOrder(), { wrapper: makeWrapper() })
    let res
    await act(async () => { res = await result.current.mutateAsync('o1') })
    // mutationFn returns undefined on success and throws on error; reaching here = success
    expect(res).toBeUndefined()
    expect(supabase.from).toHaveBeenCalledWith('orders')
  })
})

describe('useAchievements', () => {
  it('marks earned badges and exposes derived progression (no medal yet)', async () => {
    __setTableData('achievements', [
      { achievement_type: 'first_trade', unlocked_at: '2026-01-01T00:00:00Z' },
    ])
    const { result } = renderHook(() => useAchievements(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.earnedCount).toBe(1))
    expect(result.current.medalCount).toBe(0)
    expect(result.current.trophyCount).toBe(0)
    // derived arrays are present and computed from earned badges
    expect(Array.isArray(result.current.medals)).toBe(true)
    expect(Array.isArray(result.current.trophies)).toBe(true)
    const trader = result.current.medals.find(m => m.id === 'medal_trader')
    expect(trader.earned).toBe(false)
    expect(trader.earnedCount).toBe(1) // first_trade counts toward it
    const first = result.current.badges.find(b => b.id === 'first_trade')
    expect(first.earned).toBe(true)
    expect(first.unlocked_at).toBe('2026-01-01T00:00:00Z')
    // an unearned badge stays false
    expect(result.current.badges.find(b => !b.earned).earned).toBe(false)
  })

  it('awards a thematic medal once its full badge set is earned', async () => {
    // The Trader Medal requires the full set (threshold 4).
    __setTableData('achievements', [
      { achievement_type: 'first_trade', unlocked_at: '2026-01-01T00:00:00Z' },
      { achievement_type: 'limit', unlocked_at: '2026-01-02T00:00:00Z' },
      { achievement_type: 'contrarian', unlocked_at: '2026-01-03T00:00:00Z' },
      { achievement_type: 'momentum', unlocked_at: '2026-01-04T00:00:00Z' },
    ])
    const { result } = renderHook(() => useAchievements(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.earnedCount).toBe(4))
    expect(result.current.medalCount).toBe(1)
    expect(result.current.trophyCount).toBe(0) // not every medal earned
    const trader = result.current.medals.find(m => m.id === 'medal_trader')
    expect(trader.earned).toBe(true)
    expect(trader.progress).toBe(1)
  })

  it('treats a legacy "council" row as the "mentor" badge (pre-migration alias)', async () => {
    __setTableData('achievements', [
      { achievement_type: 'council', unlocked_at: '2026-01-05T00:00:00Z' },
    ])
    const { result } = renderHook(() => useAchievements(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.earnedCount).toBe(1))
    const mentor = result.current.badges.find(b => b.id === 'mentor')
    expect(mentor.earned).toBe(true)
    expect(mentor.unlocked_at).toBe('2026-01-05T00:00:00Z')
  })
})

describe('useHeroSelections', () => {
  it('maps selected hero_ids to HERO_DATA and drops unknown ids', async () => {
    __setTableData('hero_selections', [
      { hero_id: 'warren' },
      { hero_id: 'not_a_real_hero' },
    ])
    const { result } = renderHook(() => useHeroSelections(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.heroes).toHaveLength(1))
    expect(result.current.heroes[0].id).toBe('warren')
  })
})

describe('useSymbolSearch', () => {
  beforeEach(() => vi.useRealTimers())

  it('returns [] for a blank query without fetching', () => {
    const { result } = renderHook(() => useSymbolSearch(''))
    expect(result.current).toEqual([])
  })

  it('debounces, fetches, and filters to US common stock / ETF', async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          { symbol: 'AAPL', instrument_type: 'Common Stock', country: 'United States' },
          { symbol: 'SPY', instrument_type: 'ETF', country: 'United States' },
          { symbol: 'NOPE', instrument_type: 'Common Stock', country: 'Germany' },
          { symbol: 'FUT', instrument_type: 'Futures', country: 'United States' },
        ],
      }),
    })
    const { result } = renderHook(() => useSymbolSearch('a'))
    await waitFor(() => expect(result.current.length).toBe(2), { timeout: 2000 })
    expect(result.current.map(r => r.symbol)).toEqual(['AAPL', 'SPY'])
  })
})

describe('usePlaceOrder', () => {
  beforeEach(() => supabase.functions.invoke.mockClear())

  it('no-op branch returns synthesized fill when session is null', async () => {
    // Force AuthContext to land on a null session: getSession empty AND the
    // anonymous fallback also yields none.
    supabase.auth.getSession.mockResolvedValueOnce({ data: { session: null } })
    supabase.auth.signInAnonymously.mockResolvedValueOnce({ data: { session: null }, error: null })
    const { result } = renderHook(() => usePlaceOrderWithAuth(), { wrapper: makeWrapper() })
    // provider settles to a null session (no real & no anon)
    await waitFor(() => expect(result.current.session).toBeNull())
    let out
    await act(async () => {
      out = await result.current.m.mutateAsync({ ticker: 'AAPL', limit_price: 42 })
    })
    expect(out.queued).toBe(false)
    expect(out.execution_price).toBe(42)
    expect(out.ticker).toBe('AAPL')
    expect(supabase.functions.invoke).not.toHaveBeenCalled()

    // a market order (no limit_price) falls back to execution_price 0
    let out2
    await act(async () => {
      out2 = await result.current.m.mutateAsync({ ticker: 'AAPL', qty: 1 })
    })
    expect(out2.execution_price).toBe(0)
  })

  it('FILLED branch returns edge function data', async () => {
    supabase.functions.invoke.mockResolvedValueOnce({
      data: { status: 'FILLED', execution_price: 150, queued: false }, error: null,
    })
    const { result } = renderHook(() => usePlaceOrderWithAuth(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.session).not.toBeNull())
    let out
    await act(async () => {
      out = await result.current.m.mutateAsync({ ticker: 'AAPL', qty: 1 })
    })
    expect(out.status).toBe('FILLED')
    expect(supabase.functions.invoke).toHaveBeenCalledWith('place-order', expect.objectContaining({
      body: { ticker: 'AAPL', qty: 1 },
    }))
  })

  it('QUEUED branch returns queued data', async () => {
    supabase.functions.invoke.mockResolvedValueOnce({
      data: { status: 'QUEUED', queued: true, order_id: 'q1' }, error: null,
    })
    const { result } = renderHook(() => usePlaceOrderWithAuth(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.session).not.toBeNull())
    let out
    await act(async () => {
      out = await result.current.m.mutateAsync({ ticker: 'AAPL', qty: 1 })
    })
    expect(out.queued).toBe(true)
  })

  it('throws when edge function returns transport error', async () => {
    supabase.functions.invoke.mockResolvedValueOnce({ data: null, error: new Error('boom') })
    const { result } = renderHook(() => usePlaceOrderWithAuth(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.session).not.toBeNull())
    await expect(
      act(async () => { await result.current.m.mutateAsync({ ticker: 'AAPL', qty: 1 }) }),
    ).rejects.toThrow('boom')
  })

  it('throws when edge function payload carries data.error', async () => {
    supabase.functions.invoke.mockResolvedValueOnce({
      data: { error: 'Insufficient funds' }, error: null,
    })
    const { result } = renderHook(() => usePlaceOrderWithAuth(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.session).not.toBeNull())
    await expect(
      act(async () => { await result.current.m.mutateAsync({ ticker: 'AAPL', qty: 1 }) }),
    ).rejects.toThrow('Insufficient funds')
  })
})

describe('useHeroRanking', () => {
  beforeEach(() => { supabase.functions.invoke.mockClear(); localStorage.clear() })

  it('returns Warren + the LLM-ranked 7 on success', async () => {
    const ranked = ['burry', 'simons', 'griffin', 'tepper', 'icahn', 'ackman', 'loeb']
    supabase.functions.invoke.mockResolvedValueOnce({ data: { ranked }, error: null })
    const { result } = renderHook(() => useHeroRanking({ goal: ['x'] }, { enabled: true }), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.heroIds[1]).toBe('burry'))
    expect(result.current.heroIds[0]).toBe('warren')
    expect(result.current.heroIds).toHaveLength(8)
    expect(result.current.heroIds.slice(1)).toEqual(ranked)
    expect(supabase.functions.invoke).toHaveBeenCalledWith('rank-heroes', expect.objectContaining({
      body: expect.objectContaining({ candidates: expect.any(Array) }),
    }))
  })

  it('falls back to a complete list on a malformed payload', async () => {
    supabase.functions.invoke.mockResolvedValueOnce({ data: { ranked: 'nope' }, error: null })
    const { result } = renderHook(() => useHeroRanking({ goal: ['x'] }, { enabled: true }), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.heroIds[0]).toBe('warren')
    expect(result.current.heroIds).toHaveLength(8)
    expect(new Set(result.current.heroIds).size).toBe(8)
    expect(result.current.isError).toBe(false)
  })

  it('falls back without throwing on a transport error', async () => {
    supabase.functions.invoke.mockResolvedValueOnce({ data: null, error: new Error('boom') })
    const { result } = renderHook(() => useHeroRanking({ goal: ['x'] }, { enabled: true }), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.heroIds[0]).toBe('warren')
    expect(result.current.heroIds).toHaveLength(8)
  })

  it('does not call the edge function when disabled', async () => {
    const { result } = renderHook(() => useHeroRanking({ goal: ['x'] }, { enabled: false }), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.heroIds[0]).toBe('warren'))
    expect(result.current.heroIds).toHaveLength(8)
    expect(supabase.functions.invoke).not.toHaveBeenCalled()
  })

  it('skips the call and falls back when there is no auth session', async () => {
    supabase.auth.getSession.mockResolvedValueOnce({ data: { session: null } })
    supabase.auth.signInAnonymously.mockResolvedValueOnce({ data: { session: null }, error: null })
    const { result } = renderHook(() => useHeroRanking({ goal: ['x'] }, { enabled: true }), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.heroIds[0]).toBe('warren'))
    expect(result.current.heroIds).toHaveLength(8)
    expect(supabase.functions.invoke).not.toHaveBeenCalled()
  })
})
