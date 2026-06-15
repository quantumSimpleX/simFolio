import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { findAssetSpans, resolutionKey, ASSET_REGISTRY } from '../lib/assetLinks'
import { matchRows, resolveSymbol } from '../lib/resolveSymbol'
import { AssetText } from '../components/AssetText'
import { HeroMessage, UserMessage } from '../components/HeroMessage'

const trustedTickers = text =>
  findAssetSpans(text).filter(s => s.kind === 'trusted').map(s => s.ticker)
const validateQueries = text =>
  findAssetSpans(text).filter(s => s.kind === 'validate').map(s => `${s.vtype}:${s.query}`)

// ─── findAssetSpans: trusted (no-network) detection ──────────────────────────
describe('findAssetSpans — trusted detection', () => {
  it('detects a cashtag for a known symbol', () => {
    const m = findAssetSpans('I like $AAPL here')
    expect(m).toEqual([{ start: 7, end: 12, kind: 'trusted', ticker: 'AAPL' }])
  })

  it('detects a registry company name case-insensitively', () => {
    expect(trustedTickers('Apple has a moat')).toEqual(['AAPL'])
    expect(trustedTickers('i hold nvidia')).toEqual(['NVDA'])
    expect(trustedTickers('Bitcoin is volatile')).toEqual(['BTC'])
  })

  it('detects a bare registry ticker', () => {
    expect(trustedTickers('NVDA looks strong')).toEqual(['NVDA'])
  })

  it('matches a dotted registry ticker (BRK.B)', () => {
    expect(trustedTickers('$BRK.B')).toEqual(['BRK.B'])
  })

  it('prefers the longest company name (Berkshire Hathaway over Berkshire)', () => {
    const m = findAssetSpans('Berkshire Hathaway is cheap')
    expect(m).toHaveLength(1)
    expect(m[0]).toMatchObject({ kind: 'trusted', ticker: 'BRK.B', end: 'Berkshire Hathaway'.length })
  })

  it('trusts a user holding/watchlist ticker via knownTickers', () => {
    const m = findAssetSpans('my PLTR position', { knownTickers: ['PLTR'] })
    expect(m).toEqual([{ start: 3, end: 7, kind: 'trusted', ticker: 'PLTR' }])
  })
})

// ─── findAssetSpans: validation candidates ───────────────────────────────────
describe('findAssetSpans — validation candidates', () => {
  it('flags an unknown ALL-CAPS token as a ticker candidate', () => {
    expect(validateQueries('AMD is cheap')).toEqual(['ticker:AMD'])
  })

  it('flags an unknown cashtag as a cashtag candidate', () => {
    expect(validateQueries('what about $ZM?')).toEqual(['cashtag:ZM'])
  })

  it('flags an unknown capitalized proper noun as a name candidate', () => {
    expect(validateQueries('I like Palantir a lot')).toEqual(['name:Palantir'])
  })

  it('does not flag common acronyms or common words', () => {
    expect(findAssetSpans('AI and the CEO discussed the ETF')).toEqual([])
    expect(findAssetSpans('Think about why you should diversify')).toEqual([])
  })

  it('does not flag a ticker embedded in a larger word', () => {
    expect(findAssetSpans('SPYWARE is malware')).toEqual([])
  })
})

