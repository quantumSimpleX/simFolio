import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { C, SANS, DISPLAY } from '../../tokens'
import { CTA, Eyebrow, TermUnderline, MktStatus, ReceiptRow } from '../../components/Primitives'
import { AppShell } from '../../components/AppShell'
import { useIsMobile } from '../../hooks/useBreakpoint'
import { SageMsg } from '../../components/HeroMessage'
import { MiniChart } from '../../components/Charts'
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
  const [tif, setTif] = useState('GTC')

  const { data: stock, isLoading } = useStockDetail(ticker)
  const { data: candles, isLoading: candlesLoading, isError: candlesError } = useCandles(ticker, '1M')
  const { cashBalance } = usePortfolio()
  const { mutate: placeOrder, isPending } = usePlaceOrder()
  const marketOpen = isMarketOpen()
  const assetType = detectAssetType(ticker)
  const canExec = marketOpen || assetType === 'CRYPTO'

  const price = stock?.price ?? 0
  const total = (qty * price).toFixed(2)
  const fee = TRANSACTION_FEE
  const grandTotal = (qty * price + fee).toFixed(2)
  const cashAfter = cashBalance != null ? (cashBalance - parseFloat(grandTotal)).toFixed(2) : null

  function handleBuy() {
    const params = {
      ticker,
      asset_type: assetType,
      side: 'BUY',
      type: orderType,
      requested_qty: qty,
      execution_price: price,
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
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'16px 20px', background:C.white, border:`1px solid ${C.ink100}`, borderRadius:8 }}>
      <div>
        <div style={{ fontFamily:DISPLAY, fontWeight:700, fontSize:mobile?28:32, color:C.ink900, letterSpacing:'-0.02em' }}>{isLoading ? '…' : `$${price.toLocaleString()}`}</div>
        <div style={{ fontFamily:SANS, fontSize:13, color:stock?.pos?C.aqua600:C.red, marginTop:3 }}>
          {stock ? `${stock.pos?'+':''}${stock.change?.toFixed(2)} · ${stock.pos?'+':''}${stock.pct?.toFixed(1)}% today` : '—'}
        </div>
      </div>
      <div style={{ textAlign:'right' }}>
        <div style={{ fontFamily:SANS, fontSize:12, color:C.ink400 }}>{ticker} · {stock?.exchange ?? assetType}</div>
        <div style={{ marginTop:4, display:'flex', justifyContent:'flex-end' }}><MktStatus open={canExec}/></div>
      </div>
    </div>
  )

  const orderForm = (
    <>
      {!canExec && <MarketClosedBanner/>}

      <SageMsg text={canExec
        ? "Let's walk through this together. How many shares do you want? Even 1 is a great start."
        : "Markets are closed right now. Your market order will be queued and execute at the next opening price — which may differ from what you see today."
      }/>

      <div>
        <div style={{ fontFamily:SANS, fontSize:13, color:C.ink500, marginBottom:8 }}>Quantity</div>
        <QtyInputBlock qty={qty} setQty={setQty}/>
      </div>

      <div>
        <div style={{ fontFamily:SANS, fontSize:13, color:C.ink500, marginBottom:8 }}>Order type</div>
        <div style={{ display:'flex', gap:10 }}>
          <OrderTypeCard label="Market order" desc={canExec ? 'Execute now at current price' : 'Execute at next market open'} active={orderType==='MARKET'} onClick={() => setOrderType('MARKET')}/>
          <OrderTypeCard label="Limit order" desc="Only fill if price reaches your target" active={orderType==='LIMIT'} onClick={() => setOrderType('LIMIT')}/>
        </div>
        {orderType === 'MARKET' && (
          <div style={{ marginTop:10, display:'flex', gap:8 }}>
            <div style={{ width:20, height:20, borderRadius:'50%', background:C.aqua50, border:`1px solid ${C.aqua400}40`, display:'flex', alignItems:'center', justifyContent:'center', color:C.aqua400, fontSize:11, flexShrink:0 }}>◇</div>
            <div style={{ fontFamily:SANS, fontSize:12, color:C.ink500, lineHeight:1.5, fontStyle:'italic' }}>
              A <TermUnderline>market order</TermUnderline> fills immediately. The final price may vary slightly (<TermUnderline>slippage</TermUnderline>).
            </div>
          </div>
        )}
        {orderType === 'LIMIT' && (
          <>
            <input
              type="number"
              value={limitPrice}
              onChange={e => setLimitPrice(e.target.value)}
              placeholder={`Max price (current: $${price})`}
              style={{ marginTop:8, height:44, width:'100%', border:`1px solid ${C.ame400}`, borderRadius:4, padding:'0 14px', fontFamily:SANS, fontSize:14, color:C.ink900, outline:'none', background:C.white, boxSizing:'border-box' }}
            />
            <TifToggle tif={tif} setTif={setTif}/>
          </>
        )}
      </div>

      <div style={{ background:C.white, border:`1px solid ${C.ink100}`, borderRadius:8, padding:'0 20px' }}>
        <div style={{ padding:'12px 0 4px' }}><Eyebrow>Order summary</Eyebrow></div>
        <ReceiptRow label={`${qty} shares × $${price}`} value={`$${total}`}/>
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
        disabled={cashBalance != null && cashBalance < parseFloat(grandTotal)}
        onClick={handleBuy}
      />
      {cashAfter !== null && (
        <div style={{ fontFamily:SANS, fontSize:12, color:C.ink400, textAlign:'center', marginTop:10 }}>
          Cash after: ${cashAfter} available
        </div>
      )}
    </>
  )

  // ── Mobile: single column + fixed CTA footer ───────────────────────────────
  if (mobile) {
    const footer = (
      <div style={{ background:C.white, borderTop:`1px solid ${C.ink100}`, padding:'12px 16px 20px' }}>
        {buyCTA}
      </div>
    )
    return (
      <AppShell active="portfolio" footer={footer}>
        <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <div onClick={() => navigate(-1)} style={{ fontFamily:SANS, fontSize:14, color:C.ame400, cursor:'pointer' }}>← Back</div>
            <div style={{ flex:1, textAlign:'center', fontFamily:SANS, fontWeight:700, fontSize:17, color:C.ink900 }}>Buy {ticker}</div>
            <div style={{ width:40 }}/>
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
      <div style={{ display:'flex', gap:32, alignItems:'flex-start' }}>
        <div style={{ width:480, flexShrink:0, display:'flex', flexDirection:'column', gap:24 }}>
          <div>
            <div onClick={() => navigate(-1)} style={{ fontFamily:SANS, fontSize:13, color:C.ame400, cursor:'pointer', marginBottom:8 }}>← Back</div>
            <div style={{ fontFamily:DISPLAY, fontWeight:700, fontSize:32, color:C.ink900, letterSpacing:'-0.02em', lineHeight:1 }}>Buy {ticker}</div>
          </div>
          {priceCard}
          {orderForm}
          <div>{buyCTA}</div>
        </div>

        <div style={{ flex:1, minWidth:0, display:'flex', flexDirection:'column', gap:24, position:'sticky', top:28 }}>
          <Eyebrow>{stock?.name ?? ticker} — {ticker}</Eyebrow>
          <div style={{ background:C.white, border:`1px solid ${C.ink100}`, borderRadius:8, padding:'20px 24px' }}>
            <MiniChart candles={candles} isLoading={candlesLoading} isError={candlesError}/>
          </div>
          <SageMsg text={`You're buying ${qty} shares — a solid start. If you're unsure about the quantity, you can always buy more later.`}/>
        </div>
      </div>
    </AppShell>
  )
}

