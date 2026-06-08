import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useQuotes } from './useQuotes'

async function fetchPortfolioData(userId) {
  const [{ data: balance }, { data: positions }] = await Promise.all([
    supabase.from('user_balances').select('*').eq('user_id', userId).single(),
    supabase.from('positions').select('*').eq('user_id', userId),
  ])
  return { balance, positions: positions ?? [] }
}

export function usePortfolio() {
  const { user } = useAuth()

  const { data: raw, isLoading: loadingDb } = useQuery({
    queryKey: ['portfolio', user?.id],
    queryFn: () => fetchPortfolioData(user.id),
    enabled: !!user,
    staleTime: 5_000,
  })

  const tickers = (raw?.positions ?? []).map(p => p.ticker)
  const { data: quotes, isLoading: loadingQuotes } = useQuotes(tickers.length ? tickers : null)

  const positions = (raw?.positions ?? []).map(pos => {
    const q = (quotes ?? []).find(qq => qq.ticker === pos.ticker)
    const price  = q?.price ?? 0
    const value  = parseFloat(pos.total_qty) * price
    const cost   = parseFloat(pos.average_cost_basis) * parseFloat(pos.total_qty)
    const pnl    = value - cost
    const pct    = cost > 0 ? (pnl / cost) * 100 : 0
    return {
      ...pos,
      price,
      value,
      cost,
      pnl,
      pct,
      pos: pnl >= 0,
      name: q?.name ?? pos.ticker,
      change: q?.change ?? 0,
      changePct: q?.pct ?? 0,
    }
  })

  const cashBalance   = user ? (raw?.balance?.cash_balance ?? 0) : null
  const positionsValue = positions.reduce((sum, p) => sum + p.value, 0)
  const totalValue    = cashBalance + positionsValue
  const startingCap   = raw?.balance?.starting_capital ?? 0
  const totalPnl      = totalValue - startingCap
  const totalPct      = startingCap > 0 ? (totalPnl / startingCap) * 100 : 0

  return {
    positions,
    cashBalance,
    totalValue,
    startingCap,
    totalPnl,
    totalPct,
    loading: loadingDb || (tickers.length > 0 && loadingQuotes),
    raw,
  }
}
