// Suite 1 — No-emoji / design-system rules
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from './renderWithProviders'
import { SageMsg } from '../components/HeroMessage'
import { SageHeader } from '../screens/onboarding/shell'
import { HeroAvatar } from '../components/Primitives'
import { __setTableData } from './supabaseMock'

// Heroes-portrait avatar (B10) and Sage messages don't need network; trade screens do.
vi.mock('../hooks/useStockDetail', () => ({
  useStockDetail: () => ({ data: { price: 213.5, change: 2, pct: 1, pos: true, name: 'Apple Inc.', exchange: 'NASDAQ' }, isLoading: false }),
  useCandles: () => ({ data: [], isLoading: false, isError: false }),
}))
vi.mock('../hooks/usePlaceOrder', () => ({ usePlaceOrder: () => ({ mutate: vi.fn(), isPending: false }) }))
vi.mock('../hooks/usePortfolio', () => ({
  usePortfolio: () => ({
    cashBalance: 10000,
    positions: [{ ticker: 'AAPL', total_qty: '5', average_cost_basis: '100', price: 213.5, change: 2, changePct: 1, pnl: 567.5, pct: 113.5 }],
  }),
}))

import BuyScreen from '../screens/trade/BuyScreen'
import SellScreen from '../screens/trade/SellScreen'

