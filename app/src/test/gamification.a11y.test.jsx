// UX iteration 1 — accessibility/DS regressions for the gamification surfaces
// (GAMreq §9: UXR-1, UXR-3, UXR-4, UXR-5, UXR-6, UXR-9).
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { renderWithProviders } from './renderWithProviders'
import { BadgeGlyph } from '../components/Badges'

vi.mock('../hooks/useAchievements', () => ({
  useAchievements: () => ({
    badges: [
      { id: 'first_trade', name: 'First Trade', desc: 'Make your first trade', earned: true },
      { id: 'diversified', name: 'Diversified', desc: 'Hold 5 securities', earned: false },
    ],
    medals: [
      { id: 'medal_trader', name: 'Trader Medal', badges: ['first_trade', 'limit', 'contrarian', 'momentum'], threshold: 4, earnedCount: 1, earned: false, progress: 0.25 },
      { id: 'medal_builder', name: 'Builder Medal', badges: ['diversified', 'etf', 'etf2', 'first_crypto'], threshold: 4, earnedCount: 0, earned: false, progress: 0 },
      { id: 'medal_longterm', name: 'Long-term Medal', badges: ['patient', 'long_term', 'steady'], threshold: 3, earnedCount: 0, earned: false, progress: 0 },
      { id: 'medal_student', name: 'Student Medal', badges: ['researcher', 'reflection', 'macro', 'mentor'], threshold: 4, earnedCount: 0, earned: false, progress: 0 },
      // Resolvable badge so that, absent the isExplorer filter, this milestone medal
      // WOULD head a group — the test below asserts it never does.
      { id: 'medal_explorer_1', name: 'Explorer I', badges: ['first_trade'], threshold: 5, earnedCount: 1, earned: false, progress: 0.2 },
    ],
    trophies: [
      { id: 'trophy_master', name: 'Master of Trading', medals: [], threshold: 7, earnedCount: 0, earned: false, progress: 0 },
    ],
    earnedCount: 1,
    medalCount: 0,
    trophyCount: 0,
    isLoading: false,
  }),
}))

import AchievementsMobile from '../screens/achievements/AchievementsMobile'
import BadgeEarned from '../screens/achievements/BadgeEarned'

describe('Badge glyph a11y (UXR-4)', () => {
  it('is decorative (aria-hidden) without a label', () => {
    const { container } = render(<BadgeGlyph />)
    expect(container.querySelector('svg').getAttribute('aria-hidden')).toBe('true')
  })
  it('exposes role=img + aria-label when labelled', () => {
    const { container } = render(<BadgeGlyph label="Diamond badge" />)
    const svg = container.querySelector('svg')
    expect(svg.getAttribute('role')).toBe('img')
    expect(svg.getAttribute('aria-label')).toBe('Diamond badge')
  })
})

describe('AchievementsMobile a11y (UXR-1/3/5/6/9)', () => {
  it('renders an h1 heading and a per-medal progressbar for the first thematic group', () => {
    const { container } = renderWithProviders(<AchievementsMobile />)
    expect(container.querySelector('h1')).toBeTruthy()
    // First progressbar is the Trader Medal group (1 of its 4 badges earned).
    const pb = container.querySelector('[role="progressbar"]')
    expect(pb).toBeTruthy()
    expect(pb.getAttribute('aria-valuemax')).toBe('4')
    expect(pb.getAttribute('aria-valuenow')).toBe('1')
  })

  it('badge cards are focusable buttons with earned/locked state', () => {
    const { container } = renderWithProviders(<AchievementsMobile />)
    const cards = container.querySelectorAll('[role="button"][data-state]')
    expect(cards.length).toBe(2)
    const earned = container.querySelector('[data-state="earned"]')
    const locked = container.querySelector('[data-state="locked"]')
    expect(earned.getAttribute('tabindex')).toBe('0')
    expect(locked.getAttribute('tabindex')).toBe('-1')
    expect(locked.getAttribute('aria-label')).toMatch(/locked/i)
  })

  it('keeps Explorer (milestone) medals shelf-only — never a badge-group heading', () => {
    const { container } = renderWithProviders(<AchievementsMobile />)
    // Group headings are h2 Eyebrows. Explorer I resolves to a real badge in the
    // fixture, so if the isExplorer filter regressed it would appear here.
    const headings = [...container.querySelectorAll('h2')].map((h) => h.textContent)
    expect(headings.some((t) => /Explorer/.test(t))).toBe(false)
    // It still surfaces in the shelf.
    expect(screen.getByText('Explorer I')).toBeInTheDocument()
  })

  it('shows "N of threshold" progress copy for a partially-earned medal in the shelf', () => {
    renderWithProviders(<AchievementsMobile />)
    // Trader Medal: 1 of its 4 badges earned.
    expect(screen.getByText('1 of 4')).toBeInTheDocument()
  })

  it('summary count uses Barlow Condensed, not MOMCAKE display font (UXR-3)', () => {
    renderWithProviders(<AchievementsMobile />)
    const count = screen.getByText('1 badge')
    expect(count.className).toContain('font-sans')
    expect(count.className).not.toContain('font-display')
  })
})

describe('BadgeEarned a11y (UXR-3/5)', () => {
  it('has a progressbar and a non-display title', () => {
    render(<MemoryRouter initialEntries={['/badge-earned']}><BadgeEarned /></MemoryRouter>)
    expect(document.querySelector('[role="progressbar"]')).toBeTruthy()
    const title = screen.getByText('First Trade')
    expect(title.className).toContain('font-sans')
    expect(title.className).not.toContain('font-display')
  })
})
