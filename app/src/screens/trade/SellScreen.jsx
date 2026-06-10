import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { C, SANS, DISPLAY } from '../../tokens'
import { GhostCTA, Eyebrow, TermUnderline } from '../../components/Primitives'
import { AppShell } from '../../components/AppShell'
import { useIsMobile } from '../../hooks/useBreakpoint'
import { usePortfolio } from '../../hooks/usePortfolio'
import { usePlaceOrder } from '../../hooks/usePlaceOrder'

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

  const gross = (qty * price).toFixed(2)
  const pnl   = qty * price - qty * costBasis
  const pnlPositive = pnl >= 0
  const netToCash = (qty * price - 0.01).toFixed(2)

  function handleSell() {
    placeOrder({
      ticker,
      asset_type: detectAssetType(ticker),
      side: 'SELL',
      type: 'MARKET',
      requested_qty: qty,
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
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:16, padding:'80px 0' }}>
          <div style={{ fontFamily:SANS, fontSize:15, color:C.ink500 }}>You don't hold {ticker}</div>
          <div onClick={() => navigate(-1)} style={{ fontFamily:SANS, fontSize:14, color:C.ame400, cursor:'pointer' }}>← Go back</div>
        </div>
      </AppShell>
    )
  }

  const qtyChoices = Array.from({ length: Math.min(maxQty, 5) }, (_, i) => i + 1)

  const sellCTAs = (
    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
      <div onClick={!isPending ? handleSell : undefined} style={{ height:48, background:C.red, color:C.white, borderRadius:4, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:SANS, fontSize:15, fontWeight:600, cursor:isPending?'default':'pointer', opacity:isPending?0.6:1 }}>
        {isPending ? 'Selling…' : `Sell ${qty} ${ticker}  →`}
      </div>
      <GhostCTA label="Ask your council first" onClick={() => navigate('/ask')}/>
    </div>
  )

  const content = (
    <div style={{ display:'flex', flexDirection:'column', gap:18, maxWidth:mobile?undefined:560, margin:mobile?undefined:'0 auto', width:'100%' }}>
      <div style={{ display:'flex', alignItems:'center', gap:14 }}>
        <div onClick={() => navigate(-1)} style={{ fontFamily:SANS, fontSize:14, color:C.ame400, cursor:'pointer' }}>← Back</div>
        <div style={{ flex:1, textAlign:'center', fontFamily:SANS, fontWeight:700, fontSize:17, color:C.ink900 }}>Sell {ticker}</div>
        <div style={{ width:40 }}/>
      </div>

      <div style={{ padding:'14px 20px', background:C.white, border:`1px solid ${C.ink100}`, borderRadius:8 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ fontFamily:DISPLAY, fontWeight:700, fontSize:26, color:C.ink900, letterSpacing:'-0.02em' }}>${price.toFixed(2)}</div>
            <div style={{ fontFamily:SANS, fontSize:13, color:pos.changePct>=0?C.aqua600:C.red, marginTop:2 }}>
              {pos.change>=0?'+':''}{pos.change?.toFixed(2)} · {pos.changePct>=0?'+':''}{pos.changePct?.toFixed(1)}% today
            </div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontFamily:SANS, fontSize:12, color:C.ink400 }}>You own {maxQty} shares</div>
            <div style={{ fontFamily:SANS, fontSize:12, color:pnlPositive?C.aqua600:C.red, marginTop:2 }}>
              Cost: ${costBasis.toFixed(2)} · {pnlPositive?'+':'−'}${Math.abs(pos.pnl).toFixed(2)} ({pnlPositive?'+':'−'}{Math.abs(pos.pct).toFixed(1)}%)
            </div>
          </div>
        </div>
      </div>

      <div style={{ display:'flex', gap:10, alignItems:'flex-start', padding:'12px 16px', background:C.ame50, border:`1px solid ${C.ame100}`, borderRadius:8 }}>
        <div style={{ width:28, height:28, borderRadius:'50%', background:`${C.ame400}12`, border:`1.5px solid ${C.ame400}35`, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:SANS, fontWeight:700, fontSize:10, color:C.ame400, flexShrink:0 }}>WB</div>
        <div style={{ flex:1 }}>
          <div style={{ fontFamily:SANS, fontSize:12, fontWeight:600, color:C.ame600, marginBottom:3 }}>Warren</div>
          <div style={{ fontFamily:SANS, fontSize:13, color:C.ink600, lineHeight:1.5, fontStyle:'italic' }}>
            "Fear is not a thesis. Has anything changed about {ticker} as a business — or just the price?"
          </div>
        </div>
      </div>

      <div>
        <div style={{ fontFamily:SANS, fontSize:13, color:C.ink500, marginBottom:8 }}>Shares to sell (of {maxQty})</div>
        <div style={{ border:`1.5px solid ${C.red}`, borderRadius:4, height:56, display:'flex', alignItems:'center', padding:'0 16px', background:C.white, justifyContent:'space-between' }}>
          <div style={{ fontFamily:SANS, fontSize:11, color:C.red, fontWeight:600, letterSpacing:'0.12em', textTransform:'uppercase' }}>Shares</div>
          <div style={{ fontFamily:DISPLAY, fontWeight:700, fontSize:28, color:C.ink900, letterSpacing:'-0.02em' }}>{qty}</div>
        </div>
        <div style={{ display:'flex', gap:8, marginTop:8 }}>
          {qtyChoices.map(n => (
            <div key={n} onClick={() => setQty(n)} style={{ flex:1, height:36, border:`1px solid ${qty===n?C.red:C.ink100}`, borderRadius:4, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:SANS, fontSize:13, color:qty===n?C.red:C.ink500, background:qty===n?C.redBg:C.white, cursor:'pointer', fontWeight:qty===n?600:400 }}>
              {n === maxQty ? `All ${n}` : n}
            </div>
          ))}
          {maxQty > 5 && (
            <div onClick={() => setQty(maxQty)} style={{ flex:1, height:36, border:`1px solid ${qty===maxQty?C.red:C.ink100}`, borderRadius:4, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:SANS, fontSize:13, color:qty===maxQty?C.red:C.ink500, background:qty===maxQty?C.redBg:C.white, cursor:'pointer', fontWeight:qty===maxQty?600:400 }}>All</div>
          )}
        </div>
      </div>

      <div style={{ background:C.white, border:`1px solid ${C.ink100}`, borderRadius:8, padding:'0 16px' }}>
        <div style={{ padding:'10px 0 4px' }}><Eyebrow>Sale preview</Eyebrow></div>
        <ReceiptRow label={`${qty} shares × $${price.toFixed(2)}`} value={`$${gross}`}/>
        <ReceiptRow label={<TermUnderline>Regulatory fee</TermUnderline>} value="−$0.01"/>
        <ReceiptRow
          label={<TermUnderline>{pnlPositive ? 'Realised gain' : 'Realised loss'}</TermUnderline>}
          value={`${pnlPositive?'+':'−'}$${Math.abs(pnl).toFixed(2)}`}
          valueColor={pnlPositive?C.aqua600:C.red}
        />
        <ReceiptRow label="Net to cash" value={`$${netToCash}`} bold/>
      </div>

      {!mobile && sellCTAs}
    </div>
  )

  if (mobile) {
    const footer = (
      <div style={{ background:C.white, borderTop:`1px solid ${C.ink100}`, padding:'12px 16px 20px' }}>
        {sellCTAs}
      </div>
    )
    return <AppShell active="portfolio" footer={footer}>{content}</AppShell>
  }

  return <AppShell active="portfolio">{content}</AppShell>
}

function ReceiptRow({ label, value, valueColor, bold }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom:`1px solid ${C.ink100}` }}>
      <div style={{ fontFamily:SANS, fontSize:14, color:C.ink500 }}>{label}</div>
      <div style={{ fontFamily:SANS, fontSize:14, fontWeight:bold?700:500, color:valueColor||C.ink700 }}>{value}</div>
    </div>
  )
}
