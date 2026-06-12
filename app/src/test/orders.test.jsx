import { describe, it, expect } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from './renderWithProviders'
import { __setTableData, supabase } from './supabaseMock'
import OrdersMobile from '../screens/orders/OrdersMobile'

const now = new Date().toISOString()

function seedOrders() {
  __setTableData('orders', [
    {
      order_id: 'o-queued', ticker: 'AAPL', side: 'BUY', type: 'LIMIT',
      requested_qty: '5', limit_price: '150', status: 'QUEUED', created_at: now, executions: [],
    },
    {
      order_id: 'o-market-q', ticker: 'MSFT', side: 'BUY', type: 'MARKET',
      requested_qty: '1', status: 'QUEUED', created_at: now, executions: [],
    },
    {
      order_id: 'o-filled', ticker: 'TSLA', side: 'SELL', type: 'MARKET',
      requested_qty: '2', status: 'FILLED', created_at: now,
      executions: [{ filled_qty: '2', execution_price: '201.1234', fees_deducted: '1', executed_at: now }],
    },
    {
      order_id: 'o-cancelled', ticker: 'NVDA', side: 'BUY', type: 'LIMIT',
      requested_qty: '3', limit_price: '90', status: 'CANCELLED', created_at: now, executions: [],
    },
  ])
}

describe('OrdersMobile', () => {
  it('shows queued limit and market orders with cancel buttons', async () => {
    seedOrders()
    renderWithProviders(<OrdersMobile/>)
    expect(await screen.findByText(/Buy 5 AAPL/)).toBeInTheDocument()
    expect(screen.getByText(/Buy 1 MSFT/)).toBeInTheDocument()
    expect(document.body.textContent).toContain('Limit price')
    expect(document.body.textContent).toContain('next market open')

    // cancel the limit order
    fireEvent.click(screen.getAllByText('Cancel order')[0])
    await waitFor(() => expect(supabase.from).toHaveBeenCalledWith('orders'))
  })

  it('filled tab expands execution details', async () => {
    seedOrders()
    renderWithProviders(<OrdersMobile/>)
    fireEvent.click(await screen.findByText('Filled'))
    const row = await screen.findByText(/Sold 2 TSLA/)
    fireEvent.click(row)
    await waitFor(() => expect(document.body.textContent).toContain('Execution price'))
    expect(document.body.textContent).toContain('$201.1234')
    expect(document.body.textContent).toContain('Net to cash')
  })

  it('cancelled tab lists cancelled orders dimmed', async () => {
    seedOrders()
    renderWithProviders(<OrdersMobile/>)
    fireEvent.click(await screen.findByText('Cancelled'))
    expect(await screen.findByText(/3 NVDA/)).toBeInTheDocument()
  })

  it('shows empty states without data', async () => {
    __setTableData('orders', [])
    renderWithProviders(<OrdersMobile/>)
    await waitFor(() => expect(document.body.textContent).toContain('No pending orders'), { timeout: 3000 })
    fireEvent.click(screen.getByText('Filled'))
    await waitFor(() => expect(document.body.textContent).toContain('No filled orders'))
  })
})
