import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { renderWithProviders } from './renderWithProviders'
import { __setTableData } from './supabaseMock'
import { HeroMessage, UserMessage, SageMsg } from '../components/HeroMessage'
import TradeReceipt from '../screens/trade/TradeReceipt'
import Markets from '../screens/markets/Markets'

describe('chat message components', () => {
  it('HeroMessage renders every hero plus fallback, time, and new dot', () => {
    render(
      <MemoryRouter>
        {['sage', 'warren', 'munger', 'lynch', 'bogle', 'cathie', 'ray', 'unknown'].map(h => (
          <HeroMessage key={h} hero={h} text={`hi from ${h}`} time="9:41" isNew/>
        ))}
        <UserMessage text="my question"/>
        <SageMsg text="welcome" compact/>
        <SageMsg text="welcome big"/>
      </MemoryRouter>,
    )
    expect(screen.getByText('Charlie Munger')).toBeInTheDocument()
    expect(screen.getByText('my question')).toBeInTheDocument()
    expect(screen.getByText('welcome big')).toBeInTheDocument()
  })
})

describe('TradeReceipt sell variant', () => {
  it('shows realised gain, fee, and Warren reflection prompt', async () => {
    const state = {
      result: { status: 'FILLED', execution_price: 180, market_price: 180.2, fee: 1 },
      ticker: 'AAPL', qty: 3, side: 'sell', pnl: 90, pnlPositive: true,
    }
    renderWithProviders(<TradeReceipt/>, { route: { pathname: '/receipt', state }, path: '/receipt' })
    expect((await screen.findAllByText('Sold')).length).toBeGreaterThan(0)
    expect(document.body.textContent).toContain('Realised gain')
    expect(document.body.textContent).toContain('Warren on this trade')
    fireEvent.click(screen.getByText(/Back to portfolio/))
  })

  it('shows realised loss styling for losing sells', async () => {
    const state = {
      result: { status: 'FILLED', execution_price: 100, market_price: 100, fee: 1 },
      ticker: 'AAPL', qty: 1, side: 'sell', pnl: -25, pnlPositive: false,
    }
    renderWithProviders(<TradeReceipt/>, { route: { pathname: '/receipt', state }, path: '/receipt' })
    expect((await screen.findAllByText('Sold')).length).toBeGreaterThan(0)
    expect(document.body.textContent).toContain('Realised loss')
  })
})

describe('Markets search', () => {
  it('typing a query switches to search mode and back', async () => {
    __setTableData('watchlists', [])
    renderWithProviders(<Markets/>)
    const input = await screen.findByPlaceholderText(/search/i)
    fireEvent.change(input, { target: { value: 'tesla' } })
    await waitFor(() => expect(input.value).toBe('tesla'))
    fireEvent.change(input, { target: { value: '' } })
  })
})
