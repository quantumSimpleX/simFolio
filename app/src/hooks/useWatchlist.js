import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

// Watchlist is per-user server state in Supabase so it follows the user across
// devices (previously localStorage-only, which never synced phone → desktop).

async function fetchWatchlist(userId) {
  const { data } = await supabase
    .from('watchlist')
    .select('ticker')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
  return (data ?? []).map(r => r.ticker)
}

export function useWatchlist() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const key = ['watchlist', user?.id]

  const { data: watchlist = [] } = useQuery({
    queryKey: key,
    queryFn: () => fetchWatchlist(user.id),
    enabled: !!user,
    staleTime: 5_000,
  })

  // Shared optimistic-update lifecycle; `compute` derives the next list from the
  // current cache so the toggle reflects instantly, then reconciles on settle.
  const lifecycle = (compute) => ({
    onMutate: async (ticker) => {
      await queryClient.cancelQueries({ queryKey: key })
      const prev = queryClient.getQueryData(key) ?? []
      queryClient.setQueryData(key, compute(prev, ticker))
      return { prev }
    },
    onError: (_e, _t, ctx) => queryClient.setQueryData(key, ctx?.prev),
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  })

  const addMutation = useMutation({
    mutationFn: (ticker) => supabase.from('watchlist').upsert({ user_id: user.id, ticker }),
    ...lifecycle((prev, ticker) => prev.includes(ticker) ? prev : [...prev, ticker]),
  })

  const removeMutation = useMutation({
    mutationFn: (ticker) =>
      supabase.from('watchlist').delete().eq('user_id', user.id).eq('ticker', ticker),
    ...lifecycle((prev, ticker) => prev.filter(t => t !== ticker)),
  })

  const add = (t) => {
    if (!user) return
    const ticker = t.toUpperCase()
    if (!watchlist.includes(ticker)) addMutation.mutate(ticker)
  }

  const remove = (t) => {
    if (user) removeMutation.mutate(t.toUpperCase())
  }

  const has = (t) => watchlist.includes(t.toUpperCase())

  return { watchlist, addToWatchlist: add, removeFromWatchlist: remove, isWatching: has }
}
