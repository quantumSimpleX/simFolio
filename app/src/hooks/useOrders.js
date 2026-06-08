import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export function useOrders() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ['orders', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`*, executions(*)`)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
    enabled: !!user,
  })
}

export function useCancelOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (orderId) => {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'CANCELLED' })
        .eq('order_id', orderId)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['orders'] }),
  })
}
