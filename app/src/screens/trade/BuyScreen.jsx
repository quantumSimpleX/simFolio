import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { cn, shares } from '../../lib/utils'
import { CTA, Eyebrow, TermUnderline, ReceiptRow } from '../../components/Primitives'
import { AppShell } from '../../components/AppShell'
import { PriceCard } from '../../components/PriceCard'
import { useIsMobile } from '../../hooks/useBreakpoint'
import { SageMsg } from '../../components/HeroMessage'
import { ChartPanel, RangeButtons } from '../../components/Charts'
import { useStockDetail, useCandles } from '../../hooks/useStockDetail'
import { usePlaceOrder } from '../../hooks/usePlaceOrder'
import { isMarketOpen } from '../../hooks/useQuotes'
import { usePortfolio } from '../../hooks/usePortfolio'
import { TRANSACTION_FEE } from '../../lib/fees'

function detectAssetType(ticker) {
  const crypto = ['BTC','ETH','SOL','DOGE','XRP','ADA','AVAX']
  const etfs   = ['VTI','VOO','SPY','QQQ','IWM','DIA','GLD','TLT','VNQ','ARK']
  if (crypto.includes(ticker)) return 'CRYPTO'
  if (etfs.includes(ticker)) return 'ETF'
  return 'STOCK'
}

