// Suite 3 — Accessibility
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from './renderWithProviders'
import Onboarding from '../screens/onboarding/Onboarding'
import { OnboardingProgress, BackButton } from '../screens/onboarding/shell'
import { CTA, TermUnderline } from '../components/Primitives'
import { TopNav } from '../components/Nav'
import { __setTableData } from './supabaseMock'

beforeEach(() => {
  __setTableData('watchlist', [])
  window.innerWidth = 1024
})

const clickContinue = () => fireEvent.click(screen.getByText(/^Continue\s*→$/))

describe('Suite 3 — accessibility', () => {
  // T3.1 — Goal chips role="checkbox", toggle aria-checked (A5)
  it('T3.1 multi-select goal chips are role="checkbox" and toggle aria-checked', async () => {
    renderWithProviders(<Onboarding />)
    const chip = await screen.findByRole('checkbox', { name: 'Beat Inflation' })
    expect(chip).toHaveAttribute('aria-checked', 'false')
    fireEvent.click(chip)
    expect(chip).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(chip)
    expect(chip).toHaveAttribute('aria-checked', 'false')
  })

  // T3.2 — Goal chips are real <button> elements (Tab-reachable / focusable) (A5)
  it('T3.2 goal chips are focusable <button> elements', async () => {
    renderWithProviders(<Onboarding />)
    const chip = await screen.findByRole('checkbox', { name: 'Beat Inflation' })
    expect(chip.tagName).toBe('BUTTON')
    expect(chip).toHaveAttribute('type', 'button')
    chip.focus()
    expect(document.activeElement).toBe(chip)
  })

  // T3.3 — Single-select steps render <input type="radio"> inside a <fieldset> (A6)
  it('T3.3 single-select step uses radios inside a fieldset/legend', async () => {
    const { container } = renderWithProviders(<Onboarding />)
    // Answer the first (multi) goal step.
    fireEvent.click(await screen.findByText('Beat Inflation'))
    clickContinue()

    // Remaining questions are shuffled (number inputs + single-selects). Advance until
    // a single-select step (fieldset of radios) appears, then assert its semantics.
    let fieldset = null
    for (let i = 0; i < 6; i++) {
      await waitFor(() => {}) // flush
      fieldset = container.querySelector('fieldset')
      if (fieldset && fieldset.querySelector('input[type="radio"]')) break
      const numInput = document.querySelector('input[inputmode="numeric"]')
      if (numInput) {
        fireEvent.change(numInput, { target: { value: '10000' } })
        clickContinue()
        continue
      }
      // Some other choice step rendered without radios — pick first card to advance.
      const card = document.querySelector('[data-testid="goal-card"]')
      if (card) { fireEvent.click(card); await new Promise(r => setTimeout(r, 220)) }
    }
    expect(fieldset).toBeTruthy()
    const radios = fieldset.querySelectorAll('input[type="radio"]')
    expect(radios.length).toBeGreaterThan(0)
    expect(fieldset.querySelector('legend')).toBeTruthy()
  })

  // T3.4 — Back control is a <button> with aria-label="Back" (A7)
  it('T3.4 BackButton is a <button aria-label="Back">', () => {
    const onBack = vi.fn()
    render(<BackButton onBack={onBack} />)
    const btn = screen.getByRole('button', { name: 'Back' })
    expect(btn.tagName).toBe('BUTTON')
    fireEvent.click(btn)
    expect(onBack).toHaveBeenCalled()
  })

  // T3.5 — CTA has focus-visible ring classes (B6)
  it('T3.5 CTA carries focus-visible ring classes', () => {
    const { container } = render(<CTA label="Buy" />)
    const btn = container.querySelector('button')
    expect(btn.className).toMatch(/focus-visible:ring-2/)
    expect(btn.className).toMatch(/focus-visible:ring-ame-400/)
  })

  // T3.6 — Desktop tooltip trigger has aria-describedby matching tooltip id (B9)
  it('T3.6 desktop tooltip trigger sets aria-describedby to the tooltip id on open', () => {
    window.innerWidth = 1024 // desktop → CSS tooltip, not mobile sheet
    const { container } = renderWithProviders(<span><TermUnderline>slippage</TermUnderline></span>)
    const trigger = screen.getByText('slippage')
    // Closed: no describedby.
    expect(trigger).not.toHaveAttribute('aria-describedby')
    fireEvent.mouseEnter(trigger)
    const tip = container.querySelector('[role="tooltip"]')
    expect(tip).toBeTruthy()
    expect(trigger.getAttribute('aria-describedby')).toBe(tip.getAttribute('id'))
    expect(trigger.getAttribute('aria-describedby')).toBeTruthy()
  })

  // T3.7 — Onboarding progressbar role + aria-valuenow/min/max (A11)
  it('T3.7 OnboardingProgress is a progressbar with correct aria values', () => {
    render(<OnboardingProgress step={3} total={7} />)
    const bar = screen.getByRole('progressbar')
    expect(bar).toHaveAttribute('aria-valuenow', '3')
    expect(bar).toHaveAttribute('aria-valuemin', '1')
    expect(bar).toHaveAttribute('aria-valuemax', '7')
  })

  // T3.8 — Profile nav control is a <button> with accessible name "Profile" (audit P2)
  // Profile nav control is now a real <button aria-label="Profile"> (fixed).
  it('T3.8 Profile nav control is a <button> named "Profile"', async () => {
    renderWithProviders(<TopNav active="portfolio" />)
    const btn = await screen.findByRole('button', { name: 'Profile' })
    expect(btn.tagName).toBe('BUTTON')
  })
})
