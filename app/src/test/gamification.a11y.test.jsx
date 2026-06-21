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
  it('renders an h1 heading and a labelled progressbar', () => {
    const { container } = renderWithProviders(<AchievementsMobile />)
    expect(container.querySelector('h1')).toBeTruthy()
    const pb = container.querySelector('[role="progressbar"]')
    expect(pb).toBeTruthy()
    expect(pb.getAttribute('aria-valuemax')).toBe('10')
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
