import { useState } from 'react'
import { StatusPill, TermUnderline } from './Primitives'
import { Card } from './ui/card'
import { cn } from '../lib/utils'

function fmtDate(ts) {
  return new Date(ts).toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit', hour12: true })
}

function DetailRow({ label, value, bold }) {
  return (
    <div className="flex items-center justify-between border-b border-ink-50 py-[7px]">
      <div className="font-sans text-[13px] text-ink-400">{label}</div>
      <div className={cn('font-sans text-[13px] text-ink-900', bold ? 'font-bold' : 'font-medium')}>{value}</div>
    </div>
  )
}

// A filled / cancelled order row; expands to show execution detail.
export default function FilledRow({ order, dimmed }) {
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
    <Card
      onClick={canExpand ? () => setExpanded(e => !e) : undefined}
      className={cn('px-4 py-3', dimmed && 'opacity-60', canExpand ? 'cursor-pointer' : 'cursor-default')}
    >
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-input bg-ink-50 font-sans text-[11px] font-bold text-ink-500">{order.ticker}</div>
        <div className="flex-1">
          <div className="mb-0.5 flex items-center gap-2">
            <div className="font-sans text-sm font-bold text-ink-900">
              {isBuy ? 'Bought' : 'Sold'} {order.requested_qty} {order.ticker}
            </div>
            <StatusPill status={order.status?.toLowerCase()}/>
          </div>
          <div className="font-sans text-xs text-ink-400">
            {fmtDate(order.created_at)}{execPrice ? ` · at $${execPrice.toFixed(2)}/sh` : ''}
          </div>
        </div>
        {execPrice && (
          <div className="flex-shrink-0 text-right">
            <div className="font-sans text-sm font-bold text-ink-900">${gross.toFixed(2)}</div>
            <div className="mt-0.5 font-sans text-[11px] text-ink-300">{expanded ? 'Hide ▴' : 'Details ▾'}</div>
          </div>
        )}
      </div>

      {expanded && exec && (
        <div className="mt-3 border-t border-ink-100 pt-1">
          <DetailRow label="Order type" value={order.type === 'LIMIT' ? 'Limit order' : 'Market order'}/>
          <DetailRow label="Side" value={isBuy ? 'Buy' : 'Sell'}/>
          <DetailRow label="Filled quantity" value={`${parseFloat(exec.filled_qty)} shares`}/>
          <DetailRow label={<TermUnderline>Execution price</TermUnderline>} value={`$${execPrice.toFixed(4)} / share`}/>
          {order.type === 'LIMIT' && order.limit_price && (
            <DetailRow label={<TermUnderline termKey="limit_order">Limit price</TermUnderline>} value={`$${parseFloat(order.limit_price).toFixed(2)}`}/>
          )}
          <DetailRow label={<TermUnderline>{isBuy ? 'Gross cost' : 'Gross proceeds'}</TermUnderline>} value={`$${gross.toFixed(2)}`}/>
          {fee != null && <DetailRow label={<TermUnderline>Transaction fee</TermUnderline>} value={`${isBuy ? '+' : '−'}$${fee.toFixed(2)}`}/>}
          {net != null && <DetailRow label={<TermUnderline>{isBuy ? 'Total deducted' : 'Net to cash'}</TermUnderline>} value={`$${net.toFixed(2)}`} bold/>}
          <DetailRow label="Placed" value={fmtDate(order.created_at)}/>
          {exec.executed_at && <DetailRow label="Filled" value={fmtDate(exec.executed_at)}/>}
          <div className="px-0 pb-0.5 pt-2 font-mono text-[10px] text-ink-300">ORDER {order.order_id}</div>
        </div>
      )}
    </Card>
  )
}
