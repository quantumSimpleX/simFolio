// IT-B8 — BadgeEarned reveal screen: data-driven (not hard-coded), sequential
// queue draining, tier rendering, and the no-state smoke fallback.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const navigateSpy = vi.fn()
let mockReveal = { currentId: null, queue: [], advance: vi.fn() }

vi.mock('react-router-dom', async (orig) => ({
  ...(await orig()),
  useNavigate: () => navigateSpy,
}))
vi.mock('../gamification/useGamification', () => ({
  useReveal: () => mockReveal,
  useTrack: () => () => {},
}))
vi.mock('../hooks/useAchievements', () => ({
  useAchievements: () => ({
    badges: [
      { id: 'researcher', name: 'Researcher', desc: 'View 10 different stock detail pages', earned: true },
      { id: 'a', name: 'Badge A', desc: 'desc a', earned: true },
      { id: 'b', name: 'Badge B', desc: 'desc b', earned: true },
    ],
    earnedCount: 3,
  }),
}))

import BadgeEarned from '../screens/achievements/BadgeEarned'

function renderAt(state) {
  const entry = state ? { pathname: '/badge-earned', state } : '/badge-earned'
  return render(<MemoryRouter initialEntries={[entry]}><BadgeEarned /></MemoryRouter>)
}

beforeEach(() => {
  navigateSpy.mockClear()
  mockReveal = { currentId: null, queue: [], advance: vi.fn() }
})

describe('BadgeEarned (IT-B8)', () => {
  it('renders the queued badge data-driven (not hard-coded First Trade)', () => {
    mockReveal = { currentId: 'researcher', queue: ['researcher'], advance: vi.fn() }
    renderAt()
    expect(screen.getByText('Researcher')).toBeInTheDocument()
    expect(screen.queryByText('First Trade')).not.toBeInTheDocument()
  })

  it('sequential reveal: dismissing advances to the next queued badge without leaving', () => {
    const advance = vi.fn()
    mockReveal = { currentId: 'a', queue: ['a', 'b'], advance }
    renderAt()
    screen.getByRole('button', { name: /Continue/ }).click()
    expect(advance).toHaveBeenCalledTimes(1)
    expect(navigateSpy).not.toHaveBeenCalled() // still draining
  })

  it('last item: dismissing the final badge navigates to /portfolio', () => {
    const advance = vi.fn()
    mockReveal = { currentId: 'a', queue: ['a'], advance }
    renderAt()
    screen.getByRole('button', { name: /Continue/ }).click()
    expect(advance).toHaveBeenCalledTimes(1)
    expect(navigateSpy).toHaveBeenCalledWith('/portfolio')
  })

  it('medal tier still renders from router state', () => {
    renderAt({ tier: 'medal' })
    expect(screen.getByText('Apprentice')).toBeInTheDocument()
  })

  it('trophy tier still renders from router state', () => {
    renderAt({ tier: 'trophy' })
    expect(screen.getByText('The Disciplined Investor')).toBeInTheDocument()
  })

  it('no-state fallback smoke-passes (default badge moment)', () => {
    renderAt()
    expect(screen.getByText('First Trade')).toBeInTheDocument()
    expect(navigateSpy).not.toHaveBeenCalled()
  })
})
