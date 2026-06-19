import { describe, it, expect, beforeEach, vi } from 'vitest'
import { screen, fireEvent, waitFor, render, renderHook, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from '../context/AuthContext'
import { renderWithProviders } from './renderWithProviders'
import { __reset, __setTableData, supabase } from './supabaseMock'

import { HeroSelect } from '../components/HeroSelect'
import { DotMenu } from '../components/DotMenu'
import { useChangeHero } from '../hooks/useChangeHero'
import { useOnboardingAnswers } from '../hooks/useOnboardingAnswers'
import FindMentor from '../screens/heroes/FindMentor'

// Force the mobile onboarding shell so BrandPanel (which also lists hero names on desktop) doesn't
// collide with grid card text in queries.
beforeEach(() => { window.innerWidth = 500 })

function hookHarness() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }) => (
    <QueryClientProvider client={qc}>
      <AuthProvider><MemoryRouter>{children}</MemoryRouter></AuthProvider>
    </QueryClientProvider>
  )
  return { qc, wrapper }
}

// ── HeroSelect (reusable grid) ────────────────────────────────────────────────
describe('HeroSelect', () => {
  it('shows the loading message and 8 skeleton tiles while loading', () => {
    renderWithProviders(
      <HeroSelect heroIds={[]} loading onChoose={() => {}} loadingMessage="Loading mentors…" message="ready"/>,
    )
    expect(screen.getByText('Loading mentors…')).toBeInTheDocument()
    expect(document.querySelectorAll('.animate-pulse')).toHaveLength(8)
  })

  it('renders a card per hero and the loaded message', () => {
    renderWithProviders(
      <HeroSelect heroIds={['cathie', 'ray']} loading={false} onChoose={() => {}} message="pick one"/>,
    )
    expect(screen.getByText('pick one')).toBeInTheDocument()
    expect(screen.getByText('Cathie Wood')).toBeInTheDocument()
    expect(screen.getByText('Ray Dalio')).toBeInTheDocument()
  })

  it('enables the CTA on pick and calls onChoose with the prefix/suffix label', () => {
    const onChoose = vi.fn()
    renderWithProviders(
      <HeroSelect heroIds={['cathie']} loading={false} onChoose={onChoose} message="m" ctaPrefix="Make" ctaSuffix=" my mentor"/>,
    )
    expect(screen.getByText('Pick an expert to continue')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Cathie Wood'))
    const cta = screen.getByText(/Make Cathie Wood my mentor/)
    fireEvent.click(cta)
    expect(onChoose).toHaveBeenCalledWith('cathie')
  })

  it('renders a Back affordance that fires onBack', () => {
    const onBack = vi.fn()
    renderWithProviders(
      <HeroSelect heroIds={['ray']} loading={false} onChoose={() => {}} message="m" onBack={onBack}/>,
    )
    fireEvent.click(screen.getByText('← Back'))
    expect(onBack).toHaveBeenCalled()
  })
})

// ── DotMenu ───────────────────────────────────────────────────────────────────
describe('DotMenu', () => {
  it('hides items until opened', () => {
    render(<DotMenu items={[{ label: 'Find a new mentor', onSelect: () => {} }]}/>)
    expect(screen.queryByText('Find a new mentor')).not.toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('More options'))
    expect(screen.getByText('Find a new mentor')).toBeInTheDocument()
  })

  it('selecting an item fires onSelect and closes the menu', () => {
    const onSelect = vi.fn()
    render(<DotMenu items={[{ label: 'Find a new mentor', onSelect }]}/>)
    fireEvent.click(screen.getByLabelText('More options'))
    fireEvent.click(screen.getByText('Find a new mentor'))
    expect(onSelect).toHaveBeenCalled()
    expect(screen.queryByText('Find a new mentor')).not.toBeInTheDocument()
  })

  it('outside click closes the menu without firing an item', () => {
    const onSelect = vi.fn()
    render(<div><DotMenu items={[{ label: 'Opt', onSelect }]}/><button>outside</button></div>)
    fireEvent.click(screen.getByLabelText('More options'))
    fireEvent.mouseDown(screen.getByText('outside'))
    expect(screen.queryByText('Opt')).not.toBeInTheDocument()
    expect(onSelect).not.toHaveBeenCalled()
  })
})

