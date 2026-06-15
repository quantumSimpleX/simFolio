import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { findAssetSpans, resolutionKey, ASSET_REGISTRY } from '../lib/assetLinks'
import { matchRows, resolveSymbol } from '../lib/resolveSymbol'
import { AssetText } from '../components/AssetText'
import { HeroMessage, UserMessage } from '../components/HeroMessage'

const trusted = text => findAssetSpans(text).filter(s => s.ticker)
const validates = text => findAssetSpans(text).filter(s => s.vtype)

// ─── findAssetSpans: bracketed entities (primary mechanism) ──────────────────
describe('findAssetSpans — bracketed entities', () => {
  it('links a bracketed registry name without a network call (trusted)', () => {
    const m = findAssetSpans('I admire [Apple] here')
    expect(m).toHaveLength(1)
    expect(m[0]).toMatchObject({ ticker: 'AAPL', display: 'Apple' })
    // Span covers the brackets so they get stripped from display.
    expect('I admire [Apple] here'.slice(m[0].start, m[0].end)).toBe('[Apple]')
  })

  it('links a bracketed ticker via the fast path', () => {
    expect(trusted('Consider [NVDA] and [BRK.B]').map(s => s.ticker)).toEqual(['NVDA', 'BRK.B'])
  })

  it('flags an unknown bracketed entity (multi-word) for validation as one unit', () => {
    const m = findAssetSpans('Look at [Palantir Technologies] today')
    expect(m).toHaveLength(1)
    expect(m[0]).toMatchObject({ vtype: 'entity', query: 'Palantir Technologies', display: 'Palantir Technologies' })
  })

  it('trims whitespace and ignores empty brackets', () => {
    expect(findAssetSpans('nothing [] here')).toEqual([])
    expect(findAssetSpans('[ Apple ]')[0]).toMatchObject({ ticker: 'AAPL', display: 'Apple' })
  })
})

// ─── findAssetSpans: unbracketed text (user messages / legacy) ───────────────
describe('findAssetSpans — unbracketed precise detection', () => {
  it('links a known cashtag (trusted) and validates an unknown one', () => {
    expect(trusted('buy $AAPL').map(s => s.ticker)).toEqual(['AAPL'])
    expect(validates('what about $ZM?').map(s => `${s.vtype}:${s.query}`)).toEqual(['ticker:ZM'])
  })

  it('links a registry name and a bare known ticker', () => {
    expect(trusted('Apple and NVDA').map(s => s.ticker)).toEqual(['AAPL', 'NVDA'])
  })

  it('links a user holding ticker via knownTickers', () => {
    const m = findAssetSpans('my PLTR position', { knownTickers: ['PLTR'] })
    expect(m).toEqual([{ start: 3, end: 7, display: 'PLTR', ticker: 'PLTR' }])
  })

  it('does NOT guess unknown company names or acronyms in unbracketed prose', () => {
    expect(findAssetSpans('I think Palantir and the CEO are great')).toEqual([])
    expect(findAssetSpans('AI and the ETF discussion')).toEqual([])
  })

  it('does not match a ticker embedded in a larger word', () => {
    expect(findAssetSpans('SPYWARE is malware')).toEqual([])
  })
})

describe('findAssetSpans — ordering, overlap, hygiene', () => {
  it('returns spans ordered by position', () => {
    const m = findAssetSpans('[Apple] beats $TSLA and NVDA')
    expect(m.map(s => s.ticker)).toEqual(['AAPL', 'TSLA', 'NVDA'])
  })

  it('does not double-count a registry name already inside a bracket', () => {
    const m = findAssetSpans('[Apple] is great')   // "Apple" would also match the name scan
    expect(m).toHaveLength(1)
    expect(m[0].ticker).toBe('AAPL')
  })

  it('handles empty / null / non-string input', () => {
    expect(findAssetSpans('')).toEqual([])
    expect(findAssetSpans(null)).toEqual([])
    expect(findAssetSpans(undefined)).toEqual([])
    expect(findAssetSpans(42)).toEqual([])
  })
})

describe('resolutionKey / ASSET_REGISTRY', () => {
  it('builds a stable upper-cased key', () => {
    expect(resolutionKey('entity', 'Palantir')).toBe('entity:PALANTIR')
  })
  it('registry entries each have a ticker and at least one name', () => {
    for (const a of ASSET_REGISTRY) {
      expect(typeof a.ticker).toBe('string')
      expect(a.names.length).toBeGreaterThan(0)
    }
  })
})

// ─── resolveSymbol / matchRows (live validation) ─────────────────────────────
const ROWS = [
  { symbol: 'PLTR', instrument_name: 'Palantir Technologies Inc', instrument_type: 'Common Stock', country: 'United States' },
  { symbol: 'AMD', instrument_name: 'Advanced Micro Devices', instrument_type: 'Common Stock', country: 'United States' },
  { symbol: 'PLTR.MX', instrument_name: 'Palantir', instrument_type: 'Common Stock', country: 'Mexico' },
]