export default function BuyScreen() {
  const { ticker } = useParams()
  const navigate = useNavigate()
  const mobile = useIsMobile()
  const [qty, setQty] = useState(1)
  const [orderType, setOrderType] = useState('MARKET')
  const [limitPrice, setLimitPrice] = useState('')
  const [tif, setTif] = useState(null)
  const [chartRange, setChartRange] = useState('All')

  const { data: stock, isLoading } = useStockDetail(ticker)
  const { data: candles, isLoading: candlesLoading, isError: candlesError } = useCandles(ticker, chartRange)
  const { cashBalance } = usePortfolio()
  const { mutate: placeOrder, isPending } = usePlaceOrder()
  const marketOpen = isMarketOpen()
  const assetType = detectAssetType(ticker)
  const canExec = marketOpen || assetType === 'CRYPTO'

  const price = stock?.price ?? 0
  // Limit orders cost at the target price (the max you'd pay), not the live price.
  const effectivePrice = orderType === 'LIMIT' && limitPrice ? parseFloat(limitPrice) : price
  const total = (qty * effectivePrice).toFixed(2)
  const fee = TRANSACTION_FEE
  const grandTotal = (qty * effectivePrice + fee).toFixed(2)
  const cashAfter = cashBalance != null ? (cashBalance - parseFloat(grandTotal)).toFixed(2) : null
  // Limit orders require both a target price and a time-in-force selection.
  const limitIncomplete = orderType === 'LIMIT' && (!limitPrice || !tif)

  function handleBuy() {
    const params = {
      ticker,
      asset_type: assetType,
      side: 'BUY',
      type: orderType,
      requested_qty: qty,
      execution_price: price,
      dayChange: stock?.pct ?? 0,
      ...(orderType === 'LIMIT' && limitPrice ? { limit_price: parseFloat(limitPrice), time_in_force: tif } : {}),
    }
    placeOrder(params, {
      onSuccess: (result) => {
        navigate('/receipt', { state: { result, ticker, qty, side:'buy' } })
      },
      onError: (err) => {
        alert(err.message)
      },
    })
  }

  const priceCard = (
    <PriceCard
      price={price}
      change={stock?.change}
      pct={stock?.pct}
      pos={stock?.pos}
      isLoading={isLoading}
      ticker={ticker}
      exchange={stock?.exchange ?? assetType}
      canExec={canExec}
      mobile={mobile}
    />
  )

  const orderForm = (
    <>
      {!canExec && <MarketClosedBanner/>}

      <SageMsg text={canExec
        ? "Let's walk through this together. How many shares do you want? Even 1 is a great start."
        : "Markets are closed right now. Your market order will be queued and execute at the next opening price — which may differ from what you see today."
      }/>

      <div>
        <div className="mb-2 font-sans text-[13px] text-ink-500">Quantity</div>
        <QtyInputBlock qty={qty} setQty={setQty} price={price}/>
      </div>

      <div>
        <div className="mb-2 font-sans text-[13px] text-ink-500">Order type</div>
        <div className="grid grid-cols-2 gap-2.5">
          <OrderTypeCard label="Market order" desc={canExec ? 'Execute now at current price' : 'Execute at next market open'} active={orderType==='MARKET'} onClick={() => setOrderType('MARKET')}/>
          <OrderTypeCard label="Limit order" desc="Only fill if price reaches your target" active={orderType==='LIMIT'} onClick={() => setOrderType('LIMIT')}/>
        </div>
        {orderType === 'LIMIT' && (
          <>
          <div className="mt-2.5 grid grid-cols-2 items-center gap-2.5">
            <input
              type="number"
              value={limitPrice}
              onChange={e => setLimitPrice(e.target.value)}
              aria-label="Limit price"
              onFocus={e => {
                // First focus on an empty field pre-fills the live price and selects it,
                // so the user can tweak from a sensible default instead of an empty box.
                const el = e.target
                if (!limitPrice && price) { setLimitPrice(price.toFixed(2)); requestAnimationFrame(() => el.select()) }
                else el.select()
              }}
              placeholder={`Max price (current: $${price})`}
              className="no-spinner box-border h-11 w-full rounded-input border border-ame-400 bg-white px-3.5 font-sans text-sm text-ink-900 outline-none"
            />
            <TifToggle tif={tif} setTif={setTif}/>
          </div>
          <div className="mt-2.5">
            <SageMsg compact text="Enter your target price on the left and a time in force on the right — both are required."/>
          </div>
          </>
        )}
      </div>

      <div className="rounded-card border border-ink-100 bg-white px-5">
        <div className="pb-1 pt-3"><Eyebrow>Order summary</Eyebrow></div>
        <ReceiptRow label={`${shares(qty)} × $${effectivePrice}`} value={`$${total}`}/>
        <ReceiptRow label={<TermUnderline>Transaction fee</TermUnderline>} value={`$${fee.toFixed(2)}`}/>
        <ReceiptRow label={canExec ? 'Total' : 'Total (estimated)'} value={canExec ? `$${grandTotal}` : `~$${grandTotal}`} bold/>
      </div>
    </>
  )

  const buyCTA = (
    <>
      <CTA
        label={canExec ? `Buy ${qty} ${ticker}  →` : `Queue order for next open  →`}
        full
        loading={isPending}
        disabled={limitIncomplete || (cashBalance != null && cashBalance < parseFloat(grandTotal))}
        onClick={handleBuy}
      />
      {cashAfter !== null && (
        <div className="mt-2.5 text-center font-sans text-xs text-ink-400">
          Cash after: ${cashAfter} available
        </div>
      )}
    </>
  )

  // ── Mobile: single column + fixed CTA footer ───────────────────────────────
  if (mobile) {
    const footer = (
      <div className="border-t border-ink-100 bg-white px-4 pb-5 pt-3">
        {buyCTA}
      </div>
    )
    return (
      <AppShell active="portfolio" footer={footer}>
        <div className="flex flex-col gap-[18px]">
          <div className="flex items-center gap-3.5">
            <div onClick={() => navigate(-1)} className="cursor-pointer font-sans text-sm text-ame-400">← Back</div>
            <h1 className="flex-1 text-center font-sans text-[17px] font-bold text-ink-900">Buy {ticker}</h1>
            <div className="w-10"/>
          </div>
          {priceCard}
          {orderForm}
        </div>
      </AppShell>
    )
  }

  // ── Desktop/tablet: order form + chart column ───────────────────────────────
  return (
    <AppShell active="portfolio" maxWidth={1200}>
      <div className="flex items-start gap-8">
        <div className="flex w-[480px] flex-shrink-0 flex-col gap-6">
          <div>
            <div onClick={() => navigate(-1)} className="mb-2 cursor-pointer font-sans text-[13px] text-ame-400">← Back</div>
            <h1 className="font-sans text-[32px] font-bold leading-none tracking-[-0.02em] text-ink-900">Buy {ticker}</h1>
          </div>
          {priceCard}
          {orderForm}
          <div>{buyCTA}</div>
        </div>

        <div className="sticky top-7 flex min-w-0 flex-1 flex-col gap-6">
          <div>
            <div className="mb-1 font-sans text-sm text-ink-400">
              {isLoading ? '…' : [ticker, stock?.name, stock?.exchange].filter(Boolean).join(' · ')}
            </div>
            <div className="flex items-end gap-3.5">
              <div className="whitespace-nowrap font-sans text-5xl font-bold leading-none tracking-[-0.025em] text-ink-900">
                {isLoading ? '…' : stock?.price ? `$${stock.price.toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 })}` : '—'}
              </div>
              <div className={cn('whitespace-nowrap font-sans text-lg leading-tight', stock?.pos ? 'text-aqua-600' : 'text-red')}>
                {stock ? `${stock.pos?'+':''}${stock.change?.toFixed(2)} (${stock.pos?'+':''}${stock.pct?.toFixed(1)}%)` : '—'}
              </div>
              <div className="ml-auto"><RangeButtons range={chartRange} onRangeChange={setChartRange}/></div>
            </div>
          </div>
          <div className="rounded-card border border-ink-100 bg-white px-2 pb-2 pt-5">
            <ChartPanel height={300} candles={candles} isLoading={candlesLoading} isError={candlesError} range={chartRange} onRangeChange={setChartRange}/>
          </div>
          <SageMsg text={`You're buying ${shares(qty)} — a solid start. If you're unsure about the quantity, you can always buy more later.`}/>
        </div>
      </div>
    </AppShell>
  )
}

