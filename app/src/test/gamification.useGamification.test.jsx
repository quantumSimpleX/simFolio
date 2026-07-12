// IT-B6 — gamification driver: silent first backfill, later-unlock enqueue,
// and sequential queue draining. The gamekit engine is mocked so each test
// controls exactly what evaluate() returns; the rest of the driver wiring
// (queue state, navigation, track entry point) runs for real.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const navigateSpy = vi.fn()
const engineMock = vi.hoisted(() => ({ track: vi.fn(), evaluate: vi.fn(), progress: vi.fn() }))

vi.mock('react-router-dom', async (orig) => ({
  ...(await orig()),
  useNavigate: () => navigateSpy,
}))
vi.mock('../gamekit', () => ({ createEngine: () => engineMock }))

// Data hooks the provider reads — kept stable so the signature effect fires once.
vi.mock('../context/AuthContext', async (orig) => ({
  ...(await orig()),
  useAuth: () => ({ user: mockUser }),
}))
vi.mock('../hooks/usePortfolio', () => ({ usePortfolio: () => ({ raw: { positions: [] } }) }))
vi.mock('../hooks/useOrders', () => ({ useOrders: () => ({ data: [] }) }))
vi.mock('../hooks/useHeroSelections', () => ({ useHeroSelections: () => ({ heroes: [] }) }))
vi.mock('../hooks/useAchievements', () => ({
  useAchievements: () => ({
    badges: [{ id: 'researcher', name: 'Researcher', desc: 'View 10 pages', earned: false }],
    earnedCount: 0,
  }),
}))

let mockUser = { id: 'u1' }

import { GamificationProvider, useTrack, useReveal, joinDayChange } from '../gamification/useGamification'

// Probe surfaces the reveal state and exposes the track/advance entry points.
function Probe() {
  const track = useTrack()
  const { currentId, queue, advance } = useReveal()
  return (
    <div>
      <span data-testid="current">{currentId ?? 'none'}</span>
      <span data-testid="len">{queue.length}</span>
      <button onClick={() => track('stock.viewed', { ticker: 'NVDA' })}>track</button>
      <button onClick={() => advance()}>advance</button>
    </div>
  )
}

function renderDriver() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/']}>
        <GamificationProvider><Probe /></GamificationProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  navigateSpy.mockClear()
  engineMock.track.mockClear()
  engineMock.evaluate.mockReset()
  mockUser = { id: 'u1' }
})

describe('gamification driver (IT-B6)', () => {
  it('first sync after data load is a silent backfill — no reveal', async () => {
    // Even though a badge qualifies on first evaluate, it must NOT enqueue/navigate.
    engineMock.evaluate.mockResolvedValue({ unlocked: [{ id: 'researcher' }], progress: [] })
    renderDriver()
    await waitFor(() => expect(engineMock.evaluate).toHaveBeenCalled())
    expect(screen.getByTestId('current').textContent).toBe('none')
    expect(navigateSpy).not.toHaveBeenCalledWith('/badge-earned')
  })

  it('a later unlock enqueues and routes to the reveal screen', async () => {
    // First (mount) evaluate is the silent sync; a subsequent track triggers a
    // second evaluate that returns a fresh unlock.
    engineMock.evaluate.mockResolvedValueOnce({ unlocked: [], progress: [] })
    renderDriver()
    await waitFor(() => expect(engineMock.evaluate).toHaveBeenCalledTimes(1))

    engineMock.evaluate.mockResolvedValueOnce({ unlocked: [{ id: 'researcher' }], progress: [] })
    await act(async () => { screen.getByText('track').click() })

    await waitFor(() => expect(screen.getByTestId('current').textContent).toBe('researcher'))
    expect(engineMock.track).toHaveBeenCalledWith('u1', expect.objectContaining({ type: 'stock.viewed', props: { ticker: 'NVDA' } }))
    expect(navigateSpy).toHaveBeenCalledWith('/badge-earned')
  })

  it('drains multiple unlocks one at a time via advance()', async () => {
    engineMock.evaluate.mockResolvedValueOnce({ unlocked: [], progress: [] })
    renderDriver()
    await waitFor(() => expect(engineMock.evaluate).toHaveBeenCalledTimes(1))

    engineMock.evaluate.mockResolvedValueOnce({ unlocked: [{ id: 'a' }, { id: 'b' }], progress: [] })
    await act(async () => { screen.getByText('track').click() })

    await waitFor(() => expect(screen.getByTestId('current').textContent).toBe('a'))
    expect(screen.getByTestId('len').textContent).toBe('2')

    await act(async () => { screen.getByText('advance').click() })
    await waitFor(() => expect(screen.getByTestId('current').textContent).toBe('b'))
    expect(screen.getByTestId('len').textContent).toBe('1')
  })

  it('track is a no-op when there is no user (dev session bypass)', async () => {
    mockUser = null
    engineMock.evaluate.mockResolvedValue({ unlocked: [], progress: [] })
    renderDriver()
    await act(async () => { screen.getByText('track').click() })
    expect(engineMock.track).not.toHaveBeenCalled()
  })
})

// T-04 — positions carry a `dayChange` percent joined from the live quote cache
// so the `steady` gauge has data. `dayChange` is the quote's `pct` field (e.g.
// -6.2 for a 6.2% drop); it is present only when the quote is cached, otherwise
// omitted (undefined), which the gauge excludes rather than counting as flat.
describe('joinDayChange — position dayChange join', () => {
  it('joins dayChange from the cached quote pct (batched key)', () => {
    const qc = new QueryClient()
    qc.setQueryData(['quotes', 'AAPL,MSFT'], [
      { ticker: 'AAPL', pct: -6.2 },
      { ticker: 'MSFT', pct: 1.1 },
    ])
    const out = joinDayChange(
      [{ ticker: 'AAPL', total_qty: '2' }, { ticker: 'MSFT', total_qty: '1' }],
      qc,
    )
    expect(out[0].dayChange).toBe(-6.2)
    expect(out[1].dayChange).toBe(1.1)
  })

  it('omits dayChange for a position whose quote is not cached', () => {
    const qc = new QueryClient()
    qc.setQueryData(['quotes', 'AAPL'], [{ ticker: 'AAPL', pct: -6.2 }])
    const out = joinDayChange([{ ticker: 'AAPL' }, { ticker: 'TSLA' }], qc)
    expect(out[0].dayChange).toBe(-6.2)
    expect('dayChange' in out[1]).toBe(false)
  })

  it('does not throw when no quotes are cached; returns positions unchanged', () => {
    const qc = new QueryClient()
    const positions = [{ ticker: 'AAPL' }]
    expect(() => joinDayChange(positions, qc)).not.toThrow()
    expect('dayChange' in joinDayChange(positions, qc)[0]).toBe(false)
  })

  it('returns an empty array for empty or undefined positions', () => {
    const qc = new QueryClient()
    expect(joinDayChange([], qc)).toEqual([])
    expect(joinDayChange(undefined, qc)).toEqual([])
  })
})

describe('useTrack / useReveal outside the provider', () => {
  it('return safe no-op defaults without crashing', () => {
    function Bare() {
      const track = useTrack()
      const { currentId, queue } = useReveal()
      return <span data-testid="bare">{typeof track}:{currentId ?? 'none'}:{queue.length}</span>
    }
    render(<Bare />)
    expect(screen.getByTestId('bare').textContent).toBe('function:none:0')
  })
})
