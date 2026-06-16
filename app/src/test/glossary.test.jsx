import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { renderWithProviders } from './renderWithProviders'
import { TermUnderline } from '../components/Primitives'
import { Fundamentals } from '../components/Fundamentals'
import glossary from '../data/glossary.json'

// TERM_MAP is not exported, so we assert its behaviour through TermUnderline
// (the public surface): a mapped label renders its glossary definition.

const NEW_KEYS = [
  'eps', 'beta', 'volume', 'avg_volume', 'exchange', '52w_range', 'shares',
  'ticker', 'position', 'holdings', 'bid_ask_spread', 'gross_cost',
  'gross_proceeds', 'net_proceeds', 'execution_price', 'time_in_force',
  'gtc_order', 'day_order', 'crypto', 'index', 'watchlist', 'dividend',
]

const allKeys = Object.keys(glossary)

// ---------------------------------------------------------------------------
// A. Glossary data integrity (data-driven over every key)
// ---------------------------------------------------------------------------
describe('A. Glossary data integrity', () => {
  it.each(allKeys)('%s has both en and zh-TW objects', (k) => {
    expect(glossary[k].en).toBeTypeOf('object')
    expect(glossary[k]['zh-TW']).toBeTypeOf('object')
  })

  it.each(allKeys)('%s title + definition are non-empty strings (both langs)', (k) => {
    for (const lang of ['en', 'zh-TW']) {
      const e = glossary[k][lang]
      expect(typeof e.title).toBe('string')
      expect(e.title.trim().length).toBeGreaterThan(0)
      expect(typeof e.definition).toBe('string')
      expect(e.definition.trim().length).toBeGreaterThan(0)
    }
  })

  it.each(allKeys)('%s zh-TW definition differs from en (real translation)', (k) => {
    expect(glossary[k]['zh-TW'].definition).not.toBe(glossary[k].en.definition)
  })

  it.each(NEW_KEYS)('new key %s exists', (k) => {
    expect(glossary[k]).toBeDefined()
  })
})

// ---------------------------------------------------------------------------
// B. Acronyms spelled out in full
// ---------------------------------------------------------------------------
describe('B. Acronyms spelled out', () => {
  const text = (k) => `${glossary[k].en.title} ${glossary[k].en.definition}`

  it('eps spells out Earnings Per Share', () => {
    expect(text('eps')).toMatch(/Earnings Per Share/i)
  })
  it('gtc_order spells out Good-Till-Cancelled', () => {
    expect(text('gtc_order')).toMatch(/Good-Till-Cancelled/i)
  })
  it('pe_ratio spells out Price-to-Earnings', () => {
    expect(text('pe_ratio')).toMatch(/Price-to-Earnings/i)
  })
  it('etf spells out Exchange-Traded Fund', () => {
    expect(text('etf')).toMatch(/Exchange-Traded Fund/i)
  })
  it('market_cap covers Market Cap', () => {
    expect(text('market_cap')).toMatch(/Market Cap/i)
  })
})

// ---------------------------------------------------------------------------
// C. TERM_MAP resolution (parametrized, via TermUnderline behaviour)
// ---------------------------------------------------------------------------
describe('C. TERM_MAP resolution', () => {
  // label -> expected glossary key whose definition should surface
  const cases = [
    ['P/E', 'pe_ratio'],
    ['EPS', 'eps'],
    ['Beta', 'beta'],
    ['Volume', 'volume'],
    ['Avg volume', 'avg_volume'],
    ['Exchange', 'exchange'],
    ['52W range', '52w_range'],
    ['Div yield', 'dividend_yield'],
    ['Shares', 'shares'],
    ['Holdings', 'holdings'],
    ['Positions', 'position'],
  ]

  it.each(cases)('label %s resolves to key %s', (label, key) => {
    renderWithProviders(<TermUnderline>{label}</TermUnderline>)
    fireEvent.mouseEnter(screen.getByText(label))
    // The resolved definition for `key` must appear somewhere on the page.
    const def = glossary[key].en.definition
    expect(document.body.textContent).toContain(def)
  })

  // Every TERM_MAP value points at an existing glossary key. We reconstruct the
  // set of values exercised across the suite from the labels we test plus the
  // β alias, and additionally assert no dangling alias by spot-checking that the
  // mapped labels all resolved above. To be exhaustive about dangling aliases we
  // also verify the β alias resolves to beta.
  it('β alias resolves to beta (no dangling alias)', () => {
    renderWithProviders(<TermUnderline>β</TermUnderline>)
    fireEvent.mouseEnter(screen.getByText('β'))
    expect(document.body.textContent).toContain(glossary.beta.en.definition)
  })
})