// ── useChangeHero ───────────────────────────────────────────────────────────────
describe('useChangeHero', () => {
  beforeEach(() => { __reset() })

  it('deletes then inserts the new selection and invalidates the query', async () => {
    const { qc, wrapper } = hookHarness()
    const invalidate = vi.spyOn(qc, 'invalidateQueries')
    const { result } = renderHook(() => ({ auth: useAuth(), m: useChangeHero() }), { wrapper })
    await waitFor(() => expect(result.current.auth.user?.id).toBe('test-user'))

    act(() => { result.current.m.mutate('cathie') })
    await waitFor(() => expect(result.current.m.isSuccess).toBe(true))

    expect(supabase.from).toHaveBeenCalledWith('hero_selections')
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['hero-selections', 'test-user'] })
  })

  it('surfaces an insert error', async () => {
    const { wrapper } = hookHarness()
    const { result } = renderHook(() => ({ auth: useAuth(), m: useChangeHero() }), { wrapper })
    await waitFor(() => expect(result.current.auth.user?.id).toBe('test-user'))

    // Queue the mutation's two from() calls: delete ok, insert errors.
    supabase.from
      .mockImplementationOnce(() => ({ delete: () => ({ eq: () => Promise.resolve({ error: null }) }) }))
      .mockImplementationOnce(() => ({ insert: () => Promise.resolve({ error: new Error('boom') }) }))

    act(() => { result.current.m.mutate('cathie') })
    await waitFor(() => expect(result.current.m.isError).toBe(true))
  })
})

// ── useOnboardingAnswers ─────────────────────────────────────────────────────────
describe('useOnboardingAnswers', () => {
  beforeEach(() => { __reset(); localStorage.clear() })

  it('returns the DB answers when present', async () => {
    __setTableData('users', [{ onboarding_answers: { goal: ['x'], horizon: '10+ years' } }])
    const { wrapper } = hookHarness()
    const { result } = renderHook(() => useOnboardingAnswers(), { wrapper })
    await waitFor(() => expect(result.current.answers.horizon).toBe('10+ years'))
  })

  it('falls back to localStorage when the DB has none', async () => {
    localStorage.setItem('simfolio_onboarding_answers', JSON.stringify({ goal: ['ls'] }))
    const { wrapper } = hookHarness()
    const { result } = renderHook(() => useOnboardingAnswers(), { wrapper })
    await waitFor(() => expect(result.current.answers.goal).toEqual(['ls']))
  })

  it('returns an empty object when neither source has answers', async () => {
    const { wrapper } = hookHarness()
    const { result } = renderHook(() => useOnboardingAnswers(), { wrapper })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.answers).toEqual({})
  })
})

// ── FindMentor screen (smoke) ──────────────────────────────────────────────────
describe('FindMentor screen', () => {
  beforeEach(() => { __reset(); supabase.functions.invoke.mockReset() })

  it('renders the mentor copy, then swaps the hero when one is picked', async () => {
    supabase.functions.invoke.mockResolvedValue({
      data: { ranked: ['cathie', 'ray', 'soros', 'burry', 'simons', 'griffin', 'tepper', 'icahn'] },
      error: null,
    })

    renderWithProviders(<FindMentor/>, { route: '/find-mentor' })

    expect(await screen.findByText(/Based on your investment goals/i)).toBeInTheDocument()
    fireEvent.click(await screen.findByText('Cathie Wood'))
    fireEvent.click(screen.getByText(/Make Cathie Wood my mentor/))
    await waitFor(() => expect(supabase.from).toHaveBeenCalledWith('hero_selections'))
  })
})
