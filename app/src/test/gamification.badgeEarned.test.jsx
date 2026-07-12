// IT-B8 — BadgeEarned reveal screen: data-driven (not hard-coded), sequential
// queue draining, tier rendering, the medal-earned variant (crossed-threshold
// reveals queued after the badge), and the no-state smoke fallback.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const navigateSpy = vi.fn()
let mockReveal = { currentId: null, queue: [], advance: vi.fn() }
let mockAch = {
  badges: [
    { id: 'researcher', name: 'Researcher', desc: 'View 10 different stock detail pages', earned: true },
    { id: 'a', name: 'Badge A', desc: 'desc a', earned: true },
    { id: 'b', name: 'Badge B', desc: 'desc b', earned: true },
  ],
  earnedCount: 3,
  medalCount: 0,
}

vi.mock('react-router-dom', async (orig) => ({
  ...(await orig()),
  useNavigate: () => navigateSpy,
}))
vi.mock('../gamification/useGamification', () => ({
  useReveal: () => mockReveal,
  useTrack: () => () => {},
}))
vi.mock('../hooks/useAchievements', () => ({
  useAchievements: () => mockAch,
}))

import BadgeEarned from '../screens/achievements/BadgeEarned'

function renderAt(state) {
  const entry = state ? { pathname: '/badge-earned', state } : '/badge-earned'
  return render(<MemoryRouter initialEntries={[entry]}><BadgeEarned /></MemoryRouter>)
}

// Earned-badge fixture where each id is a real badge id from defs.js, so the
// component's computeProgression diff runs against the real progression config.
function earnedBadges(ids) {
  return ids.map((id) => ({ id, name: id, desc: `${id} desc`, earned: true }))
}

