import { TermUnderline, StatusPill } from './Primitives'
import { Card } from './ui/card'
import { Button } from './ui/button'

function fmtDate(ts) {
  return new Date(ts).toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit', hour12: true })
}

// A queued / pending order with cancel action.
export default function OrderCard({ order, onCancel }) {
  const isLimit = order.type === 'LIMIT'
  return (
    <Card className="flex flex-col gap-3 px-[18px] py-3.5">
      <div className="flex items-center gap-2.5">
        <div className="flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-input bg-ink-50 font-sans text-[11px] font-bold text-ink-500">{order.ticker}</div>
        <div className="flex-1">
          <div className="mb-0.5 flex items-center gap-2">
            <div className="font-sans text-[15px] font-bold text-ink-900">{order.side === 'BUY' ? 'Buy' : 'Sell'} {order.requested_qty} {order.ticker}</div>
            <StatusPill status={order.status?.toLowerCase()}/>
          </div>
          <div className="font-sans text-xs text-ink-400">
            <TermUnderline>{isLimit ? 'Limit order' : 'Market order'}</TermUnderline> · placed {fmtDate(order.created_at)}
          </div>
        </div>
      </div>

      {isLimit && order.limit_price && (
        <div className="flex overflow-hidden rounded-input bg-ink-50">
          {[['Limit price', `$${parseFloat(order.limit_price).toFixed(2)}`], ['Executes when', `${order.ticker} ≤ $${parseFloat(order.limit_price).toFixed(2)}`]].map(([l, v], i) => (
            <div key={l} className={`flex-1 px-3 py-2 ${i === 0 ? 'border-r border-ink-100' : ''}`}>
              <div className="mb-0.5 font-sans text-[11px] text-ink-400">{l}</div>
              <div className="font-sans text-sm font-bold text-ink-900">{v}</div>
            </div>
          ))}
        </div>
      )}

      {!isLimit && (
        <div className="rounded-input border border-gold/30 bg-goldBg px-3.5 py-2.5">
          <div className="font-sans text-xs leading-normal text-gold">
            This order will execute at the next market open. Price may differ from when you placed it. A <TermUnderline>limit order</TermUnderline> guarantees your max price.
          </div>
        </div>
      )}

      <Button
        variant="ghost"
        onClick={onCancel}
        className="h-9 border-red text-[13px] text-red hover:bg-red/5"
      >
        Cancel order
      </Button>
    </Card>
  )
}
