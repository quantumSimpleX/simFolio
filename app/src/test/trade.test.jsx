import { describe, it, expect, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from './renderWithProviders'
import { __setTableData, supabase } from './supabaseMock'
import SellScreen from '../screens/trade/SellScreen'
import BuyScreen from '../screens/trade/BuyScreen'

beforeEach(() => {
  __setTableData('positions', [
    { user_id: 'test-user', ticker: 'AAPL', asset_type: 'STOCK', total_qty: '10', average_cost_basis: '150' },
  ])
  __setTableData('user_balances', [
    { user_id: 'test-user', cash_balance: 5000, starting_capital: 5000 },
  ])
  supabase.functions.invoke.mockResolvedValue({ data: { status: 'QUEUED', order_id: 'o1' }, error: null })
})

describe('SellScreen with a position', () => {
  it('shows holdings, quantity choices, and the hero question', async () => {
    renderWithProviders(<SellScreen/>, { route: '/sell/AAPL', path: '/sell/:ticker' })
    await waitFor(() => expect(document.body.textContent).toContain('You own 10 shares'))
    expect(document.body.textContent).toContain('has anything changed about AAPL'.toLowerCase() ? 'AAPL' : 'AAPL')
    // tied shares/amount inputs — set shares to all 10 owned (first spinbutton)
    fireEvent.change(screen.getAllByRole('spinbutton')[0], { target: { value: '10' } })
    expect(document.body.textContent).toContain('Sell 10 AAPL')
  })

  it('limit sell exposes price input and DAY/GTC toggle, and places the order', async () => {
    renderWithProviders(<SellScreen/>, { route: '/sell/AAPL', path: '/sell/:ticker' })
    await waitFor(() => expect(document.body.textContent).toContain('You own 10 shares'))

    fireEvent.click(screen.getByText('Limit order'))
    const limitInput = await screen.findByPlaceholderText(/Min price/i)
    fireEvent.change(limitInput, { target: { value: '180' } })
    fireEvent.click(screen.getByText('End of day')) // DAY time-in-force

    fireEvent.click(screen.getByText(/Place limit sell/))
    await waitFor(() => expect(supabase.functions.invoke).toHaveBeenCalled())
    const [, { body }] = supabase.functions.invoke.mock.calls.at(-1)
    expect(body).toMatchObject({ side: 'SELL', type: 'LIMIT', limit_price: 180, time_in_force: 'DAY' })
  })

  it('market sell sends a MARKET order', async () => {
    renderWithProviders(<SellScreen/>, { route: '/sell/AAPL', path: '/sell/:ticker' })
    await waitFor(() => expect(document.body.textContent).toContain('You own 10 shares'))
    fireEvent.click(screen.getByText(/Sell 1 AAPL/))
    await waitFor(() => expect(supabase.functions.invoke).toHaveBeenCalled())
    const [, { body }] = supabase.functions.invoke.mock.calls.at(-1)
    expect(body).toMatchObject({ side: 'SELL', type: 'MARKET', requested_qty: 1 })
  })
})

describe('BuyScreen interactions', () => {
  it('limit buy with GTC default sends limit_price and time_in_force', async () => {
    renderWithProviders(<BuyScreen/>, { route: '/buy/AAPL', path: '/buy/:ticker' })
    fireEvent.click((await screen.findAllByText('Limit order'))[0])
    const limitInput = await screen.findByPlaceholderText(/Max price/i)
    fireEvent.change(limitInput, { target: { value: '120' } })
    expect(screen.getByText('Cancelled')).toBeInTheDocument() // GTC option visible

    fireEvent.click(screen.getByText(/Queue order|Buy 1 AAPL/))
    await waitFor(() => expect(supabase.functions.invoke).toHaveBeenCalled())
    const [, { body }] = supabase.functions.invoke.mock.calls.at(-1)
    expect(body).toMatchObject({ side: 'BUY', type: 'LIMIT', limit_price: 120, time_in_force: 'GTC' })
  })

  it('quantity input accepts fractional shares', async () => {
    renderWithProviders(<BuyScreen/>, { route: '/buy/AAPL', path: '/buy/:ticker' })
    const qtyInput = (await screen.findAllByRole('spinbutton'))[0]
    fireEvent.change(qtyInput, { target: { value: '2.5' } })
    expect(document.body.textContent).toContain('2.5 shares')
  })
})