beforeEach(() => {
  navigateSpy.mockClear()
  mockReveal = { currentId: null, queue: [], advance: vi.fn() }
  mockAch = {
    badges: [
      { id: 'researcher', name: 'Researcher', desc: 'View 10 different stock detail pages', earned: true },
      { id: 'a', name: 'Badge A', desc: 'desc a', earned: true },
      { id: 'b', name: 'Badge B', desc: 'desc b', earned: true },
    ],
    earnedCount: 3,
    medalCount: 0,
  }
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
    fireEvent.click(screen.getByRole('button', { name: /Continue/ }))
    expect(advance).toHaveBeenCalledTimes(1)
    expect(navigateSpy).not.toHaveBeenCalled() // still draining
  })

  it('last item: dismissing the final badge navigates back', () => {
    const advance = vi.fn()
    mockReveal = { currentId: 'a', queue: ['a'], advance }
    renderAt()
    fireEvent.click(screen.getByRole('button', { name: /Continue/ }))
    expect(advance).toHaveBeenCalledTimes(1)
    expect(navigateSpy).toHaveBeenCalledWith(-1)
  })

  it('medal tier still renders from router state', () => {
    renderAt({ tier: 'medal' })
    expect(screen.getByText('Apprentice')).toBeInTheDocument()
  })

  it('trophy tier still renders from router state', () => {
    renderAt({ tier: 'trophy' })
    expect(screen.getByText('The Disciplined Investor')).toBeInTheDocument()
  })

  // ── Real progression math (T-20) ──────────────────────────────────────────

  it('badge tier: shows real progress toward the badge\'s nearest medal (threshold ≠ 10)', () => {
    // Two of the four Trader-Medal badges earned → nearest medal is Trader Medal,
    // threshold 4 — proves the fake count/10 ladder is gone.
    mockAch = {
      badges: earnedBadges(['first_trade', 'limit']),
      earnedCount: 2,
      medalCount: 0,
    }
    mockReveal = { currentId: 'limit', queue: ['limit'], advance: vi.fn() }
    renderAt()

    expect(screen.getByText('2 of 4 toward Trader Medal')).toBeInTheDocument()
    // No stale count/10 ladder math anywhere.
    expect(screen.queryByText(/of 10 toward your first medal/)).not.toBeInTheDocument()
  })

  it('medal tier: progress + remaining-medals subtitle are derived, not hardcoded', () => {
    // 1 of 7 medals earned → "6 more" to the trophy (never the old fixed "9 more").
    renderAt({ tier: 'medal' })

    expect(screen.getByText('0 of 7 toward Master of Trading')).toBeInTheDocument()
    expect(screen.getByText('Earn 7 more medals to unlock the trophy.')).toBeInTheDocument()
    // No stale "10"-ladder or fixed "9 more medals" copy.
    expect(screen.queryByText(/of 10/)).not.toBeInTheDocument()
    expect(screen.queryByText(/9 more medals/)).not.toBeInTheDocument()
  })

  it('trophy tier: no progress ring or "toward X" affordance — it is terminal', () => {
    renderAt({ tier: 'trophy' })

    expect(screen.getByText("You've mastered every medal.")).toBeInTheDocument()
    // The progress ring/progressbar and its stale "1 of 10 toward Master of Trading"
    // copy must be gone entirely for the terminal achievement.
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    expect(screen.queryByText(/toward Master of Trading/)).not.toBeInTheDocument()
    expect(screen.queryByText(/of 10/)).not.toBeInTheDocument()
  })

  it('no-state fallback smoke-passes (default badge moment)', () => {
    renderAt()
    expect(screen.getByText('First Trade')).toBeInTheDocument()
    expect(navigateSpy).not.toHaveBeenCalled()
  })

  // ── Medal-earned variant ──────────────────────────────────────────────────

  it('medal variant: a badge that completes a medal queues a "Medal earned" reveal after it', () => {
    // reflection is the 5th badge earned → crosses Explorer I (any 5), no thematic.
    const advance = vi.fn()
    mockAch = {
      badges: earnedBadges(['first_trade', 'limit', 'contrarian', 'researcher', 'reflection']),
      earnedCount: 5,
      medalCount: 1,
    }
    mockReveal = { currentId: 'reflection', queue: ['reflection'], advance }
    renderAt()

    // Badge reveals first.
    expect(screen.getByText('Badge earned')).toBeInTheDocument()
    expect(screen.getByText('reflection')).toBeInTheDocument()
    expect(navigateSpy).not.toHaveBeenCalled()

    // Dismiss → medal reveal, still not leaving. One badge → advance once.
    fireEvent.click(screen.getByRole('button', { name: /Continue/ }))
    expect(advance).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Medal earned')).toBeInTheDocument()
    expect(screen.getByText('Explorer I')).toBeInTheDocument()
    // Real trophy progress: 1 of 7 medals, derived "6 more" subtitle (not "9 more").
    expect(screen.getByText('1 of 7 toward Master of Trading')).toBeInTheDocument()
    expect(screen.getByText('Earn 6 more medals to unlock the trophy.')).toBeInTheDocument()
    expect(screen.queryByText(/9 more medals/)).not.toBeInTheDocument()
    expect(navigateSpy).not.toHaveBeenCalled()

    // Dismiss the medal → sequence drained, leave. No extra shared-queue advance.
    fireEvent.click(screen.getByRole('button', { name: /Continue/ }))
    expect(advance).toHaveBeenCalledTimes(1)
    expect(navigateSpy).toHaveBeenCalledWith(-1)
  })

  it('multi-medal: one badge crossing two thresholds queues both, sequentially, none dropped', () => {
    // momentum completes the Trader Medal (4th trading badge) AND is the 5th badge
    // overall → Explorer I. Both must reveal, in defs order, before leaving.
    const advance = vi.fn()
    mockAch = {
      badges: earnedBadges(['first_trade', 'limit', 'contrarian', 'momentum', 'researcher']),
      earnedCount: 5,
      medalCount: 2,
    }
    mockReveal = { currentId: 'momentum', queue: ['momentum'], advance }
    renderAt()

    // Badge first.
    expect(screen.getByText('momentum')).toBeInTheDocument()

    // First medal.
    fireEvent.click(screen.getByRole('button', { name: /Continue/ }))
    expect(screen.getByText('Trader Medal')).toBeInTheDocument()
    expect(screen.getByText('Medal earned')).toBeInTheDocument()
    expect(navigateSpy).not.toHaveBeenCalled()

    // Second medal — not dropped despite two crossings from one badge.
    fireEvent.click(screen.getByRole('button', { name: /Continue/ }))
    expect(screen.getByText('Explorer I')).toBeInTheDocument()
    expect(navigateSpy).not.toHaveBeenCalled()

    // Only after both medals do we leave; exactly one shared-queue advance (one badge).
    fireEvent.click(screen.getByRole('button', { name: /Continue/ }))
    expect(advance).toHaveBeenCalledTimes(1)
    expect(navigateSpy).toHaveBeenCalledWith(-1)
  })
})