// Forbidden glyphs per the design system: pictographic emoji, plus the specific
// status emojis the fixes removed (✓ U+2713, ⏳ U+23F3, ⌛ U+231B). The Sage brand
// diamond ◇ (U+25C7) is an intentional design mark, not an emoji, so it is allowed.
const FORBIDDEN_RE = /[✓⏳⌛\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/u

// Set a viewport width and notify listeners (breakpoint hooks read window.innerWidth).
function setWidth(px) {
  window.innerWidth = px
  window.dispatchEvent(new Event('resize'))
}

beforeEach(() => {
  __setTableData('watchlist', [])
  setWidth(1024) // default to desktop
})

describe('Suite 1 — no-emoji / design-system rules', () => {
  // T1.1 — selected goal chip renders an <svg>, no emoji char (A1)
  it('T1.1 selected goal chip uses an SVG checkmark, not an emoji glyph', async () => {
    const Onboarding = (await import('../screens/onboarding/Onboarding')).default
    const { container } = renderWithProviders(<Onboarding />)
    // Pick a multi-select goal — the selected chip should render a checkmark <svg>.
    const goal = await screen.findByText('Beat Inflation')
    const { fireEvent } = await import('@testing-library/react')
    fireEvent.click(goal)
    // The selected chip's checkbox box now contains an inline SVG.
    const svgs = container.querySelectorAll('svg')
    expect(svgs.length).toBeGreaterThan(0)
    // The visible goal-picker area must not contain the ✓ emoji glyph.
    const picker = goal.closest('[role="checkbox"]')
    expect(picker).toBeTruthy()
    expect(picker.querySelector('svg')).toBeTruthy()
    expect(picker.textContent).not.toMatch(/✓/)
  })

  // T1.2 — TradeReceipt queued/filled status renders <svg>, no ⏳/✓ text (B1)
  it('T1.2 TradeReceipt renders an SVG status icon (filled + queued), no ⏳/✓ text', async () => {
    const TradeReceipt = (await import('../screens/trade/TradeReceipt')).default
    const { MemoryRouter, Routes, Route } = await import('react-router-dom')
    const { QueryClient, QueryClientProvider } = await import('@tanstack/react-query')
    const { AuthProvider } = await import('../context/AuthContext')
    const { ThemeProvider } = await import('../context/ThemeContext')
    const { LanguageProvider } = await import('../context/LanguageContext')
    const { render } = await import('@testing-library/react')

    function renderReceipt(state) {
      const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
      return render(
        <QueryClientProvider client={qc}>
          <AuthProvider><ThemeProvider><LanguageProvider>
            <MemoryRouter initialEntries={[{ pathname: '/receipt', state }]}>
              <Routes><Route path="/receipt" element={<TradeReceipt />} /></Routes>
            </MemoryRouter>
          </LanguageProvider></ThemeProvider></AuthProvider>
        </QueryClientProvider>,
      )
    }

    const a = renderReceipt({ result: { status: 'FILLED', execution_price: 213.5, market_price: 213.5 }, ticker: 'AAPL', qty: 2, side: 'buy' })
    expect(a.container.querySelector('svg')).toBeTruthy()
    expect(a.container.textContent).not.toMatch(/[✓⏳⌛]/)
    // Q6: MOMCAKE is numbers-only — the status word must not use font-display
    expect(a.container.querySelector('.font-display')).toBeNull()
    a.unmount()

    // Q6: qty=1 receipt reads "1 share of", not "1 shares of"
    const one = renderReceipt({ result: { status: 'FILLED', execution_price: 213.5, market_price: 213.5 }, ticker: 'AAPL', qty: 1, side: 'buy' })
    expect(one.container.textContent).toMatch(/1 share of/)
    expect(one.container.textContent).not.toMatch(/1 shares of/)
    one.unmount()

    const b = renderReceipt({ result: { status: 'QUEUED' }, ticker: 'AAPL', qty: 2, side: 'buy' })
    expect(b.container.querySelector('svg')).toBeTruthy()
    expect(b.container.textContent).not.toMatch(/[✓⏳⌛]/)
  })

  // T1.3 — SageHeader message element has `italic` class (A2)
  it('T1.3 SageHeader message is italic', () => {
    renderWithProviders(
      <SageHeader avatarSize={36} isDesktop={false}>What brings you here today?</SageHeader>,
    )
    const msg = screen.getByText('What brings you here today?')
    expect(msg.className).toContain('italic')
    // The message copy itself carries no emoji (the ◇ Sage mark lives in the avatar, allowed).
    expect(msg.textContent).not.toMatch(FORBIDDEN_RE)
  })

  // T1.4 — SageMsg message element has `italic` class (A3)
  it('T1.4 SageMsg is italic', () => {
    renderWithProviders(<SageMsg text="How many shares feel right to you?" />)
    const msg = screen.getByText('How many shares feel right to you?')
    expect(msg.className).toContain('italic')
  })

  // T1.5 — BuyScreen renders exactly one element with `font-display` class (B2)
  // The single-column mobile layout is the canonical "one screen" the rule targets.
  it('T1.5 BuyScreen (mobile) shows exactly one font-display number', () => {
    setWidth(390)
    const { container } = renderWithProviders(<BuyScreen />, { route: '/buy/AAPL', path: '/buy/:ticker' })
    expect(container.querySelectorAll('.font-display').length).toBe(1)
  })

  // B2 fix: on desktop only PriceCard carries font-display; the chart-column price echo is font-sans.
  it('T1.5b BuyScreen (desktop) shows exactly one font-display number', () => {
    setWidth(1280)
    const { container } = renderWithProviders(<BuyScreen />, { route: '/buy/AAPL', path: '/buy/:ticker' })
    expect(container.querySelectorAll('.font-display').length).toBe(1)
  })

  // T1.6 — SellScreen renders exactly one element with `font-display` class (B3)
  it('T1.6 SellScreen (mobile) shows exactly one font-display number', () => {
    setWidth(390)
    const { container } = renderWithProviders(<SellScreen />, { route: '/sell/AAPL', path: '/sell/:ticker' })
    expect(container.querySelectorAll('.font-display').length).toBe(1)
  })

  // B3 fix: on desktop only the header price carries font-display; the chart-column echo is font-sans.
  it('T1.6b SellScreen (desktop) shows exactly one font-display number', () => {
    setWidth(1280)
    const { container } = renderWithProviders(<SellScreen />, { route: '/sell/AAPL', path: '/sell/:ticker' })
    expect(container.querySelectorAll('.font-display').length).toBe(1)
  })

  // T1.7 — Hero portrait <img> alt equals full hero name (B10)
  // Radix Avatar only mounts the real <img> once an Image() probe reports "loaded".
  // jsdom never loads images, so stub Image to flip to complete immediately, then the
  // AvatarImage renders and we can assert its alt is the full hero name (not initials).
  it('T1.7 HeroAvatar portrait img alt is the full hero name', async () => {
    const RealImage = globalThis.Image
    class LoadedImage {
      constructor() {
        this._listeners = {}
        this.naturalWidth = 100
      }
      addEventListener(type, cb) { this._listeners[type] = cb }
      removeEventListener(type) { delete this._listeners[type] }
      set src(_v) {
        // Once a src is assigned, report a successful load on the next tick.
        setTimeout(() => {
          this.onload && this.onload()
          this._listeners.load && this._listeners.load()
        }, 0)
      }
      get complete() { return true }
    }
    globalThis.Image = LoadedImage
    try {
      const { waitFor } = await import('@testing-library/react')
      const { container } = renderWithProviders(
        <HeroAvatar id="warren" initials="WB" color="#8A60EB" size={64} />,
      )
      const img = await waitFor(() => {
        const el = container.querySelector('img')
        expect(el).toBeTruthy()
        return el
      })
      expect(img.getAttribute('alt')).toBe('Warren Buffett')
      // alt must be the full name, never just the initials.
      expect(img.getAttribute('alt')).not.toBe('WB')
    } finally {
      globalThis.Image = RealImage
    }
  })
})
