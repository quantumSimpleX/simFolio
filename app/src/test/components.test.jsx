import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Fundamentals } from '../components/Fundamentals'
import { WatchRow } from '../components/WatchRow'
import { SearchResultRow } from '../components/SearchResultRow'
import { WatchlistButton } from '../components/WatchlistButton'
import { SellButton } from '../components/SellButton'
import { PositionCard } from '../components/PositionCard'
import { PriceCard } from '../components/PriceCard'
import { StockRow } from '../components/StockRow'
import { HoldingRow } from '../components/HoldingRow'
import { QuickPrompts, ChatComposer, ChatMessages } from '../components/HeroChatPanel'

function wrap(ui) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}><MemoryRouter>{ui}</MemoryRouter></QueryClientProvider>)
}

describe('Fundamentals', () => {
  it('renders market cap, P/E, EPS, beta', () => {
    render(<div><Fundamentals q={{ marketCap: 2.5e12, peRatio: 30, eps: 6.1, beta: 1.2 }} /></div>)
    expect(screen.getByText('$2.5T')).toBeInTheDocument()
    expect(screen.getByText('30.0')).toBeInTheDocument()
    expect(screen.getByText('P/E:')).toBeInTheDocument()
  })
  it('handles missing quote gracefully', () => {
    render(<div data-testid="f"><Fundamentals q={null} /></div>)
    expect(screen.getByTestId('f').textContent).toBe('—')
  })
})

describe('StockRow / HoldingRow', () => {
  it('StockRow shows ticker, name, and right-side values', () => {
    wrap(<StockRow ticker="AAPL" name="Apple Inc." rightTop="$213.00" rightBottom="+1.2%" rightBottomPos={true} />)
    expect(screen.getByText('Apple Inc.')).toBeInTheDocument()
    expect(screen.getByText('$213.00')).toBeInTheDocument()
    expect(screen.getByText('+1.2%')).toBeInTheDocument()
  })
  it('StockRow fires onClick', () => {
    const onClick = vi.fn()
    wrap(<StockRow ticker="AAPL" name="Apple Inc." onClick={onClick} />)
    fireEvent.click(screen.getByText('Apple Inc.'))
    expect(onClick).toHaveBeenCalled()
  })
  it('StockRow ticker chip uses the enlarged symbol box', () => {
    wrap(<StockRow ticker="AAPL" name="Apple Inc." />)
    const chip = screen.getByText('AAPL')
    expect(chip).toHaveClass('h-[46px]')
    expect(chip).toHaveClass('w-[46px]')
  })
  it('HoldingRow formats shares and percent', () => {
    const { container } = wrap(<HoldingRow ticker="NVDA" name="NVIDIA" qty={5} value={1000} pct={12.3} pos={true} />)
    expect(container.textContent.replace(/\s+/g, ' ')).toContain('5 shares')
    expect(screen.getByText('+12.3%')).toBeInTheDocument()
  })
})