describe('findAssetSpans — ordering, overlap, hygiene', () => {
  it('returns spans ordered by position', () => {
    const m = findAssetSpans('Apple beats $TSLA and NVDA')
    expect(m.map(s => s.ticker)).toEqual(['AAPL', 'TSLA', 'NVDA'])
    expect(m[0].start).toBeLessThan(m[1].start)
    expect(m[1].start).toBeLessThan(m[2].start)
  })

  it('does not double-count a cashtag and its bare ticker', () => {
    const m = findAssetSpans('$AAPL')
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
    expect(resolutionKey('name', 'Palantir')).toBe('name:PALANTIR')
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
  it('matches a name candidate to a US instrument by name prefix', () => {
    expect(matchRows(ROWS, 'Palantir', 'name')).toBe('PLTR')
  })
  it('ignores non-US listings', () => {
    expect(matchRows(ROWS, 'ZZZZ', 'ticker')).toBe(null)
  })
  it('returns null when nothing matches', () => {
    expect(matchRows(ROWS, 'Nope', 'name')).toBe(null)
  })
})

describe('resolveSymbol', () => {
  beforeEach(() => { globalThis.fetch.mockReset?.(); localStorage.clear() })

  it('resolves a name candidate via the symbol API and caches the result', async () => {
    globalThis.fetch = vi.fn(async () => ({ ok: true, json: async () => ({ data: ROWS }) }))
    expect(await resolveSymbol('Palantir', 'name')).toBe('PLTR')
    // Second call is served from the localStorage cache — no extra fetch.
    expect(await resolveSymbol('Palantir', 'name')).toBe('PLTR')
    expect(globalThis.fetch).toHaveBeenCalledTimes(1)
  })

  it('returns null (and caches it) for a non-asset, and on fetch error', async () => {
    globalThis.fetch = vi.fn(async () => ({ ok: true, json: async () => ({ data: [] }) }))
    expect(await resolveSymbol('Yesterday', 'name')).toBe(null)
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
  it('renders a known ticker as a clickable link', () => {
    const onAssetClick = vi.fn()
    wrap(<AssetText text="I like AAPL" onAssetClick={onAssetClick} />)
    const link = screen.getByText('AAPL')
    expect(link).toHaveAttribute('data-ticker', 'AAPL')
    expect(link).toHaveAttribute('role', 'link')
    fireEvent.click(link)
    expect(onAssetClick).toHaveBeenCalledWith('AAPL')
  })

  it('activates a link via keyboard (Enter)', () => {
    const onAssetClick = vi.fn()
    wrap(<AssetText text="Apple" onAssetClick={onAssetClick} />)
    fireEvent.keyDown(screen.getByText('Apple'), { key: 'Enter' })
    expect(onAssetClick).toHaveBeenCalledWith('AAPL')
  })

  it('renders plain prose with no links', () => {
    wrap(<AssetText text="just diversify a bit" onAssetClick={vi.fn()} />)
    expect(screen.getByText('just diversify a bit')).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('links a user holding passed via extraTickers', () => {
    const onAssetClick = vi.fn()
    wrap(<AssetText text="my PLTR position" extraTickers={['PLTR']} onAssetClick={onAssetClick} />)
    fireEvent.click(screen.getByText('PLTR'))
    expect(onAssetClick).toHaveBeenCalledWith('PLTR')
  })

  it('navigates to /stock/<TICKER> by default (no onAssetClick)', () => {
    wrap(<AssetText text="$AAPL" />)
    expect(screen.getByText('$AAPL')).toHaveAttribute('data-ticker', 'AAPL')
  })
})

describe('AssetText — live-validated links', () => {
  it('links an unknown company once validated against market data', async () => {
    globalThis.fetch = vi.fn(async () => ({ ok: true, json: async () => ({ data: ROWS }) }))
    const onAssetClick = vi.fn()
    wrap(<AssetText text="I like Palantir" onAssetClick={onAssetClick} />)
    // Initially plain text; becomes a link after the lookup resolves.
    const link = await screen.findByText('Palantir')
    await waitFor(() => expect(link).toHaveAttribute('data-ticker', 'PLTR'))
    fireEvent.click(link)
    expect(onAssetClick).toHaveBeenCalledWith('PLTR')
  })

  it('leaves an unrecognized capitalized word as plain text', async () => {
    globalThis.fetch = vi.fn(async () => ({ ok: true, json: async () => ({ data: [] }) }))
    wrap(<AssetText text="Yesterday was rough" onAssetClick={vi.fn()} />)
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled())
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
})

describe('HeroMessage / UserMessage asset linkification', () => {
  it('HeroMessage renders a clickable known asset in the reply', () => {
    wrap(<HeroMessage hero="warren" text={'"What is AAPL worth?"'} />)
    expect(screen.getByText('AAPL')).toHaveAttribute('data-ticker', 'AAPL')
  })

  it('UserMessage renders a clickable known asset in the question', () => {
    wrap(<UserMessage text="Should I buy NVDA?" />)
    expect(screen.getByText('NVDA')).toHaveAttribute('data-ticker', 'NVDA')
  })
})
