import { useState } from 'react'
import { AppShell } from '../../components/AppShell'
import { PageHeader } from '../../components/Nav'
import OrderCard from '../../components/OrderCard'
import FilledRow from '../../components/FilledRow'
import EmptyState from '../../components/EmptyState'
import { useOrders, useCancelOrder } from '../../hooks/useOrders'
import { cn } from '../../lib/utils'

const TABS = ['Pending', 'Filled', 'Cancelled']

export default function OrdersMobile() {
  const [activeTab, setActiveTab] = useState('Pending')
  const { data: orders, isLoading } = useOrders()
  const { mutate: cancelOrder } = useCancelOrder()

  const pending   = (orders ?? []).filter(o => o.status === 'QUEUED')
  const filled    = (orders ?? []).filter(o => o.status === 'FILLED')
  const cancelled = (orders ?? []).filter(o => o.status === 'CANCELLED')

  return (
    <AppShell active="orders" maxWidth={720}>
      <PageHeader title="Orders"/>

      <div className="flex border-b border-ink-100">
        {TABS.map(tab => (
          <div
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'flex-1 cursor-pointer py-[11px] text-center font-sans text-[13px]',
              activeTab === tab ? 'border-b-2 border-ink-900 font-bold text-ink-900' : 'border-b-2 border-transparent font-normal text-ink-400',
            )}
          >
            {tab}
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3.5 py-4">
        {isLoading && <div className="pt-5 font-sans text-sm text-ink-400">Loading orders…</div>}

        {activeTab === 'Pending' && (
          pending.length === 0 && !isLoading ? (
            <EmptyState label="No pending orders" sub="Queued and limit orders will appear here"/>
          ) : (
            pending.map(o => (
              <OrderCard key={o.order_id} order={o} onCancel={() => cancelOrder(o.order_id)}/>
            ))
          )
        )}

        {activeTab === 'Filled' && (
          filled.length === 0 && !isLoading ? (
            <EmptyState label="No filled orders" sub="Completed trades will appear here"/>
          ) : (
            filled.map(o => <FilledRow key={o.order_id} order={o}/>)
          )
        )}

        {activeTab === 'Cancelled' && (
          cancelled.length === 0 && !isLoading ? (
            <EmptyState label="No cancelled orders"/>
          ) : (
            cancelled.map(o => <FilledRow key={o.order_id} order={o} dimmed/>)
          )
        )}
      </div>
    </AppShell>
  )
}
