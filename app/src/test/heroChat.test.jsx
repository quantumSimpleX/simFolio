import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '../context/AuthContext'
import { __reset, supabase } from './supabaseMock'

import { useAuth } from '../context/AuthContext'
import { buildHeroContext } from '../lib/heroContext'
import { useHeroChat } from '../hooks/useHeroChat'

const POSITIONS = [
  { ticker: 'AAPL', total_qty: '10', average_cost_basis: '150', price: 213 },
  { ticker: 'NVDA', total_qty: '5', average_cost_basis: '92', price: 138 },
]

describe('buildHeroContext', () => {
  it('summarises cash, holdings, and watchlist', () => {
    const ctx = buildHeroContext(POSITIONS, 1000, ['MSFT', 'TSLA'])
    expect(ctx).toContain('Cash: $1000.00.')
    expect(ctx).toContain('AAPL (10 shares @ avg $150.00, current $213.00)')
    expect(ctx).toContain('NVDA (5 shares @ avg $92.00, current $138.00)')
    expect(ctx).toContain('Watchlist (watching, not owned): MSFT, TSLA.')
  })

  it('reports no positions and omits an empty watchlist', () => {
    const ctx = buildHeroContext([], 500, [])
    expect(ctx).toBe('Cash: $500.00. No positions yet.')
    expect(ctx).not.toContain('Watchlist')
  })

  it('handles a missing price and missing cash gracefully', () => {
    const ctx = buildHeroContext([{ ticker: 'X', total_qty: '1', average_cost_basis: '10' }], undefined, undefined)
    expect(ctx).toContain('Cash: $0.')
    expect(ctx).toContain('current $?')
  })
})

// Shared QueryClient so the test can inspect the hero-history cache the hook
// mutates optimistically. Key matches ['hero-history', user.id, heroId].
function makeHarness() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }) => (
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <MemoryRouter>{children}</MemoryRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
  return { qc, wrapper }
}

const KEY = ['hero-history', 'test-user', 'warren']

// Combine the mutation with auth so tests can wait for the session to load
// before mutating (the hook keys its cache on user.id).
function useChatWithAuth() {
  const { user } = useAuth()
  const chat = useHeroChat('warren', 'ctx')
  return { user, chat }
}

describe('useHeroChat optimistic update', () => {
  beforeEach(() => {
    __reset()
    supabase.functions.invoke.mockReset()
  })

  it('shows the user message immediately, before the reply resolves', async () => {
    let resolveInvoke
    supabase.functions.invoke.mockImplementation(() => new Promise(r => { resolveInvoke = r }))

    const { qc, wrapper } = makeHarness()
    const { result } = renderHook(() => useChatWithAuth(), { wrapper })
    await waitFor(() => expect(result.current.user?.id).toBe('test-user'))

    act(() => { result.current.chat.mutate('Is AAPL overvalued?') })

    // The optimistic user bubble lands in the cache while the LLM call is pending.
    await waitFor(() => {
      const msgs = qc.getQueryData(KEY) ?? []
      expect(msgs.at(-1)).toMatchObject({ role: 'user', content: 'Is AAPL overvalued?' })
    })

    resolveInvoke({ data: { reply: 'What is its earnings power?', model: 'x' }, error: null })
    await waitFor(() => expect(result.current.chat.isSuccess).toBe(true))
  })

  it('rolls the optimistic message back when the call fails', async () => {
    supabase.functions.invoke.mockResolvedValue({ data: null, error: new Error('boom') })

    const { qc, wrapper } = makeHarness()
    const { result } = renderHook(() => useChatWithAuth(), { wrapper })
    await waitFor(() => expect(result.current.user?.id).toBe('test-user'))
    qc.setQueryData(KEY, [{ role: 'assistant', content: 'earlier' }])

    act(() => { result.current.chat.mutate('hello') })

    await waitFor(() => expect(result.current.chat.isError).toBe(true))
    expect(qc.getQueryData(KEY)).toEqual([{ role: 'assistant', content: 'earlier' }])
  })
})
