import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { findAssetSpans, resolutionKey, ASSET_REGISTRY } from '../lib/assetLinks'
import { matchRows, resolveSymbol } from '../lib/resolveSymbol'
import { AssetText } from '../components/AssetText'
import { HeroMessage, UserMessage } from '../components/HeroMessage'
import { supabase } from '../lib/supabase'   // aliased to the test mock

// Yahoo (edge function) is the primary resolver; helper to stub its rows.
const yahooReturns = rows => supabase.functions.invoke.mockResolvedValue({ data: { data: rows }, error: null })
const yahooFails = () => supabase.functions.invoke.mockResolvedValue({ data: null, error: new Error('rate limited') })

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

  it('validates a bracketed ticker-shaped token (any length — analyst-vouched)', () => {
    expect(validates('[GH] and [ILMN]').map(s => `${s.vtype}:${s.query}`)).toEqual(['ticker:GH', 'ticker:ILMN'])
  })

  it('validates a bracketed multi-word company name as an entity', () => {
    const m = findAssetSpans('Look at [Palantir Technologies] today')
    expect(m).toHaveLength(1)
    expect(m[0]).toMatchObject({ display: 'Palantir Technologies', vtype: 'entity', query: 'Palantir Technologies' })
  })

  it('trims whitespace and ignores empty brackets', () => {
    expect(findAssetSpans('nothing [] here')).toEqual([])
    expect(findAssetSpans('[ Apple ]')[0]).toMatchObject({ ticker: 'AAPL', display: 'Apple' })
  })

  it('validates names as entities and ticker-shaped brackets as tickers', () => {
    const text = 'I like [Illumina] and [Guardant Health], plus [ARK Genomic Revolution ETF] ([ARKG]).'
    const m = findAssetSpans(text)
    // Every bracket becomes a span (brackets stripped from display)…
    expect(m.map(s => s.display)).toEqual(['Illumina', 'Guardant Health', 'ARK Genomic Revolution ETF', 'ARKG'])
    // …names resolve via the Markets symbol search; ticker-shaped ones as tickers.
    expect(m.filter(s => s.vtype).map(s => `${s.vtype}:${s.query}`)).toEqual([
      'entity:Illumina', 'entity:Guardant Health', 'entity:ARK Genomic Revolution ETF', 'ticker:ARKG',
    ])
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

  it('flags an unknown ALL-CAPS ticker-shaped token (>=3 letters) for validation', () => {
    expect(validates('I bought PLTR today').map(s => `${s.vtype}:${s.query}`)).toEqual(['ticker:PLTR'])
    expect(validates('the (ARKG) fund').map(s => `${s.vtype}:${s.query}`)).toEqual(['ticker:ARKG'])
  })

  it('does not flag a 2-letter caps token or a stopword acronym', () => {
    expect(findAssetSpans('GE and ETF here')).toEqual([])
  })

  it('does NOT guess unknown company names (mixed-case) in unbracketed prose', () => {
    expect(findAssetSpans('I think Palantir and the CEO are great')).toEqual([])
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
  beforeEach(() => { localStorage.clear(); supabase.functions.invoke.mockReset() })

  it('resolves an entity via Yahoo (edge function) and caches the result', async () => {
    yahooReturns(ROWS)
    expect(await resolveSymbol('Palantir Technologies', 'entity')).toBe('PLTR')
    expect(await resolveSymbol('Palantir Technologies', 'entity')).toBe('PLTR')   // cached
    expect(supabase.functions.invoke).toHaveBeenCalledTimes(1)
  })

  it('falls back to TwelveData when Yahoo errors / rate-limits', async () => {
    yahooFails()
    globalThis.fetch = vi.fn(async () => ({ ok: true, json: async () => ({ data: ROWS }) }))
    expect(await resolveSymbol('Palantir Technologies', 'entity')).toBe('PLTR')
    expect(globalThis.fetch).toHaveBeenCalledTimes(1)   // TwelveData fallback used
  })

  it('returns null (cached) for a non-asset, and null when both providers fail', async () => {
    yahooReturns([])
    expect(await resolveSymbol('Acme Widgets', 'entity')).toBe(null)
    yahooFails()
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

  it('renders **bold** markdown as <strong> and still links assets inside it', () => {
    wrap(<AssetText text="**Consider [Apple]** today" onAssetClick={vi.fn()} />)
    const link = screen.getByText('Apple')
    expect(link).toHaveAttribute('data-ticker', 'AAPL')
    expect(link.closest('strong')).toBeInTheDocument()
    // The asterisks themselves are not shown.
    expect(screen.queryByText(/\*\*/)).not.toBeInTheDocument()
  })

  it('links only the ticker in a collapsed "Name ([TICKER])" reply', () => {
    // Edge function collapses "[Illumina] ([ILMN])" -> "Illumina ([ILMN])".
    const m = findAssetSpans('Illumina ([ILMN])')
    expect(m).toHaveLength(1)
    expect(m[0]).toMatchObject({ vtype: 'ticker', query: 'ILMN', display: 'ILMN' })
  })
})

describe('AssetText — live-validated bracketed entities', () => {
  beforeEach(() => { localStorage.clear(); supabase.functions.invoke.mockReset() })

  it('links a bracketed ticker once validated, brackets stripped', async () => {
    yahooReturns(ROWS)
    const onAssetClick = vi.fn()
    wrap(<AssetText text="Look at [PLTR]" onAssetClick={onAssetClick} />)
    const link = await screen.findByText('PLTR')
    await waitFor(() => expect(link).toHaveAttribute('data-ticker', 'PLTR'))
    expect(screen.queryByText(/\[/)).not.toBeInTheDocument()
    fireEvent.click(link)
    expect(onAssetClick).toHaveBeenCalledWith('PLTR')
  })

  it('links a bracketed company/fund name once the market search resolves it', async () => {
    yahooReturns([{ symbol: 'ARKK', instrument_name: 'ARK Innovation ETF', instrument_type: 'ETF', country: 'United States' }])
    const onAssetClick = vi.fn()
    wrap(<AssetText text="the [ARK Innovation ETF] today" onAssetClick={onAssetClick} />)
    const link = await screen.findByText('ARK Innovation ETF')
    await waitFor(() => expect(link).toHaveAttribute('data-ticker', 'ARKK'))
    expect(screen.queryByText(/\[/)).not.toBeInTheDocument()
    fireEvent.click(link)
    expect(onAssetClick).toHaveBeenCalledWith('ARKK')
  })

  it('renders a bracketed name as plain text (brackets stripped) when it does not resolve', async () => {
    yahooReturns([])
    wrap(<AssetText text="the [whole market] today" onAssetClick={vi.fn()} />)
    await waitFor(() => expect(supabase.functions.invoke).toHaveBeenCalled())
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
