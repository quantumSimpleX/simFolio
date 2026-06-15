import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { findAssetMentions, splitTextWithAssets, ASSET_REGISTRY } from '../lib/assetLinks'
import { AssetText } from '../components/AssetText'
import { HeroMessage, UserMessage } from '../components/HeroMessage'

const tickers = m => m.map(x => x.ticker)

describe('findAssetMentions — detection signals', () => {
  it('detects an explicit cashtag', () => {
    const m = findAssetMentions('I like $AAPL here')
    expect(tickers(m)).toEqual(['AAPL'])
    expect(m[0]).toMatchObject({ start: 7, end: 12 })
  })

  it('honors a cashtag even for an unknown symbol', () => {
    expect(tickers(findAssetMentions('what about $ZZZZ?'))).toEqual(['ZZZZ'])
  })

  it('detects a company / common name case-insensitively', () => {
    expect(tickers(findAssetMentions('Apple has a moat'))).toEqual(['AAPL'])
    expect(tickers(findAssetMentions('i hold nvidia'))).toEqual(['NVDA'])
    expect(tickers(findAssetMentions('Bitcoin is volatile'))).toEqual(['BTC'])
  })

  it('detects a bare known ticker', () => {
    expect(tickers(findAssetMentions('NVDA looks strong'))).toEqual(['NVDA'])
  })

  it('matches a dotted ticker (BRK.B) as a cashtag and bare token', () => {
    expect(tickers(findAssetMentions('$BRK.B'))).toEqual(['BRK.B'])
    expect(tickers(findAssetMentions('BRK.B is Berkshire'))).toEqual(['BRK.B', 'BRK.B'])
  })

  it('prefers the longest company name (Berkshire Hathaway over Berkshire)', () => {
    const m = findAssetMentions('Berkshire Hathaway is cheap')
    expect(tickers(m)).toEqual(['BRK.B'])
    expect(m[0].end).toBe('Berkshire Hathaway'.length)
  })
})

describe('findAssetMentions — false-positive guards', () => {
  it('does not link common acronyms as bare tickers', () => {
    expect(findAssetMentions('AI and the CEO discussed the ETF')).toEqual([])
  })

  it('does not link "NOW" as prose but does link the company name', () => {
    expect(findAssetMentions('do it now, right now')).toEqual([])
    expect(tickers(findAssetMentions('ServiceNow is great'))).toEqual(['NOW'])
  })

  it('does not match a ticker embedded in a larger word', () => {
    expect(findAssetMentions('SPYWARE and AMZNX are not tickers')).toEqual([])
  })

  it('returns nothing for plain prose', () => {
    expect(findAssetMentions('I think you should diversify a little more')).toEqual([])
  })
})

describe('findAssetMentions — extraTickers (holdings / watchlist)', () => {
  it('links a user-supplied ticker not in the registry', () => {
    expect(tickers(findAssetMentions('PLTR is risky', { extraTickers: ['PLTR'] }))).toEqual(['PLTR'])
  })

  it('ignores extra tickers when absent from the text', () => {
    expect(findAssetMentions('nothing here', { extraTickers: ['PLTR'] })).toEqual([])
  })
})

describe('findAssetMentions — ordering and overlap', () => {
  it('returns multiple mentions ordered by position', () => {
    const m = findAssetMentions('Compare Apple to $TSLA and NVDA')
    expect(tickers(m)).toEqual(['AAPL', 'TSLA', 'NVDA'])
    expect(m[0].start).toBeLessThan(m[1].start)
    expect(m[1].start).toBeLessThan(m[2].start)
  })

  it('does not double-count a cashtag and its bare ticker', () => {
    // The cashtag span ($AAPL) wins over the overlapping bare AAPL.
    expect(tickers(findAssetMentions('$AAPL'))).toEqual(['AAPL'])
  })
})

describe('findAssetMentions — input hygiene', () => {
  it('handles empty, null, and non-string input', () => {
    expect(findAssetMentions('')).toEqual([])
    expect(findAssetMentions(null)).toEqual([])
    expect(findAssetMentions(undefined)).toEqual([])
    expect(findAssetMentions(42)).toEqual([])
  })
})

describe('splitTextWithAssets', () => {
  it('splits text into plain and asset segments in order', () => {
    const segs = splitTextWithAssets('Buy AAPL now')
    expect(segs).toEqual([
      { text: 'Buy ', ticker: null },
      { text: 'AAPL', ticker: 'AAPL' },
      { text: ' now', ticker: null },
    ])
  })

  it('returns a single plain segment when no asset is present', () => {
    expect(splitTextWithAssets('hello there')).toEqual([{ text: 'hello there', ticker: null }])
  })

  it('returns an empty array for empty text', () => {
    expect(splitTextWithAssets('')).toEqual([])
    expect(splitTextWithAssets(null)).toEqual([])
  })

  it('handles an asset at the very start and end', () => {
    expect(splitTextWithAssets('AAPL')).toEqual([{ text: 'AAPL', ticker: 'AAPL' }])
  })
})

describe('ASSET_REGISTRY', () => {
  it('every entry has a ticker and at least one name', () => {
    for (const a of ASSET_REGISTRY) {
      expect(typeof a.ticker).toBe('string')
      expect(a.names.length).toBeGreaterThan(0)
    }
  })
})

function wrap(ui) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

describe('AssetText component', () => {
  it('renders an asset mention as a clickable link', () => {
    const onAssetClick = vi.fn()
    wrap(<AssetText text="I like AAPL" onAssetClick={onAssetClick} />)
    const link = screen.getByText('AAPL')
    expect(link).toHaveAttribute('data-ticker', 'AAPL')
    expect(link).toHaveAttribute('role', 'link')
    fireEvent.click(link)
    expect(onAssetClick).toHaveBeenCalledWith('AAPL')
  })

  it('activates the link via keyboard (Enter)', () => {
    const onAssetClick = vi.fn()
    wrap(<AssetText text="Apple" onAssetClick={onAssetClick} />)
    fireEvent.keyDown(screen.getByText('Apple'), { key: 'Enter' })
    expect(onAssetClick).toHaveBeenCalledWith('AAPL')
  })

  it('renders plain text without any links', () => {
    wrap(<AssetText text="just diversify" onAssetClick={vi.fn()} />)
    expect(screen.getByText('just diversify')).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('navigates to the stock detail route by default (no onAssetClick)', () => {
    // No onAssetClick → falls back to navigate('/stock/AAPL'); just assert it renders a link.
    wrap(<AssetText text="$AAPL" />)
    expect(screen.getByText('$AAPL')).toHaveAttribute('data-ticker', 'AAPL')
  })

  it('links a user holding passed via extraTickers', () => {
    const onAssetClick = vi.fn()
    wrap(<AssetText text="my PLTR position" extraTickers={['PLTR']} onAssetClick={onAssetClick} />)
    fireEvent.click(screen.getByText('PLTR'))
    expect(onAssetClick).toHaveBeenCalledWith('PLTR')
  })
})

describe('HeroMessage / UserMessage asset linkification', () => {
  it('HeroMessage renders a clickable asset in the reply', () => {
    wrap(<HeroMessage hero="warren" text={'"What is AAPL worth?"'} />)
    expect(screen.getByText('AAPL')).toHaveAttribute('data-ticker', 'AAPL')
  })

  it('UserMessage renders a clickable asset in the question', () => {
    wrap(<UserMessage text="Should I buy NVDA?" />)
    expect(screen.getByText('NVDA')).toHaveAttribute('data-ticker', 'NVDA')
  })
})
