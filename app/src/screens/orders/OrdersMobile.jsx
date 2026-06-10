import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { C, SANS, MONO } from '../../tokens'
import { TermUnderline, StatusPill } from '../../components/Primitives'
import { AppShell } from '../../components/AppShell'
import { useOrders, useCancelOrder } from '../../hooks/useOrders'

const TABS = ['Pending', 'Filled', 'Cancelled']

function fmtDate(ts) {
  return new Date(ts).toLocaleString('en-US', { weekday:'short', hour:'numeric', minute:'2-digit', hour12:true })
}

export default function OrdersMobile() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('Pending')
  const { data: orders, isLoading } = useOrders()
  const { mutate: cancelOrder } = useCancelOrder()

  const pending   = (orders ?? []).filter(o => o.status === 'QUEUED')
  const filled    = (orders ?? []).filter(o => o.status === 'FILLED')
  const cancelled = (orders ?? []).filter(o => o.status === 'CANCELLED')

  return (
    <AppShell active="portfolio" maxWidth={720}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', paddingBottom:14 }}>
        <div onClick={() => navigate('/portfolio')} style={{ fontFamily:SANS, fontSize:14, color:C.ame400, cursor:'pointer' }}>← Portfolio</div>
        <div style={{ fontFamily:SANS, fontWeight:700, fontSize:17, color:C.ink900 }}>Orders</div>
        <div style={{ width:40 }}/>
      </div>

      <div style={{ display:'flex', borderBottom:`1px solid ${C.ink100}` }}>
        {TABS.map(tab => (
          <div key={tab} onClick={() => setActiveTab(tab)} style={{ flex:1, padding:'11px 0', textAlign:'center', fontFamily:SANS, fontSize:13, color:activeTab===tab?C.ink900:C.ink400, fontWeight:activeTab===tab?700:400, borderBottom:activeTab===tab?`2px solid ${C.ink900}`:'2px solid transparent', cursor:'pointer' }}>{tab}</div>
        ))}
      </div>

      <div style={{ padding:'16px 0', display:'flex', flexDirection:'column', gap:14 }}>
        {isLoading && <div style={{ fontFamily:SANS, fontSize:14, color:C.ink400, paddingTop:20 }}>Loading orders…</div>}

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

function OrderCard({ order, onCancel }) {
  const isLimit = order.type === 'LIMIT'
  return (
    <div style={{ background:C.white, border:`1px solid ${C.ink100}`, borderRadius:8, padding:'14px 18px', display:'flex', flexDirection:'column', gap:12 }}>
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <div style={{ width:38, height:38, background:C.ink50, borderRadius:4, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:SANS, fontWeight:700, fontSize:11, color:C.ink500, flexShrink:0 }}>{order.ticker}</div>
        <div style={{ flex:1 }}>
          <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:2 }}>
            <div style={{ fontFamily:SANS, fontWeight:700, fontSize:15, color:C.ink900 }}>{order.side === 'BUY' ? 'Buy' : 'Sell'} {order.requested_qty} {order.ticker}</div>
            <StatusPill status={order.status?.toLowerCase()}/>
          </div>
          <div style={{ fontFamily:SANS, fontSize:12, color:C.ink400 }}>
            <TermUnderline>{isLimit ? 'Limit order' : 'Market order'}</TermUnderline> · placed {fmtDate(order.created_at)}
          </div>
        </div>
      </div>
      {isLimit && order.limit_price && (
        <div style={{ display:'flex', background:C.ink50, borderRadius:4, overflow:'hidden' }}>
          {[['Limit price', `$${parseFloat(order.limit_price).toFixed(2)}`], ['Executes when', `${order.ticker} ≤ $${parseFloat(order.limit_price).toFixed(2)}`]].map(([l,v],i) => (
            <div key={l} style={{ flex:1, padding:'8px 12px', borderRight:i===0?`1px solid ${C.ink100}`:'none' }}>
              <div style={{ fontFamily:SANS, fontSize:11, color:C.ink400, marginBottom:2 }}>{l}</div>
              <div style={{ fontFamily:SANS, fontWeight:700, fontSize:14, color:C.ink900 }}>{v}</div>
            </div>
          ))}
        </div>
      )}
      {!isLimit && (
        <div style={{ padding:'10px 14px', background:C.goldBg, border:`1px solid ${C.gold}30`, borderRadius:4 }}>
          <div style={{ fontFamily:SANS, fontSize:12, color:C.gold, lineHeight:1.5 }}>
            This order will execute at the next market open. Price may differ from when you placed it. A <TermUnderline>limit order</TermUnderline> guarantees your max price.
          </div>
        </div>
      )}
      <div onClick={onCancel} style={{ height:36, border:`1px solid ${C.red}`, borderRadius:4, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:SANS, fontSize:13, color:C.red, cursor:'pointer' }}>Cancel order</div>
    </div>
  )
}

