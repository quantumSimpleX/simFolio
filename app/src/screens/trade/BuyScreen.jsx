import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { C, SANS, DISPLAY } from '../../tokens'
import { StatusBar, CTA, Eyebrow, TermUnderline, MktStatus, ReceiptRow } from '../../components/Primitives'
import { TopNav } from '../../components/Nav'
import { SageMsg } from '../../components/HeroMessage'
import { MiniChart } from '../../components/Charts'
import { useStockDetail, useCandles } from '../../hooks/useStockDetail'
import { usePlaceOrder } from '../../hooks/usePlaceOrder'
import { isMarketOpen } from '../../hooks/useQuotes'
import { usePortfolio } from '../../hooks/usePortfolio'

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
  const [qty, setQty] = useState(1)
  const [orderType, setOrderType] = useState('MARKET')
  const [limitPrice, setLimitPrice] = useState('')

  const { data: stock, isLoading } = useStockDetail(ticker)
  const { data: candles, isLoading: candlesLoading, isError: candlesError } = useCandles(ticker, '1M')
  const { cashBalance } = usePortfolio()
  const { mutate: placeOrder, isPending } = usePlaceOrder()
  const marketOpen = isMarketOpen()
  const assetType = detectAssetType(ticker)

  const price = stock?.price ?? 0
  const total = (qty * price).toFixed(2)
  const fee = 0.01
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
      ...(orderType === 'LIMIT' && limitPrice ? { limit_price: parseFloat(limitPrice) } : {}),
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

  const isMobile = window.innerWidth < 1024

  if (!isMobile) return (
    <BuyDesktop
      ticker={ticker} stock={stock} isLoading={isLoading} candles={candles} candlesLoading={candlesLoading} candlesError={candlesError}
      qty={qty} setQty={setQty}
      orderType={orderType} setOrderType={setOrderType}
      limitPrice={limitPrice} setLimitPrice={setLimitPrice}
      marketOpen={marketOpen} navigate={navigate}
      total={total} grandTotal={grandTotal} cashAfter={cashAfter}
      handleBuy={handleBuy} isPending={isPending} cashBalance={cashBalance}
    />
  )

  return (
    <div style={{ width:390, minHeight:844, background:C.paper, display:'flex', flexDirection:'column' }}>
      <StatusBar/>
      <div style={{ padding:'0 24px 14px', display:'flex', alignItems:'center', gap:14, borderBottom:`1px solid ${C.ink100}`, flexShrink:0 }}>
        <div onClick={() => navigate(-1)} style={{ fontFamily:SANS, fontSize:14, color:C.ame400, cursor:'pointer' }}>← Back</div>
        <div style={{ flex:1, textAlign:'center', fontFamily:SANS, fontWeight:700, fontSize:17, color:C.ink900 }}>Buy {ticker}</div>
        <div style={{ width:40 }}/>
      </div>

      <div style={{ padding:'14px 24px', borderBottom:`1px solid ${C.ink100}`, display:'flex', justifyContent:'space-between', alignItems:'center', flexShrink:0, background:C.white }}>
        <div>
          <div style={{ fontFamily:DISPLAY, fontWeight:700, fontSize:28, color:C.ink900, letterSpacing:'-0.02em' }}>
            {isLoading ? '…' : `$${price.toLocaleString()}`}
          </div>
          <div style={{ fontFamily:SANS, fontSize:13, color:stock?.pos?C.aqua600:C.red, marginTop:2 }}>
            {stock ? `${stock.pos?'+':''}${stock.change} · ${stock.pos?'+':''}${stock.pct}% today` : '—'}
          </div>
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{ fontFamily:SANS, fontSize:12, color:C.ink400 }}>{ticker} · {stock?.exchange ?? assetType}</div>
          <div style={{ marginTop:4 }}><MktStatus open={marketOpen || assetType === 'CRYPTO'}/></div>
        </div>
      </div>

      <div style={{ flex:1, padding:'20px 24px', display:'flex', flexDirection:'column', gap:18, overflowY:'auto' }}>
        {!(marketOpen || assetType === 'CRYPTO') && <MarketClosedBanner/>}

        <SageMsg text={(marketOpen || assetType === 'CRYPTO')
          ? "Let's walk through this together. How many shares do you want? Even 1 is a great start."
          : "Markets are closed right now. Your market order will be queued and execute at the next opening price — which may differ from what you see today."
        }/>

        <QtyInputBlock qty={qty} setQty={setQty}/>

        <div>
          <div style={{ fontFamily:SANS, fontSize:13, color:C.ink500, marginBottom:8 }}>Order type</div>
          <div style={{ display:'flex', gap:8 }}>
            <OrderTypeCard label="Market order" desc={(marketOpen || assetType==='CRYPTO') ? 'Execute now at current price' : 'Execute at next market open'} active={orderType==='MARKET'} onClick={() => setOrderType('MARKET')}/>
            <OrderTypeCard label="Limit order" desc="Set a guaranteed max price" active={orderType==='LIMIT'} onClick={() => setOrderType('LIMIT')}/>
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
            <input
              type="number"
              value={limitPrice}
              onChange={e => setLimitPrice(e.target.value)}
              placeholder={`Max price (current: $${price})`}
              style={{ marginTop:8, height:44, width:'100%', border:`1px solid ${C.ame400}`, borderRadius:4, padding:'0 14px', fontFamily:SANS, fontSize:14, color:C.ink900, outline:'none', background:C.white, boxSizing:'border-box' }}
            />
          )}
        </div>

        <div style={{ background:C.white, border:`1px solid ${C.ink100}`, borderRadius:8, padding:'0 16px' }}>
          <ReceiptRow label={`${qty} shares × $${price}`} value={`$${total}`}/>
          <ReceiptRow label={<TermUnderline>Regulatory fee</TermUnderline>} value={`$${fee}`}/>
          <ReceiptRow label={(marketOpen || assetType==='CRYPTO') ? 'Total' : 'Total (estimated)'} value={(marketOpen || assetType==='CRYPTO') ? `$${grandTotal}` : `~$${grandTotal}`} bold/>
        </div>
      </div>

      <div style={{ padding:'14px 24px 32px', borderTop:`1px solid ${C.ink100}`, flexShrink:0 }}>
        <CTA
          label={(marketOpen || assetType==='CRYPTO') ? `Buy ${qty} ${ticker}  →` : `Queue order for next open  →`}
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
      </div>
    </div>
  )
}