describe('matchRows', () => {
  it('matches a ticker candidate to an exact US symbol', () => {
    expect(matchRows(ROWS, 'AMD', 'ticker')).toBe('AMD')
  })
  it('matches an entity by exact symbol when given a ticker', () => {
    expect(matchRows(ROWS, 'AMD', 'entity')).toBe('AMD')
  })
  it('matches an entity by company-name prefix (multi-word)', () => {
    expect(matchRows(ROWS, 'Palantir Technologies', 'entity')).toBe('PLTR')
  })
  it('strips a leading $ from the query', () => {
    expect(matchRows(ROWS, '$AMD', 'entity')).toBe('AMD')
  })
  it('ignores non-US listings and returns null when nothing matches', () => {
    expect(matchRows(ROWS, 'Nope', 'entity')).toBe(null)
    expect(matchRows(ROWS, 'ZZZZ', 'ticker')).toBe(null)
  })
})

describe('resolveSymbol', () => {
  beforeEach(() => { localStorage.clear() })

  it('resolves an entity via the symbol API and caches the result', async () => {
    globalThis.fetch = vi.fn(async () => ({ ok: true, json: async () => ({ data: ROWS }) }))
    expect(await resolveSymbol('Palantir Technologies', 'entity')).toBe('PLTR')
    expect(await resolveSymbol('Palantir Technologies', 'entity')).toBe('PLTR')   // cached
    expect(globalThis.fetch).toHaveBeenCalledTimes(1)
  })

  it('returns null (cached) for a non-asset and on fetch error', async () => {
    globalThis.fetch = vi.fn(async () => ({ ok: true, json: async () => ({ data: [] }) }))
    expect(await resolveSymbol('Acme Widgets', 'entity')).toBe(null)
    globalThis.fetch = vi.fn(async () => { throw new Error('network') })
    expect(await resolveSymbol('Boom', 'ticker')).toBe(null)
  })
})

// ─── AssetText component ─────────────────────────────────────────────────────
function wrap(ui) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}><MemoryRouter>{ui}</MemoryRouter></QueryClientProvider>)
}

describe('AssetText — trusted (synchronous) links', () => {
  it('links a bracketed registry name and strips the brackets', () => {
    const onAssetClick = vi.fn()
    wrap(<AssetText text="I admire [Apple] a lot" onAssetClick={onAssetClick} />)
    const link = screen.getByText('Apple')
    expect(link).toHaveAttribute('data-ticker', 'AAPL')
    expect(link).toHaveAttribute('role', 'link')
    expect(screen.queryByText(/\[Apple\]/)).not.toBeInTheDocument()
    fireEvent.click(link)
    expect(onAssetClick).toHaveBeenCalledWith('AAPL')
  })

  it('activates a link via keyboard (Enter)', () => {
    const onAssetClick = vi.fn()
    wrap(<AssetText text="[Apple]" onAssetClick={onAssetClick} />)
    fireEvent.keyDown(screen.getByText('Apple'), { key: 'Enter' })
    expect(onAssetClick).toHaveBeenCalledWith('AAPL')
  })

  it('links a bare known ticker in the user message', () => {
    const onAssetClick = vi.fn()
    wrap(<AssetText text="Should I buy NVDA?" onAssetClick={onAssetClick} />)
    fireEvent.click(screen.getByText('NVDA'))
    expect(onAssetClick).toHaveBeenCalledWith('NVDA')
  })

  it('renders plain prose with no links', () => {
    wrap(<AssetText text="just diversify a bit" onAssetClick={vi.fn()} />)
    expect(screen.getByText('just diversify a bit')).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('navigates to /stock/<TICKER> by default (no onAssetClick)', () => {
    wrap(<AssetText text="$AAPL" />)
    expect(screen.getByText('$AAPL')).toHaveAttribute('data-ticker', 'AAPL')
  })
})

describe('AssetText — live-validated bracketed entities', () => {
  beforeEach(() => { localStorage.clear() })

  it('links an unknown multi-word company once validated, brackets stripped', async () => {
    globalThis.fetch = vi.fn(async () => ({ ok: true, json: async () => ({ data: ROWS }) }))
    const onAssetClick = vi.fn()
    wrap(<AssetText text="Look at [Palantir Technologies]" onAssetClick={onAssetClick} />)
    const link = await screen.findByText('Palantir Technologies')
    await waitFor(() => expect(link).toHaveAttribute('data-ticker', 'PLTR'))
    expect(screen.queryByText(/\[/)).not.toBeInTheDocument()
    fireEvent.click(link)
    expect(onAssetClick).toHaveBeenCalledWith('PLTR')
  })

  it('strips brackets and shows plain text when an entity does not resolve', async () => {
    globalThis.fetch = vi.fn(async () => ({ ok: true, json: async () => ({ data: [] }) }))
    wrap(<AssetText text="the [whole market] today" onAssetClick={vi.fn()} />)
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled())
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
    expect(screen.queryByText(/\[/)).not.toBeInTheDocument()
    expect(screen.getByText(/whole market/)).toBeInTheDocument()
  })
})

describe('HeroMessage / UserMessage asset linkification', () => {
  it('HeroMessage links a bracketed asset in the reply', () => {
    wrap(<HeroMessage hero="warren" text={'"What is [Apple] worth?"'} />)
    expect(screen.getByText('Apple')).toHaveAttribute('data-ticker', 'AAPL')
  })

  it('UserMessage links a bare known ticker in the question', () => {
    wrap(<UserMessage text="Should I buy NVDA?" />)
    expect(screen.getByText('NVDA')).toHaveAttribute('data-ticker', 'NVDA')
  })
})