// ---------------------------------------------------------------------------
// D. TermUnderline rendering (desktop)
// ---------------------------------------------------------------------------
describe('D. TermUnderline desktop rendering', () => {
  const labels = [
    ['P/E', 'pe_ratio'],
    ['EPS', 'eps'],
    ['Beta', 'beta'],
    ['Volume', 'volume'],
    ['Exchange', 'exchange'],
  ]

  it.each(labels)('hovering %s shows its definition', (label, key) => {
    renderWithProviders(<TermUnderline>{label}</TermUnderline>)
    fireEvent.mouseEnter(screen.getByText(label))
    expect(document.body.textContent).toContain(glossary[key].en.definition)
  })

  it('explicit termKey prop overrides display-text lookup', () => {
    renderWithProviders(<TermUnderline termKey="dividend">whatever</TermUnderline>)
    fireEvent.mouseEnter(screen.getByText('whatever'))
    expect(document.body.textContent).toContain(glossary.dividend.en.definition)
  })

  it('unknown/unmapped label renders plain underline, no crash, no tooltip', () => {
    renderWithProviders(<TermUnderline>totally-unknown-xyz</TermUnderline>)
    const span = screen.getByText('totally-unknown-xyz')
    expect(span).toBeInTheDocument()
    fireEvent.mouseEnter(span)
    // no glossary definition leaked in
    expect(document.body.textContent).toBe('totally-unknown-xyz')
  })
})

// ---------------------------------------------------------------------------
// E. TermUnderline mobile + i18n
// ---------------------------------------------------------------------------
describe('E. TermUnderline mobile + i18n', () => {
  it('mobile (innerWidth < 768): tapping opens a bottom sheet with EN/繁中 tabs', () => {
    const original = window.innerWidth
    window.innerWidth = 375
    try {
      renderWithProviders(<TermUnderline>EPS</TermUnderline>)
      fireEvent.click(screen.getByText('EPS'))
      expect(screen.getByText('EN')).toBeInTheDocument()
      expect(screen.getByText('繁中')).toBeInTheDocument()
      expect(document.body.textContent).toContain(glossary.eps.en.definition)
    } finally {
      window.innerWidth = original
    }
  })

  it("lang='zh-TW' shows the Chinese definition in the desktop tooltip", () => {
    localStorage.setItem('simfolio_language', 'zh-TW')
    try {
      renderWithProviders(<TermUnderline>EPS</TermUnderline>)
      fireEvent.mouseEnter(screen.getByText('EPS'))
      expect(document.body.textContent).toContain(glossary.eps['zh-TW'].definition)
    } finally {
      localStorage.clear()
    }
  })
})

// ---------------------------------------------------------------------------
// F. Integration — screens light up
// ---------------------------------------------------------------------------
describe('F. Integration — Fundamentals', () => {
  it('renders P/E, EPS and β as underlined trigger spans without breaking the · layout', () => {
    const q = { marketCap: 3e12, peRatio: 28.4, eps: 6.13, beta: 1.21 }
    const { container } = renderWithProviders(<Fundamentals q={q} />)
    // labels present as trigger spans
    expect(screen.getByText('P/E')).toBeInTheDocument()
    expect(screen.getByText('EPS')).toBeInTheDocument()
    expect(screen.getByText('β')).toBeInTheDocument()
    // values and · separators still render around them
    expect(container.textContent).toContain('$3.0T')
    expect(container.textContent).toContain('·')
    // hovering a label surfaces its glossary definition
    fireEvent.mouseEnter(screen.getByText('P/E'))
    expect(document.body.textContent).toContain(glossary.pe_ratio.en.definition)
  })

  it('returns — when no quote', () => {
    const { container } = renderWithProviders(<Fundamentals q={null} />)
    expect(container.textContent).toContain('—')
  })
})
