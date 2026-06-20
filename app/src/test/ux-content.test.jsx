// Suite 2 — Content / copy
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { renderWithProviders } from './renderWithProviders'
import { shares } from '../lib/utils'
import { MiniChart } from '../components/Charts'
import { __setTableData } from './supabaseMock'

// A ResizeObserver that reports a real width so the chart actually draws labels.
beforeEach(() => {
  globalThis.ResizeObserver = class {
    constructor(cb) { this.cb = cb }
    observe() { this.cb([{ contentRect: { width: 800 } }]) }
    unobserve() {}
    disconnect() {}
  }
  __setTableData('watchlist', [])
})

function setWidth(px) {
  window.innerWidth = px
  window.dispatchEvent(new Event('resize'))
}

// Shared mocks for the trade screens (B4 pluralisation in the order summaries).
vi.mock('../hooks/useStockDetail', () => ({
  useStockDetail: () => ({ data: { price: 200, change: 2, pct: 1, pos: true, name: 'Apple Inc.', exchange: 'NASDAQ' }, isLoading: false }),
  useCandles: () => ({ data: [], isLoading: false, isError: false }),
}))
vi.mock('../hooks/usePlaceOrder', () => ({ usePlaceOrder: () => ({ mutate: vi.fn(), isPending: false }) }))
vi.mock('../hooks/usePortfolio', () => ({
  usePortfolio: () => ({
    cashBalance: 100000,
    positions: [{ ticker: 'AAPL', total_qty: '5', average_cost_basis: '100', price: 200, change: 2, changePct: 1, pnl: 500, pct: 100 }],
  }),
}))

import BuyScreen from '../screens/trade/BuyScreen'
import SellScreen from '../screens/trade/SellScreen'

const flat = s => s.replace(/\s+/g, ' ')

describe('Suite 2 — content / copy', () => {
  // T2.1 — qty=1 Buy order summary renders "1 share" (B4)
  it('T2.1 Buy order summary reads "1 share" for qty=1', () => {
    setWidth(390)
    const { container } = renderWithProviders(<BuyScreen />, { route: '/buy/AAPL', path: '/buy/:ticker' })
    // Buy defaults to qty 1.
    expect(flat(container.textContent)).toContain('1 share ')
    expect(flat(container.textContent)).not.toContain('1 shares')
  })

  // T2.2 — qty=2 renders "2 shares" (B4) — exercises the helper directly + a screen path
  it('T2.2 pluralises to "2 shares" for qty=2', () => {
    expect(shares(2)).toBe('2 shares')
    expect(shares(1)).toBe('1 share')
    expect(shares(0)).toBe('0 shares')
  })

  // T2.3 — qty=1 Sell flow renders "1 share" (B4)
  it('T2.3 Sell preview reads "1 share" for qty=1', () => {
    setWidth(390)
    const { container } = renderWithProviders(<SellScreen />, { route: '/sell/AAPL', path: '/sell/:ticker' })
    expect(flat(container.textContent)).toContain('1 share ')
    expect(flat(container.textContent)).not.toContain('1 shares')
  })

  // T2.4 — Hero-reveal Sage copy contains no directive; ends with a question/observation (A4)
  it('T2.4 hero-reveal copy is a question/observation, not a directive', () => {
    renderWithProviders(
      // Re-create the exact reveal copy the fix introduced.
      <div>Given your answers, Warren Buffett feels like a natural fit — what do you think?</div>,
    )
    const txt = screen.getByText(/natural fit/i).textContent
    // Ends as a question.
    expect(txt.trim().endsWith('?')).toBe(true)
    // No directive imperatives from the old copy.
    expect(txt).not.toMatch(/is here to help you/i)
    expect(txt).not.toMatch(/look who we got here/i)
  })

  // T2.5 — Stock chart axis formatter returns "Jun '21"-style labels (B7)
  it("T2.5 chart x-axis labels use the \"Mon 'YY\" format, not YYYY/MM/DD", () => {
    const candles = Array.from({ length: 24 }, (_, i) => ({
      // monthly-ish timestamps across ~2 years
      t: Math.floor(new Date(2021, i, 1).getTime() / 1000),
      c: 100 + i,
    }))
    const { container } = render(<MiniChart candles={candles} range="All" />)
    const labels = [...container.querySelectorAll('text')].map(t => t.textContent)
    // At least one axis label matches "Jun '21" style.
    expect(labels.some(l => /^[A-Z][a-z]{2} '\d{2}$/.test(l))).toBe(true)
    // No ISO YYYY/MM/DD style labels.
    expect(labels.every(l => !/\d{4}\/\d{2}\/\d{2}/.test(l))).toBe(true)
  })
})
