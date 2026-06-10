import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

// Sweeps the user's QUEUED orders through the execute-queued edge function,
// which fills market orders at the day's opening price (with slippage),
// adjusts cash, and updates positions. Runs on load and every 5 minutes
// while the app is open; the function is a no-op when markets are closed
// (except crypto) or there is nothing queued.
export function useQueuedExecution() {
  const { user, session } = useAuth()
  const qc = useQueryClient()

  useQuery({
    queryKey: ['execute-queued', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('execute-queued', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (error) throw error
      if (data?.executed?.length) {
        console.log('[QueuedExec] Executed:', data.executed)
        qc.invalidateQueries({ queryKey: ['orders'] })
        qc.invalidateQueries({ queryKey: ['portfolio'] })
      }
      return data
    },
    enabled: !!user && !!session,
    refetchInterval: 5 * 60_000,
    staleTime: 5 * 60_000,
    retry: false,
  })
}
