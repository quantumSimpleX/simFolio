import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { renderWithProviders } from './renderWithProviders'
import EmptyState from '../components/EmptyState'
import FilledRow from '../components/FilledRow'
import { HeroSidebar } from '../components/HeroSidebar'
import { BadgeGlyph, BadgeGlyphForIndex, MedalGlyph, TrophyGlyph } from '../components/Badges'
import AuthLayout from '../components/AuthLayout'

describe('EmptyState (Q1)', () => {
  it('renders the label', () => {
    render(<EmptyState label="No orders yet" />)
    expect(screen.getByText('No orders yet')).toBeInTheDocument()
  })
  it('renders sub only when provided', () => {
    const { rerender } = render(<EmptyState label="Empty" />)
    expect(screen.queryByText('Place your first trade')).not.toBeInTheDocument()
    rerender(<EmptyState label="Empty" sub="Place your first trade" />)
    expect(screen.getByText('Place your first trade')).toBeInTheDocument()
  })
})

describe('FilledRow (Q2)', () => {
  const order = {
    order_id: 'o-123',
    ticker: 'AAPL',
    side: 'BUY',
    type: 'MARKET',
    status: 'FILLED',
    requested_qty: '10',
    created_at: '2026-06-12T14:30:00Z',
    executions: [
      { execution_price: '213.5000', filled_qty: '10', fees_deducted: '1.25', executed_at: '2026-06-12T14:31:00Z' },
    ],
  }

  it('shows ticker, side, and qty', () => {
    renderWithProviders(<FilledRow order={order} />)
    expect(screen.getByText('AAPL')).toBeInTheDocument()
    expect(screen.getByText(/Bought 10 AAPL/)).toBeInTheDocument()
  })

  it('expands to show execution DetailRows on click', () => {
    renderWithProviders(<FilledRow order={order} />)
    expect(screen.queryByText('Order type')).not.toBeInTheDocument()
    fireEvent.click(screen.getByText(/Bought 10 AAPL/))
    expect(screen.getByText('Order type')).toBeInTheDocument()
    expect(screen.getByText('Market order')).toBeInTheDocument()
    expect(screen.getByText('Filled quantity')).toBeInTheDocument()
    expect(screen.getByText(/ORDER o-123/)).toBeInTheDocument()
  })

  it('is not expandable when there is no execution', () => {
    const noExec = { ...order, executions: [] }
    renderWithProviders(<FilledRow order={noExec} dimmed />)
    fireEvent.click(screen.getByText(/Bought 10 AAPL/))
    expect(screen.queryByText('Order type')).not.toBeInTheDocument()
  })
})

describe('HeroSidebar (Q3)', () => {
  it('renders without crashing and falls back to Sage with empty providers', () => {
    renderWithProviders(<HeroSidebar />)
    // No heroes seeded -> mentor name/title fall back to 'Sage'
    expect(screen.getAllByText('Sage').length).toBeGreaterThan(0)
    // Single-active-mentor copy: no stale "council slots" language remains
    expect(screen.getByText(/Your mentor · watching your portfolio/)).toBeInTheDocument()
    expect(screen.queryByText(/council slots/)).not.toBeInTheDocument()
  })
})

describe('Badges (Q4)', () => {
  it('renders earned at full opacity and locked dimmed', () => {
    const { container, rerender } = render(<BadgeGlyph type="diamond" earned />)
    expect(container.querySelector('svg').style.opacity).toBe('1')
    rerender(<BadgeGlyph type="diamond" />)
    expect(parseFloat(container.querySelector('svg').style.opacity)).toBeLessThan(1)
  })

  it('renders each glyph type / medal / trophy without crashing', () => {
    for (const type of ['diamond', 'hex', 'triangle', 'star', 'circle']) {
      const { container } = render(<BadgeGlyph type={type} earned />)
      expect(container.querySelector('svg')).toBeInTheDocument()
    }
    const m = render(<MedalGlyph earned />)
    expect(m.container.querySelector('svg')).toBeInTheDocument()
    const t = render(<TrophyGlyph />)
    expect(t.container.querySelector('svg')).toBeInTheDocument()
    const idx = render(<BadgeGlyphForIndex index={4} earned />)
    expect(idx.container.querySelector('svg')).toBeInTheDocument()
  })
})

describe('AuthLayout (Q5)', () => {
  it('renders children inside the auth chrome', () => {
    renderWithProviders(<AuthLayout><div data-testid="child">Sign in form</div></AuthLayout>)
    expect(screen.getByTestId('child')).toBeInTheDocument()
    expect(screen.getByText('Sign in form')).toBeInTheDocument()
  })
})