function MarketClosedBanner() {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 14px', background:C.goldBg, border:`1px solid ${C.gold}30`, borderRadius:4 }}>
      <div style={{ width:6, height:6, borderRadius:'50%', background:C.gold, flexShrink:0 }}/>
      <div style={{ fontFamily:SANS, fontSize:13, color:C.gold }}>Markets closed · Order will execute at next market open</div>
    </div>
  )
}

function QtyInputBlock({ qty, setQty }) {
  return (
    <div style={{ border:`1.5px solid ${C.ame400}`, borderRadius:4, height:56, display:'flex', alignItems:'center', padding:'0 16px', background:C.white, boxShadow:`0 0 0 3px ${C.ame400}18`, justifyContent:'space-between' }}>
      <div style={{ fontFamily:SANS, fontSize:11, color:C.ame400, fontWeight:600, letterSpacing:'0.12em', textTransform:'uppercase' }}>Shares</div>
      <input
        type="number"
        min="0.01"
        step="0.01"
        value={qty}
        onChange={e => {
          const v = parseFloat(e.target.value)
          if (!isNaN(v) && v > 0) setQty(v)
          else if (e.target.value === '') setQty('')
        }}
        onBlur={e => { if (!e.target.value || parseFloat(e.target.value) <= 0) setQty(1) }}
        style={{ fontFamily:DISPLAY, fontWeight:700, fontSize:28, color:C.ink900, letterSpacing:'-0.02em', border:'none', outline:'none', background:'transparent', textAlign:'right', width:120 }}
      />
    </div>
  )
}

export function TifToggle({ tif, setTif }) {
  return (
    <div style={{ marginTop:8, display:'flex', alignItems:'center', gap:8 }}>
      <div style={{ fontFamily:SANS, fontSize:12, color:C.ink400 }}>Good until</div>
      {[['GTC','Cancelled'], ['DAY','End of day']].map(([val, label]) => (
        <div key={val} onClick={() => setTif(val)} style={{ padding:'3px 10px', border:`1px solid ${tif===val?C.ame400:C.ink100}`, borderRadius:999, background:tif===val?C.ame50:C.white, fontFamily:SANS, fontSize:12, fontWeight:tif===val?600:400, color:tif===val?C.ame600:C.ink500, cursor:'pointer', userSelect:'none' }}>
          {label}
        </div>
      ))}
    </div>
  )
}

export function OrderTypeCard({ label, desc, active, onClick }) {
  return (
    <div onClick={onClick} style={{ flex:1, padding:'12px 14px', border:`${active?2:1}px solid ${active?C.ame400:C.ink100}`, borderRadius:4, background:active?C.ame50:C.white, cursor:'pointer' }}>
      <div style={{ fontFamily:SANS, fontSize:14, fontWeight:active?700:500, color:active?C.ame600:C.ink700, marginBottom:3 }}>{label}</div>
      <div style={{ fontFamily:SANS, fontSize:12, color:active?C.ame400:C.ink400, lineHeight:1.4 }}>{desc}</div>
    </div>
  )
}
