import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export function usePlaceOrder() {
  const { session } = useAuth()
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (orderParams) => {
      // TODO: restore — temporarily bypassing Edge Function for UI testing
      if (!session) {
        return {
          execution_price: orderParams.limit_price ?? 0,
          slippage: 0,
          queued: false,
          ...orderParams,
        }
      }

      const { data, error } = await supabase.functions.invoke('place-order', {
        body: orderParams,
        headers: { Authorization: `Bearer ${session.access_token}` },
      })
      if (error) throw error
      if (data.error) throw new Error(data.error)
      return data
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['portfolio'] })
      qc.invalidateQueries({ queryKey: ['orders'] })
      qc.invalidateQueries({ queryKey: ['achievements'] })
      qc.invalidateQueries({ queryKey: ['quotes', variables.ticker] })
    },
  })
}
