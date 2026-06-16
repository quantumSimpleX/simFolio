import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { cn } from '../../lib/utils'
import { GhostCTA, Eyebrow, TermUnderline, ReceiptRow } from '../../components/Primitives'
import { AppShell } from '../../components/AppShell'
import { useIsMobile } from '../../hooks/useBreakpoint'
import { usePortfolio } from '../../hooks/usePortfolio'
import { usePlaceOrder } from '../../hooks/usePlaceOrder'
import { useStockDetail, useCandles } from '../../hooks/useStockDetail'
import { ChartPanel, RangeButtons } from '../../components/Charts'
import { TRANSACTION_FEE } from '../../lib/fees'
import { OrderTypeCard, TifToggle, QtyInputBlock } from './BuyScreen'

function detectAssetType(ticker) {
  const crypto = ['BTC','ETH','SOL','DOGE','XRP','ADA','AVAX']
  const etfs   = ['VTI','VOO','SPY','QQQ','IWM','DIA','GLD','TLT','VNQ','ARK']
  if (crypto.includes(ticker)) return 'CRYPTO'
  if (etfs.includes(ticker)) return 'ETF'
  return 'STOCK'
}

export default function SellScreen() {
  const { ticker } = useParams()
  const navigate = useNavigate()
  const mobile = useIsMobile()
  const { positions } = usePortfolio()
  const { mutate: placeOrder, isPending } = usePlaceOrder()

  const pos = positions.find(p => p.ticker === ticker)
  const maxQty = pos ? parseFloat(pos.total_qty) : 0
  const price = pos?.price ?? 0
  const costBasis = pos ? parseFloat(pos.average_cost_basis) : 0

  const [qty, setQty] = useState(1)
  const [orderType, setOrderType] = useState('MARKET')
  const [limitPrice, setLimitPrice] = useState('')
  const [tif, setTif] = useState('GTC')
  const [chartRange, setChartRange] = useState('All')

  const { data: stock, isLoading } = useStockDetail(ticker)
  const { data: candles, isLoading: candlesLoading, isError: candlesError } = useCandles(ticker, chartRange)

  const gross = (qty * price).toFixed(2)
  const pnl   = qty * price - qty * costBasis
  const pnlPositive = pnl >= 0
  const netToCash = (qty * price - TRANSACTION_FEE).toFixed(2)

  function handleSell() {
    placeOrder({
      ticker,
      asset_type: detectAssetType(ticker),
      side: 'SELL',
      type: orderType,
      requested_qty: qty,
      ...(orderType === 'LIMIT' && limitPrice ? { limit_price: parseFloat(limitPrice), time_in_force: tif } : {}),
    }, {
      onSuccess: (result) => {
        navigate('/receipt', { state: { result, ticker, qty, side:'sell', pnl, pnlPositive } })
      },
      onError: (err) => alert(err.message),
    })
  }

  if (!pos) {
    return (
      <AppShell active="portfolio">
        <div className="flex flex-col items-center justify-center gap-4 py-20">
          <div className="font-sans text-[15px] text-ink-500">You don't hold {ticker}</div>
          <div onClick={() => navigate(-1)} className="cursor-pointer font-sans text-sm text-ame-400">← Go back</div>
        </div>
      </AppShell>
    )
  }

  const sellCTAs = (
    <div className="flex flex-col gap-2.5">
      <div onClick={!isPending ? handleSell : undefined} className={cn('flex h-12 items-center justify-center rounded-input bg-red font-sans text-[15px] font-semibold text-white', isPending ? 'cursor-default opacity-60' : 'cursor-pointer')}>
        {isPending ? 'Selling…' : orderType === 'LIMIT' ? `Place limit sell for ${qty} ${ticker}  →` : `Sell ${qty} ${ticker}  →`}
      </div>
      <GhostCTA label="Ask your council first" onClick={() => navigate('/ask')}/>
    </div>
  )

  const content = (
    <div className="flex w-full flex-col gap-[18px]">
      <div className="flex items-center gap-3.5">
        <div onClick={() => navigate(-1)} className="cursor-pointer font-sans text-sm text-ame-400">← Back</div>
        <div className="flex-1 text-center font-sans text-[17px] font-bold text-ink-900">Sell {ticker}</div>
        <div className="w-10"/>
      </div>

      <div className="rounded-card border border-ink-100 bg-white px-5 py-3.5">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-display text-[26px] font-bold tracking-[-0.02em] text-ink-900">${price.toFixed(2)}</div>
            <div className={cn('mt-0.5 font-sans text-[13px]', pos.changePct>=0 ? 'text-aqua-600' : 'text-red')}>
              {pos.change>=0?'+':''}{pos.change?.toFixed(2)} · {pos.changePct>=0?'+':''}{pos.changePct?.toFixed(1)}% today
            </div>
          </div>
          <div className="text-right">
            <div className="font-sans text-xs text-ink-400">You own {maxQty} shares</div>
            <div className={cn('mt-0.5 font-sans text-xs', pnlPositive ? 'text-aqua-600' : 'text-red')}>
              Cost: ${costBasis.toFixed(2)} · {pnlPositive?'+':'−'}${Math.abs(pos.pnl).toFixed(2)} ({pnlPositive?'+':'−'}{Math.abs(pos.pct).toFixed(1)}%)
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-start gap-2.5 rounded-card border border-ame-100 bg-ame-50 px-4 py-3">
        <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-pill border-[1.5px] border-ame-400/35 bg-ame-400/10 font-sans text-[10px] font-bold text-ame-400">WB</div>
        <div className="flex-1">
          <div className="mb-[3px] font-sans text-xs font-semibold text-ame-600">Warren</div>
          <div className="font-sans text-[13px] italic leading-normal text-ink-600">
            "Fear is not a thesis. Has anything changed about {ticker} as a business — or just the price?"
          </div>
        </div>
      </div>

      <div>
        <div className="mb-2 font-sans text-[13px] text-ink-500">Shares to sell (of {maxQty})</div>
        <QtyInputBlock qty={qty} setQty={setQty} price={price} accent="red" max={maxQty}/>
      </div>

      <div>
        <div className="mb-2 font-sans text-[13px] text-ink-500">Order type</div>
        <div className="flex gap-2.5">
          <OrderTypeCard label="Market order" desc="Sell now at current price" active={orderType==='MARKET'} onClick={() => setOrderType('MARKET')}/>
          <OrderTypeCard label="Limit order" desc="Only fill if price reaches your target" active={orderType==='LIMIT'} onClick={() => setOrderType('LIMIT')}/>
        </div>
        {orderType === 'LIMIT' && (
          <div className="mt-2 grid grid-cols-2 items-center gap-2.5">
            <input
              type="number"
              value={limitPrice}
              onChange={e => setLimitPrice(e.target.value)}
              placeholder={`Min price (current: $${price.toFixed(2)})`}
              className="box-border h-11 w-full rounded-input border border-ame-400 bg-white px-3.5 font-sans text-sm text-ink-900 outline-none"
            />
            <TifToggle tif={tif} setTif={setTif}/>
          </div>
        )}
      </div>

      <div className="rounded-card border border-ink-100 bg-white px-4">
        <div className="pb-1 pt-2.5"><Eyebrow>Sale preview</Eyebrow></div>
        <ReceiptRow label={`${qty} shares × $${price.toFixed(2)}`} value={`$${gross}`}/>
        <ReceiptRow label={<TermUnderline>Transaction fee</TermUnderline>} value={`−$${TRANSACTION_FEE.toFixed(2)}`}/>
        <ReceiptRow
          label={<TermUnderline>{pnlPositive ? 'Realised gain' : 'Realised loss'}</TermUnderline>}
          value={`${pnlPositive?'+':'−'}$${Math.abs(pnl).toFixed(2)}`}
          valueColor={pnlPositive?'var(--aqua-600)':'var(--red)'}
        />
        <ReceiptRow label="Net to cash" value={`$${netToCash}`} bold/>
      </div>

      {!mobile && sellCTAs}
    </div>
  )

  const chartBlock = (
    <>
      <div>
        <div className="mb-1 font-sans text-sm text-ink-400">
          {isLoading ? '…' : [ticker, stock?.name, stock?.exchange].filter(Boolean).join(' · ')}
        </div>
        <div className="flex items-end gap-3.5">
          <div className="whitespace-nowrap font-display text-5xl font-bold leading-none tracking-[-0.025em] text-ink-900">
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
    </>
  )

  if (mobile) {
    const footer = (
      <div className="border-t border-ink-100 bg-white px-4 pb-5 pt-3">
        {sellCTAs}
      </div>
    )
    return <AppShell active="portfolio" footer={footer}>{content}</AppShell>
  }

  return (
    <AppShell active="portfolio" maxWidth={1200}>
      <div className="flex items-start gap-8">
        <div className="w-[480px] flex-shrink-0">{content}</div>
        <div className="sticky top-7 flex min-w-0 flex-1 flex-col gap-6">{chartBlock}</div>
      </div>
    </AppShell>
  )
}
