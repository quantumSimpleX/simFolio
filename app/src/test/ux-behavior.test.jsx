// Suite 4 — Behavior
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { renderWithProviders } from './renderWithProviders'
import { __setTableData } from './supabaseMock'

// ── Hook mocks for Markets ─────────────────────────────────────────────────
const addToWatchlist = vi.fn()
const removeFromWatchlist = vi.fn()
let mockWatchlist = []
let mockSearchResults = []
let mockQuotes = []

vi.mock('../hooks/useSymbolSearch', () => ({
  useSymbolSearch: () => mockSearchResults,
}))
vi.mock('../hooks/useWatchlist', () => ({
  useWatchlist: () => ({
    watchlist: mockWatchlist,
    addToWatchlist,
    removeFromWatchlist,
    isWatching: (s) => mockWatchlist.includes(s),
  }),
}))
vi.mock('../hooks/useQuotes', async (orig) => {
  const actual = await orig()
  return { ...actual, useQuotes: () => ({ data: mockQuotes }), isMarketOpen: () => true }
})
vi.mock('../hooks/usePortfolio', () => ({
  usePortfolio: () => ({ positions: [], cashBalance: 1000, totalValue: 1000, totalPnl: 0, totalPct: 0, loading: false }),
}))
vi.mock('../hooks/usePortfolioCandles', () => ({
  usePortfolioCandles: () => ({ candles: [], isLoading: false, isError: false }),
}))
vi.mock('../hooks/useStockDetail', () => ({
  useStockDetail: () => ({ data: null, isLoading: false }),
  useCandles: () => ({ data: null, isLoading: false, isError: false }),
}))

import Markets from '../screens/markets/Markets'
import PortfolioDesktop from '../screens/portfolio/PortfolioDesktop'
import { TermUnderline } from '../components/Primitives'
import { WatchlistButton } from '../components/WatchlistButton'

function setWidth(px) {
  window.innerWidth = px
  window.dispatchEvent(new Event('resize'))
}

beforeEach(() => {
  mockWatchlist = []
  mockSearchResults = []
  mockQuotes = []
  addToWatchlist.mockClear()
  removeFromWatchlist.mockClear()
  __setTableData('watchlist', [])
  setWidth(1024)
  localStorage.clear()
})

describe('Suite 4 — behavior', () => {
  // T4.1 — Markets search dedupes duplicate symbols (A8)
  it('T4.1 search results are deduped by symbol', () => {
    mockSearchResults = [
      { symbol: 'AAPL', instrument_name: 'Apple Inc.', exchange: 'NASDAQ' },
      { symbol: 'AAPL', instrument_name: 'Apple Inc.', exchange: 'NASDAQ' }, // dupe
      { symbol: 'AAPD', instrument_name: 'Direxion AAPL Bear', exchange: 'NASDAQ' },
    ]
    renderWithProviders(<Markets />)
    fireEvent.change(screen.getByPlaceholderText(/Search ticker/i), { target: { value: 'AAPL' } })
    // Apple appears exactly once despite the duplicate input row.
    expect(screen.getAllByText('Apple Inc.')).toHaveLength(1)
    expect(screen.getByText('Direxion AAPL Bear')).toBeInTheDocument()
  })

  // T4.2 — Watchlist empty-state button focuses search input (A9)
  it('T4.2 empty-state watchlist control focuses the search input', () => {
    mockWatchlist = []
    renderWithProviders(<Markets />)
    const emptyBtn = screen.getByText(/Search above to add stocks/i)
    expect(emptyBtn.tagName).toBe('BUTTON')
    fireEvent.click(emptyBtn)
    const input = screen.getByPlaceholderText(/Search ticker/i)
    expect(document.activeElement).toBe(input)
  })

  // T4.3 — Desktop tooltip renders EN + 繁中 tabs; switching changes content (B5)
  it('T4.3 desktop tooltip shows EN + 繁中 tabs that switch content', () => {
    localStorage.setItem('simfolio_language', 'zh-TW')
    setWidth(1024)
    renderWithProviders(<span><TermUnderline>slippage</TermUnderline></span>)
    fireEvent.mouseEnter(screen.getByText('slippage'))
    // Both language tabs are present.
    const enTab = screen.getByLabelText('English')
    const zhTab = screen.getByLabelText('Traditional Chinese')
    expect(enTab).toBeInTheDocument()
    expect(zhTab).toBeInTheDocument()
    // Preferred language (zh-TW) is the default tab → Chinese definition shown first.
    expect(document.body.textContent).toMatch(/滑價/)
    // Switching to the English tab changes the visible content to the EN definition.
    // Radix Tabs activate on the pointerdown→mousedown→click sequence with the primary button.
    const enTrigger = enTab.closest('[role="tab"]') ?? enTab
    fireEvent.pointerDown(enTrigger, { button: 0, ctrlKey: false })
    fireEvent.mouseDown(enTrigger, { button: 0 })
    fireEvent.click(enTrigger, { button: 0 })
    expect(document.body.textContent).toMatch(/difference between/i)
  })

  // T4.4 — +Watchlist click changes label / shows confirmation (B12)
  it('T4.4 WatchlistButton flips label between "+ Watchlist" and "Watching"', () => {
    const onClick = vi.fn()
    const { rerender } = render(<WatchlistButton watching={false} onClick={onClick} />)
    expect(screen.getByText('+ Watchlist')).toBeInTheDocument()
    fireEvent.click(screen.getByText('+ Watchlist'))
    expect(onClick).toHaveBeenCalled()
    rerender(<WatchlistButton watching onClick={onClick} />)
    expect(screen.getByText('Watching')).toBeInTheDocument()
    expect(screen.queryByText('+ Watchlist')).not.toBeInTheDocument()
  })

  // T4.5 — Stale quote (>1h cache) shows gold stale chip on Markets (A12)
  it('T4.5 stale index quote (>1h old) renders a "stale" chip', () => {
    const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000
    mockQuotes = [
      { ticker: 'SPY', price: 500, pct: 0.5, pos: true, fetchedAt: twoHoursAgo },
      { ticker: 'QQQ', price: 400, pct: 0.2, pos: true, fetchedAt: Date.now() }, // fresh
    ]
    renderWithProviders(<Markets />)
    const chips = screen.getAllByText('stale')
    expect(chips.length).toBe(1) // only the stale SPY quote
    expect(chips[0].className).toMatch(/text-gold/)
  })

  // T4.6 — Portfolio empty chart shows "first trade" sub-copy (B11)
  it('T4.6 empty portfolio chart shows the first-trade sub-copy', () => {
    renderWithProviders(<PortfolioDesktop />)
    expect(screen.getByText(/Make your first trade to see performance over time/i)).toBeInTheDocument()
  })
})