describe('WatchRow / SearchResultRow / WatchlistButton', () => {
  it('WatchRow renders price, change, and Owned badge', () => {
    wrap(<WatchRow sym="TSLA" q={{ name: 'Tesla', price: 250, change: 5, pct: 2, pos: true }} owned />)
    expect(screen.getByText('Tesla')).toBeInTheDocument()
    expect(screen.getByText('Owned')).toBeInTheDocument()
  })
  it('SearchResultRow renders instrument name and fires onClick', () => {
    const onClick = vi.fn()
    wrap(<SearchResultRow r={{ symbol: 'TSLA', instrument_name: 'Tesla Inc.', exchange: 'NASDAQ' }} q={{ price: 250, pct: 2, pos: true }} onClick={onClick} />)
    expect(screen.getByText('Tesla Inc.')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Tesla Inc.'))
    expect(onClick).toHaveBeenCalled()
  })
  it('WatchlistButton reflects watching state and toggles', () => {
    const onClick = vi.fn()
    const { rerender } = wrap(<WatchlistButton watching={false} onClick={onClick} />)
    expect(screen.getByText('+ Watchlist')).toBeInTheDocument()
    fireEvent.click(screen.getByText('+ Watchlist'))
    expect(onClick).toHaveBeenCalled()
    rerender(<MemoryRouter><WatchlistButton watching onClick={onClick} /></MemoryRouter>)
    expect(screen.getByText('Watching')).toBeInTheDocument()
  })
  it('SellButton navigates via provided navigate', () => {
    const navigate = vi.fn()
    wrap(<SellButton ticker="AAPL" navigate={navigate} />)
    fireEvent.click(screen.getByText('Sell'))
    expect(navigate).toHaveBeenCalledWith('/sell/AAPL')
  })
})

describe('PositionCard', () => {
  it('shows gain with positive semantics', () => {
    wrap(<PositionCard position={{ total_qty: '5', average_cost_basis: '100', pnl: 50, pct: 10, pos: true }} />)
    expect(screen.getByText(/5 shares · avg \$100\.00/)).toBeInTheDocument()
    expect(screen.getByText(/\+\$50\.00 \(\+10\.0%\)/)).toBeInTheDocument()
  })
})

describe('PriceCard', () => {
  it('shows price and day change', () => {
    wrap(<PriceCard price={213} change={2} pct={1} pos={true} ticker="AAPL" exchange="NASDAQ" canExec />)
    expect(screen.getByText('$213')).toBeInTheDocument()
    expect(screen.getByText(/AAPL · NASDAQ/)).toBeInTheDocument()
  })
})

describe('HeroChatPanel pieces', () => {
  it('QuickPrompts fires onPick', () => {
    const onPick = vi.fn()
    wrap(<QuickPrompts onPick={onPick} />)
    fireEvent.click(screen.getByText('Review my picks'))
    expect(onPick).toHaveBeenCalledWith('Review my picks')
  })
  it('ChatComposer round-trips value and sends', () => {
    const onChange = vi.fn()
    const onSend = vi.fn()
    wrap(<ChatComposer value="hi" onChange={onChange} onSend={onSend} />)
    const input = screen.getByPlaceholderText(/Ask your mentor/i)
    expect(input.value).toBe('hi')
    fireEvent.change(input, { target: { value: 'hello' } })
    expect(onChange).toHaveBeenCalledWith('hello')
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onSend).toHaveBeenCalled()
  })
  it('ChatMessages renders hero (italic, quoted) and user bubbles', () => {
    wrap(<ChatMessages heroId="warren" history={[{ role: 'user', content: 'What should I buy?' }, { role: 'assistant', content: 'Why this stock?' }]} isPending={false} />)
    expect(screen.getByText('What should I buy?')).toBeInTheDocument()
    expect(screen.getByText('"Why this stock?"')).toBeInTheDocument()
    expect(screen.getByText('Warren Buffett')).toBeInTheDocument()
  })
  it('ChatMessages shows a "Calling {hero}…" indicator while pending', () => {
    wrap(<ChatMessages heroId="warren" history={[{ role: 'user', content: 'Hi' }]} isPending />)
    expect(screen.getByText('Calling Warren Buffett…')).toBeInTheDocument()
  })
  it('ChatMessages falls back to "your mentor" when the hero is unknown', () => {
    wrap(<ChatMessages heroId="nobody" history={[]} isPending emptyText="Ask anything." />)
    expect(screen.getByText('Calling your mentor…')).toBeInTheDocument()
  })
  it('ChatMessages badges a reply with its persisted model (abbreviated)', () => {
    wrap(<ChatMessages heroId="warren" history={[{ role: 'assistant', content: 'Why?', model: 'meta-llama/llama-3.3-70b-instruct:free' }]} isPending={false} />)
    expect(screen.getByText('Llama')).toBeInTheDocument()
  })
  it('ChatMessages falls back to the live lastModel for the latest unbadged reply', () => {
    wrap(<ChatMessages heroId="warren" history={[{ role: 'assistant', content: 'Why?' }]} isPending={false} lastModel="openai/gpt-oss-120b:free" />)
    expect(screen.getByText('GPT-OSS')).toBeInTheDocument()
  })
  it('ChatMessages shows no model badge when none is known', () => {
    wrap(<ChatMessages heroId="warren" history={[{ role: 'assistant', content: 'Why?' }]} isPending={false} />)
    expect(screen.queryByText(/Llama|GPT-OSS|Gemma|Nemotron/)).not.toBeInTheDocument()
  })
  it('ChatMessages attributes each assistant bubble to its own hero_id, not the selected hero', () => {
    wrap(<ChatMessages heroId="warren" history={[
      { role: 'assistant', content: 'Why this stock?', hero_id: 'warren' },
      { role: 'assistant', content: 'Is it disruptive?', hero_id: 'cathie' },
    ]} isPending={false} />)
    expect(screen.getByText('Warren Buffett')).toBeInTheDocument()
    expect(screen.getByText('Cathie Wood')).toBeInTheDocument()
  })
  it('ChatMessages inserts a "{Hero} joins" divider when the speaking hero changes', () => {
    wrap(<ChatMessages heroId="warren" history={[
      { role: 'assistant', content: 'Why this stock?', hero_id: 'warren' },
      { role: 'assistant', content: 'Is it disruptive?', hero_id: 'cathie' },
    ]} isPending={false} />)
    expect(screen.getByText('Cathie Wood joins')).toBeInTheDocument()
    // No divider for the first hero — there is no prior hero to change from.
    expect(screen.queryByText('Warren Buffett joins')).not.toBeInTheDocument()
  })
  it('ChatMessages does not insert a divider between consecutive same-hero replies', () => {
    wrap(<ChatMessages heroId="warren" history={[
      { role: 'assistant', content: 'Why this stock?', hero_id: 'warren' },
      { role: 'assistant', content: 'What is its moat?', hero_id: 'warren' },
    ]} isPending={false} />)
    expect(screen.queryByText(/joins/)).not.toBeInTheDocument()
  })
  it('ChatMessages shows a divider across an intervening user message when the hero changes', () => {
    wrap(<ChatMessages heroId="warren" history={[
      { role: 'assistant', content: 'Why this stock?', hero_id: 'warren' },
      { role: 'user', content: 'Not sure' },
      { role: 'assistant', content: 'Is it disruptive?', hero_id: 'cathie' },
    ]} isPending={false} />)
    expect(screen.getByText('Cathie Wood joins')).toBeInTheDocument()
  })
  it('ChatMessages does not divide when a user message sits between two same-hero replies', () => {
    wrap(<ChatMessages heroId="warren" history={[
      { role: 'assistant', content: 'Why this stock?', hero_id: 'warren' },
      { role: 'user', content: 'Not sure' },
      { role: 'assistant', content: 'What is its moat?', hero_id: 'warren' },
    ]} isPending={false} />)
    expect(screen.queryByText(/joins/)).not.toBeInTheDocument()
  })
  it('ChatMessages falls back to the selected heroId for legacy rows without hero_id', () => {
    wrap(<ChatMessages heroId="cathie" history={[{ role: 'assistant', content: 'Why?' }]} isPending={false} />)
    expect(screen.getByText('Cathie Wood')).toBeInTheDocument()
    expect(screen.queryByText(/joins/)).not.toBeInTheDocument()
  })
})
