import { describe, it, expect, beforeEach, vi } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderWithProviders } from './renderWithProviders'

// Shared, resettable mock state. `vi.hoisted` runs before the `vi.mock` factories below,
// so each factory can close over `h` and return per-test values.
const h = vi.hoisted(() => ({
  navigate: vi.fn(),
  changeHero: vi.fn(),
  ranking: { heroIds: ['cathie'], isLoading: false, isError: false },
  selections: { heroes: [] },
  answers: { goal: ['Harnessing exponential compound wealth growth'] },
  isDesktop: false,
}))

vi.mock('react-router-dom', async (orig) => ({ ...(await orig()), useNavigate: () => h.navigate }))
vi.mock('../hooks/useHeroRanking', () => ({ useHeroRanking: () => h.ranking }))
vi.mock('../hooks/useHeroSelections', () => ({ useHeroSelections: () => h.selections }))
vi.mock('../hooks/useChangeHero', () => ({ useChangeHero: () => ({ mutate: h.changeHero }) }))
vi.mock('../hooks/useOnboardingAnswers', () => ({ useOnboardingAnswers: () => ({ answers: h.answers }) }))
vi.mock('../hooks/useIsDesktop', () => ({ useIsDesktop: () => h.isDesktop }))

import HeroHandoff from '../screens/trade/HeroHandoff'

beforeEach(() => {
  h.navigate.mockReset()
  h.changeHero.mockReset()
  h.ranking = { heroIds: ['cathie'], isLoading: false, isError: false }
  h.selections = { heroes: [] }
  h.answers = { goal: ['Harnessing exponential compound wealth growth'] }
  h.isDesktop = false
})

describe('HeroHandoff', () => {
  it('renders the top-ranked hero, not a hardcoded Warren card', () => {
    h.ranking = { heroIds: ['cathie'], isLoading: false, isError: false }
    renderWithProviders(<HeroHandoff/>)

    expect(screen.getByText('Cathie Wood')).toBeInTheDocument()
    expect(screen.queryByText('Warren Buffett')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Talk to Cathie Wood/ })).toBeInTheDocument()
  })

  it('falls back to Warren while the ranking is loading', () => {
    // heroIds already has a different hero, but loading must force the Warren fallback.
    h.ranking = { heroIds: ['cathie'], isLoading: true, isError: false }
    renderWithProviders(<HeroHandoff/>)

    expect(screen.getByText('Warren Buffett')).toBeInTheDocument()
    expect(screen.queryByText('Cathie Wood')).not.toBeInTheDocument()
  })

  it('falls back to Warren when the ranking errors', () => {
    h.ranking = { heroIds: ['cathie'], isLoading: false, isError: true }
    renderWithProviders(<HeroHandoff/>)

    expect(screen.getByText('Warren Buffett')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Talk to Warren Buffett/ })).toBeInTheDocument()
  })

  it('primary CTA persists the hero and routes to /portfolio on desktop', () => {
    h.isDesktop = true
    renderWithProviders(<HeroHandoff/>)

    fireEvent.click(screen.getByRole('button', { name: /Talk to Cathie Wood/ }))
    expect(h.changeHero).toHaveBeenCalledWith('cathie')
    expect(h.navigate).toHaveBeenCalledWith('/portfolio')
  })

  it('primary CTA routes to /ask on mobile', () => {
    h.isDesktop = false
    renderWithProviders(<HeroHandoff/>)

    fireEvent.click(screen.getByRole('button', { name: /Talk to Cathie Wood/ }))
    expect(h.changeHero).toHaveBeenCalledWith('cathie')
    expect(h.navigate).toHaveBeenCalledWith('/ask')
  })

  it('ghost CTA persists the hero and routes to /markets', () => {
    renderWithProviders(<HeroHandoff/>)

    fireEvent.click(screen.getByRole('button', { name: /Continue buying first/ }))
    expect(h.changeHero).toHaveBeenCalledWith('cathie')
    expect(h.navigate).toHaveBeenCalledWith('/markets')
  })

  it('does not clobber an existing hero selection but still routes', () => {
    h.selections = { heroes: [{ id: 'ray', name: 'Ray Dalio' }] }
    renderWithProviders(<HeroHandoff/>)

    fireEvent.click(screen.getByRole('button', { name: /Talk to Cathie Wood/ }))
    expect(h.changeHero).not.toHaveBeenCalled()
    expect(h.navigate).toHaveBeenCalledWith('/ask')
  })
})
