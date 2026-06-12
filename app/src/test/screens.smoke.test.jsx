// Smoke tests: every screen renders without crashing against the mocked
// Supabase client, with key landmarks visible.
import { describe, it, expect } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import { renderWithProviders } from './renderWithProviders'

import App from '../App'
import Onboarding from '../screens/onboarding/Onboarding'
import WelcomeMobile from '../screens/auth/WelcomeMobile'
import WelcomeDesktop from '../screens/auth/WelcomeDesktop'
import SignIn from '../screens/auth/SignIn'
import SignUp from '../screens/auth/SignUp'
import ReturningUser from '../screens/auth/ReturningUser'
import PortfolioMobile from '../screens/portfolio/PortfolioMobile'
import PortfolioDesktop from '../screens/portfolio/PortfolioDesktop'
import AskTab from '../screens/portfolio/AskTab'
import Markets from '../screens/markets/Markets'
import StockDetail from '../screens/markets/StockDetail'
import BuyScreen from '../screens/trade/BuyScreen'
import SellScreen from '../screens/trade/SellScreen'
import TradeReceipt from '../screens/trade/TradeReceipt'
import HeroHandoff from '../screens/trade/HeroHandoff'
import OrdersMobile from '../screens/orders/OrdersMobile'
import AchievementsMobile from '../screens/achievements/AchievementsMobile'
import BadgeEarned from '../screens/achievements/BadgeEarned'
import Profile from '../screens/profile/Profile'

describe('screen smoke tests', () => {
  it('Onboarding renders the first (goal) question', async () => {
    renderWithProviders(<Onboarding/>)
    expect(await screen.findByText(/Select all that apply/i)).toBeInTheDocument()
  })

  it('WelcomeMobile renders', () => {
    renderWithProviders(<WelcomeMobile/>)
  })

  it('WelcomeDesktop renders the brand panel', () => {
    renderWithProviders(<WelcomeDesktop/>)
    expect(screen.getByText(/Create your account/i)).toBeInTheDocument()
  })

  it('SignIn renders', () => {
    renderWithProviders(<SignIn/>)
  })

  it('SignUp renders', () => {
    renderWithProviders(<SignUp/>)
  })

  it('ReturningUser renders', () => {
    renderWithProviders(<ReturningUser/>)
  })

  it('PortfolioMobile renders', async () => {
    renderWithProviders(<PortfolioMobile/>)
    await waitFor(() => expect(document.body.textContent).toContain('Holdings'))
  })

  it('PortfolioDesktop renders', async () => {
    renderWithProviders(<PortfolioDesktop/>)
    await waitFor(() => expect(document.body.textContent).toContain('Holdings'))
  })

  it('AskTab renders', () => {
    renderWithProviders(<AskTab/>)
  })

  it('Markets renders', async () => {
    renderWithProviders(<Markets/>)
    await waitFor(() => expect(document.body.textContent).toContain('Markets'))
  })

  it('StockDetail renders with a ticker param', async () => {
    renderWithProviders(<StockDetail/>, { route: '/stock/AAPL', path: '/stock/:ticker' })
    await waitFor(() => expect(document.body.textContent).toContain('AAPL'))
  })

  it('BuyScreen renders order form with market/limit options', async () => {
    renderWithProviders(<BuyScreen/>, { route: '/buy/AAPL', path: '/buy/:ticker' })
    expect((await screen.findAllByText(/Market order/i)).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Limit order/i).length).toBeGreaterThan(0)
  })

  it('SellScreen shows the no-position state without holdings', async () => {
    renderWithProviders(<SellScreen/>, { route: '/sell/AAPL', path: '/sell/:ticker' })
    await waitFor(() => expect(document.body.textContent).toMatch(/don't hold/i))
  })

  it('TradeReceipt renders a filled buy with spread breakdown', async () => {
    const state = {
      result: { status: 'FILLED', execution_price: 101.5, market_price: 100, fee: 1, spread_component: 0.02, spread_bps: 4 },
      ticker: 'AAPL', qty: 2, side: 'buy',
    }
    renderWithProviders(<TradeReceipt/>, { route: { pathname: '/receipt', state }, path: '/receipt' })
    expect(await screen.findByText(/Order filled/i)).toBeInTheDocument()
    expect(document.body.textContent).toContain('Bid-ask spread')
    expect(document.body.textContent).toContain('Slippage')
  })

  it('TradeReceipt renders a queued order', async () => {
    const state = { result: { status: 'QUEUED' }, ticker: 'AAPL', qty: 1, side: 'buy' }
    renderWithProviders(<TradeReceipt/>, { route: { pathname: '/receipt', state }, path: '/receipt' })
    expect(await screen.findByText(/Order queued/i)).toBeInTheDocument()
  })

  it('HeroHandoff renders', () => {
    renderWithProviders(<HeroHandoff/>)
  })

  it('OrdersMobile renders empty pending state', async () => {
    renderWithProviders(<OrdersMobile/>)
    await waitFor(() => expect(document.body.textContent).toContain('No pending orders'))
  })

  it('AchievementsMobile renders', () => {
    renderWithProviders(<AchievementsMobile/>)
  })

  it('BadgeEarned renders', () => {
    renderWithProviders(<BadgeEarned/>)
  })

  it('Profile shows saved onboarding answers from localStorage', async () => {
    localStorage.setItem('simfolio_onboarding_answers', JSON.stringify({
      goal: ['Shielding purchasing power from inflation'],
      capital: '10000',
      horizon: '3 – 10 years',
    }))
    renderWithProviders(<Profile/>)
    await waitFor(() => expect(document.body.textContent).toContain('$10,000'))
    expect(document.body.textContent).toContain('Time horizon')
  })

  it('App routes / to onboarding (dev redirect)', async () => {
    renderWithProviders(<App/>, { withRouter: false })
    await waitFor(() => expect(document.body.textContent).toMatch(/Select all that apply/i))
  })
})