function MarketClosedBanner() {
  return (
    <div className="flex items-center gap-2 rounded-input border border-gold/30 bg-goldBg px-3.5 py-2.5">
      <div className="h-1.5 w-1.5 flex-shrink-0 rounded-pill bg-gold"/>
      <div className="font-sans text-[13px] text-gold">Markets closed · Order will execute at next market open</div>
    </div>
  )
}

// Tied Shares + Amount($) inputs. Shares (qty) stays the source of truth in the
// parent; the dollar field shows shares × price, except while it's being edited —
// then it shows the user's draft and we compute the shares that amount buys.
// `accent` themes it ('ame' for buy, 'red' for sell); `max` caps the quantity
// (e.g. shares owned when selling).
export function QtyInputBlock({ qty, setQty, price, accent = 'ame', max = null }) {
  const [amountDraft, setAmountDraft] = useState(null)

  const clamp = v => (max != null ? Math.min(v, max) : v)

  const derivedAmount = (parseFloat(qty) || 0) * price
  const amountValue = amountDraft !== null
    ? amountDraft
    : (derivedAmount > 0 ? derivedAmount.toFixed(2) : '')

  function onSharesChange(e) {
    const v = parseFloat(e.target.value)
    if (!isNaN(v) && v > 0) setQty(clamp(v))
    else if (e.target.value === '') setQty('')
  }

  function onAmountChange(e) {
    const raw = e.target.value
    setAmountDraft(raw)
    const amt = parseFloat(raw)
    if (!isNaN(amt) && amt > 0 && price > 0) setQty(clamp(Math.round((amt / price) * 100) / 100))
    else if (raw === '') setQty('')
  }

  const fieldClass = cn(
    'flex h-14 min-w-0 flex-1 items-center justify-between rounded-input border-[1.5px] bg-white px-4',
    accent === 'red'
      ? 'border-red [box-shadow:0_0_0_3px_color-mix(in_srgb,var(--red)_10%,transparent)]'
      : 'border-ame-400 [box-shadow:0_0_0_3px_color-mix(in_srgb,var(--ame-400)_10%,transparent)]',
  )
  const labelClass = cn('flex-shrink-0 font-sans text-[11px] font-semibold uppercase tracking-[0.14em]', accent === 'red' ? 'text-red' : 'text-ame-400')
  const inputClass = 'no-spinner w-full min-w-0 border-none bg-transparent text-right font-sans text-[24px] font-bold tracking-[-0.02em] text-ink-900 outline-none'

  return (
    <div className="flex gap-2.5">
      <div className={fieldClass}>
        <div className={labelClass}><TermUnderline>Shares</TermUnderline></div>
        <input
          type="number"
          min="0.01"
          step="0.01"
          max={max ?? undefined}
          value={qty}
          aria-label="Shares"
          onFocus={e => e.target.select()}
          onChange={onSharesChange}
          onBlur={e => { if (!e.target.value || parseFloat(e.target.value) <= 0) setQty(1) }}
          className={inputClass}
        />
      </div>
      <div className={fieldClass}>
        <div className={labelClass}>Amount $</div>
        <input
          type="number"
          min="0"
          step="0.01"
          value={amountValue}
          aria-label="Amount in dollars"
          placeholder="0.00"
          onFocus={e => { setAmountDraft(amountValue); e.target.select() }}
          onBlur={() => setAmountDraft(null)}
          onChange={onAmountChange}
          className={inputClass}
        />
      </div>
    </div>
  )
}

export function TifToggle({ tif, setTif }) {
  return (
    <div className="flex h-11 items-center gap-2">
      <span className="shrink-0 whitespace-nowrap font-sans text-sm font-medium text-ink-500"><TermUnderline termKey="time_in_force">TIF</TermUnderline>:</span>
      {[['GTC','GTC','gtc_order'], ['DAY','EOD','eod_order']].map(([val, label, tkey]) => (
        <div key={val} onClick={() => setTif(val)} className={cn('flex h-11 flex-1 cursor-pointer select-none items-center justify-center rounded-input border font-sans text-sm', tif===val ? 'border-ame-400 bg-ame-50 font-semibold text-ame-600' : 'border-ink-200 bg-white font-medium text-ink-600')}>
          <TermUnderline termKey={tkey}>{label}</TermUnderline>
        </div>
      ))}
    </div>
  )
}

export function OrderTypeCard({ label, desc, active, onClick }) {
  return (
    <div onClick={onClick} className={cn('flex-1 cursor-pointer rounded-input px-3.5 py-3', active ? 'border-2 border-ame-400 bg-ame-50' : 'border border-ink-100 bg-white')}>
      <div className={cn('mb-[3px] font-sans text-sm', active ? 'font-bold text-ame-600' : 'font-medium text-ink-700')}><TermUnderline>{label}</TermUnderline></div>
      <div className={cn('font-sans text-xs leading-snug', active ? 'text-ame-400' : 'text-ink-400')}>{desc}</div>
    </div>
  )
}