function FilledRow({ order, dimmed }) {
  const [expanded, setExpanded] = useState(false)
  const exec = order.executions?.[0]
  const execPrice = exec?.execution_price ? parseFloat(exec.execution_price) : null
  const fee = exec?.fees_deducted != null ? parseFloat(exec.fees_deducted) : null
  const qty = parseFloat(order.requested_qty)
  const gross = execPrice != null ? qty * execPrice : null
  const isBuy = order.side === 'BUY'
  const net = gross != null && fee != null ? (isBuy ? gross + fee : gross - fee) : null
  const canExpand = !!exec

  return (
    <div
      onClick={canExpand ? () => setExpanded(e => !e) : undefined}
      style={{ background:C.white, border:`1px solid ${C.ink100}`, borderRadius:8, padding:'12px 16px', opacity:dimmed?0.6:1, cursor:canExpand?'pointer':'default' }}
    >
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <div style={{ width:36, height:36, background:C.ink50, borderRadius:4, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:SANS, fontWeight:700, fontSize:11, color:C.ink500, flexShrink:0 }}>{order.ticker}</div>
        <div style={{ flex:1 }}>
          <div style={{ display:'flex', gap:8, alignItems:'center', marginBottom:2 }}>
            <div style={{ fontFamily:SANS, fontWeight:700, fontSize:14, color:C.ink900 }}>
              {isBuy ? 'Bought' : 'Sold'} {order.requested_qty} {order.ticker}
            </div>
            <StatusPill status={order.status?.toLowerCase()}/>
          </div>
          <div style={{ fontFamily:SANS, fontSize:12, color:C.ink400 }}>
            {fmtDate(order.created_at)}{execPrice ? ` · at $${execPrice.toFixed(2)}/sh` : ''}
          </div>
        </div>
        {execPrice && (
          <div style={{ textAlign:'right', flexShrink:0 }}>
            <div style={{ fontFamily:SANS, fontWeight:700, fontSize:14, color:C.ink900 }}>
              ${gross.toFixed(2)}
            </div>
            <div style={{ fontFamily:SANS, fontSize:11, color:C.ink300, marginTop:2 }}>{expanded ? 'Hide ▴' : 'Details ▾'}</div>
          </div>
        )}
      </div>

      {expanded && exec && (
        <div style={{ marginTop:12, paddingTop:4, borderTop:`1px solid ${C.ink100}` }}>
          <DetailRow label="Order type" value={order.type === 'LIMIT' ? 'Limit order' : 'Market order'}/>
          <DetailRow label="Side" value={isBuy ? 'Buy' : 'Sell'}/>
          <DetailRow label="Filled quantity" value={`${parseFloat(exec.filled_qty)} shares`}/>
          <DetailRow label="Execution price" value={`$${execPrice.toFixed(4)} / share`}/>
          {order.type === 'LIMIT' && order.limit_price && (
            <DetailRow label="Limit price" value={`$${parseFloat(order.limit_price).toFixed(2)}`}/>
          )}
          <DetailRow label={isBuy ? 'Gross cost' : 'Gross proceeds'} value={`$${gross.toFixed(2)}`}/>
          {fee != null && <DetailRow label="Transaction fee" value={`${isBuy ? '+' : '−'}$${fee.toFixed(2)}`}/>}
          {net != null && <DetailRow label={isBuy ? 'Total deducted' : 'Net to cash'} value={`$${net.toFixed(2)}`} bold/>}
          <DetailRow label="Placed" value={fmtDate(order.created_at)}/>
          {exec.created_at && <DetailRow label="Executed" value={fmtDate(exec.created_at)}/>}
          <div style={{ padding:'8px 0 2px', fontFamily:MONO, fontSize:10, color:C.ink300 }}>ORDER {order.order_id}</div>
        </div>
      )}
    </div>
  )
}

function DetailRow({ label, value, bold }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'7px 0', borderBottom:`1px solid ${C.ink50}` }}>
      <div style={{ fontFamily:SANS, fontSize:13, color:C.ink400 }}>{label}</div>
      <div style={{ fontFamily:SANS, fontSize:13, fontWeight:bold?700:500, color:C.ink900 }}>{value}</div>
    </div>
  )
}

function EmptyState({ label, sub }) {
  return (
    <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', paddingTop:60 }}>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontFamily:SANS, fontSize:15, color:C.ink400 }}>{label}</div>
        {sub && <div style={{ fontFamily:SANS, fontSize:13, color:C.ink300, marginTop:6 }}>{sub}</div>}
      </div>
    </div>
  )
}