function BuyDesktop({ ticker, stock, isLoading, candles, candlesLoading, candlesError, qty, setQty, orderType, setOrderType, limitPrice, setLimitPrice, marketOpen, navigate, total, grandTotal, cashAfter, handleBuy, isPending, cashBalance }) {
  const price = stock?.price ?? 0
  const assetType = detectAssetType(ticker)
  const canExec = marketOpen || assetType === 'CRYPTO'

  return (
    <div style={{ width:1440, minHeight:900, background:C.paper, display:'flex', flexDirection:'column' }}>
      <TopNav active="portfolio"/>
      <div style={{ flex:1, display:'flex', minHeight:0 }}>
        <div style={{ width:520, padding:'40px 48px', display:'flex', flexDirection:'column', gap:24, borderRight:`1px solid ${C.ink100}`, overflowY:'auto' }}>
          <div>
            <div onClick={() => navigate(-1)} style={{ fontFamily:SANS, fontSize:13, color:C.ame400, cursor:'pointer', marginBottom:8 }}>← Back to portfolio</div>
            <div style={{ fontFamily:DISPLAY, fontWeight:700, fontSize:32, color:C.ink900, letterSpacing:'-0.02em', lineHeight:1 }}>Buy {ticker}</div>
          </div>

          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'16px 20px', background:C.white, border:`1px solid ${C.ink100}`, borderRadius:8 }}>
            <div>
              <div style={{ fontFamily:DISPLAY, fontWeight:700, fontSize:32, color:C.ink900, letterSpacing:'-0.02em' }}>{isLoading ? '…' : `$${price.toLocaleString()}`}</div>
              <div style={{ fontFamily:SANS, fontSize:13, color:stock?.pos?C.aqua600:C.red, marginTop:3 }}>
                {stock ? `${stock.pos?'+':''}${stock.change} · ${stock.pos?'+':''}${stock.pct}% today` : '—'}
              </div>
            </div>
            <MktStatus open={canExec}/>
          </div>

          {!canExec && <MarketClosedBanner/>}

          <div>
            <div style={{ fontFamily:SANS, fontSize:13, color:C.ink500, marginBottom:8 }}>Quantity</div>
            <QtyInputBlock qty={qty} setQty={setQty}/>
          </div>

          <div>
            <div style={{ fontFamily:SANS, fontSize:13, color:C.ink500, marginBottom:8 }}>Order type</div>
            <div style={{ display:'flex', gap:10 }}>
              <OrderTypeCard label="Market order" desc="Execute immediately at current price" active={orderType==='MARKET'} onClick={() => setOrderType('MARKET')}/>
              <OrderTypeCard label="Limit order" desc="Only fill if price reaches your target" active={orderType==='LIMIT'} onClick={() => setOrderType('LIMIT')}/>
            </div>
            {orderType === 'LIMIT' && (
              <input
                type="number"
                value={limitPrice}
                onChange={e => setLimitPrice(e.target.value)}
                placeholder={`Max price (current: $${price})`}
                style={{ marginTop:8, height:44, width:'100%', border:`1px solid ${C.ame400}`, borderRadius:4, padding:'0 14px', fontFamily:SANS, fontSize:14, color:C.ink900, outline:'none', background:C.white, boxSizing:'border-box' }}
              />
            )}
          </div>

          <div style={{ background:C.white, border:`1px solid ${C.ink100}`, borderRadius:8, padding:'0 20px' }}>
            <div style={{ padding:'12px 0 4px' }}><Eyebrow>Order summary</Eyebrow></div>
            <ReceiptRow label={`${qty} shares × $${price}`} value={`$${total}`}/>
            <ReceiptRow label={<TermUnderline>Regulatory fee</TermUnderline>} value="$0.01"/>
            <ReceiptRow label="Total" value={`$${grandTotal}`} bold/>
          </div>

          <CTA
            label={canExec ? `Buy ${qty} ${ticker}  →` : `Queue order  →`}
            full
            loading={isPending}
            disabled={cashBalance != null && cashBalance < parseFloat(grandTotal)}
            onClick={handleBuy}
          />
          {cashAfter !== null && (
            <div style={{ fontFamily:SANS, fontSize:12, color:C.ink400, textAlign:'center' }}>Cash after: ${cashAfter}</div>
          )}
        </div>

        <div style={{ flex:1, padding:'40px 48px', display:'flex', flexDirection:'column', gap:24, overflowY:'auto' }}>
          <Eyebrow>{stock?.name ?? ticker} — {ticker}</Eyebrow>
          <div style={{ background:C.white, border:`1px solid ${C.ink100}`, borderRadius:8, padding:'20px 24px' }}>
            <MiniChart candles={candles} isLoading={candlesLoading} isError={candlesError}/>
          </div>
          <SageMsg text={`You're buying ${qty} shares — a solid start. If you're unsure about the quantity, you can always buy more later.`}/>
        </div>
      </div>
    </div>
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

function OrderTypeCard({ label, desc, active, onClick }) {
  return (
    <div onClick={onClick} style={{ flex:1, padding:'12px 14px', border:`${active?2:1}px solid ${active?C.ame400:C.ink100}`, borderRadius:4, background:active?C.ame50:C.white, cursor:'pointer' }}>
      <div style={{ fontFamily:SANS, fontSize:14, fontWeight:active?700:500, color:active?C.ame600:C.ink700, marginBottom:3 }}>{label}</div>
      <div style={{ fontFamily:SANS, fontSize:12, color:active?C.ame400:C.ink400, lineHeight:1.4 }}>{desc}</div>
    </div>
  )
}
