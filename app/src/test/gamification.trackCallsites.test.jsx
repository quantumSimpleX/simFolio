// IT-B7 — track() call sites emit the right event + props. useTrack is mocked
// to a spy so each test asserts the emission without standing up the engine.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderWithProviders } from './renderWithProviders'

const trackSpy = vi.fn()

vi.mock('../gamification/useGamification', () => ({
  useTrack: () => trackSpy,
  useReveal: () => ({ currentId: null, queue: [], advance: () => {} }),
}))
vi.mock('../context/AuthContext', async (orig) => ({
  ...(await orig()),
  useAuth: () => ({ user: { id: 'u1' }, session: null }),
}))

import StockDetail from '../screens/markets/StockDetail'
import TradeReceipt from '../screens/trade/TradeReceipt'
import { usePlaceOrder } from '../hooks/usePlaceOrder'
import { useChangeHero } from '../hooks/useChangeHero'
import { useHeroChat } from '../hooks/useHeroChat'

function hookWrapper({ children }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}

beforeEach(() => trackSpy.mockClear())

describe('track() call sites (IT-B7)', () => {
  it('StockDetail emits stock.viewed with the ticker on mount', async () => {
    renderWithProviders(<StockDetail />, { route: '/stock/AAPL', path: '/stock/:ticker' })
    await waitFor(() =>
      expect(trackSpy).toHaveBeenCalledWith('stock.viewed', { ticker: 'AAPL' }),
    )
  })

  it('TradeReceipt emits sell.reflected when the reflection link is used', () => {
    const state = { result: { status: 'FILLED', execution_price: 100, market_price: 100 }, ticker: 'AAPL', qty: 1, side: 'sell' }
    renderWithProviders(<TradeReceipt />, { route: { pathname: '/receipt', state }, path: '/receipt' })
    screen.getByText(/Add a reflection note/i).click()
    expect(trackSpy).toHaveBeenCalledWith('sell.reflected', { ticker: 'AAPL' })
  })

  it('usePlaceOrder emits trade.placed with type/side/dayChange on success', async () => {
    const { result } = renderHook(() => usePlaceOrder(), { wrapper: hookWrapper })
    await act(async () => {
      await result.current.mutateAsync({ ticker: 'AAPL', type: 'MARKET', side: 'BUY', dayChange: -12 })
    })
    expect(trackSpy).toHaveBeenCalledWith('trade.placed', { type: 'MARKET', side: 'BUY', dayChange: -12 })
  })

  it('usePlaceOrder defaults dayChange to 0 when omitted', async () => {
    const { result } = renderHook(() => usePlaceOrder(), { wrapper: hookWrapper })
    await act(async () => {
      await result.current.mutateAsync({ ticker: 'AAPL', type: 'LIMIT', side: 'BUY', limit_price: 1 })
    })
    expect(trackSpy).toHaveBeenCalledWith('trade.placed', { type: 'LIMIT', side: 'BUY', dayChange: 0 })
  })

  it('useChangeHero emits hero.unlocked with the heroId on success', async () => {
    const { result } = renderHook(() => useChangeHero(), { wrapper: hookWrapper })
    await act(async () => { await result.current.mutateAsync('cathie') })
    expect(trackSpy).toHaveBeenCalledWith('hero.unlocked', { heroId: 'cathie' })
  })

  it('useHeroChat emits chat.sent with macro=true for a market-conditions message', async () => {
    const { result } = renderHook(() => useHeroChat('warren', {}), { wrapper: hookWrapper })
    await act(async () => { result.current.mutate('What do you think about inflation right now?') })
    await waitFor(() => expect(trackSpy).toHaveBeenCalledWith('chat.sent', { macro: true }))
  })

  it('useHeroChat emits chat.sent with macro=false for an ordinary message', async () => {
    const { result } = renderHook(() => useHeroChat('warren', {}), { wrapper: hookWrapper })
    await act(async () => { result.current.mutate('Should I buy more Apple shares?') })
    await waitFor(() => expect(trackSpy).toHaveBeenCalledWith('chat.sent', { macro: false }))
  })
})
