import { useLocation, useNavigate } from 'react-router-dom'
import { C, SANS, DISPLAY } from '../../tokens'
import { CTA, Eyebrow, TermUnderline } from '../../components/Primitives'
import { AppShell } from '../../components/AppShell'
import { usePortfolio } from '../../hooks/usePortfolio'
import { TRANSACTION_FEE } from '../../lib/fees'

export default function TradeReceipt() {
  const navigate = useNavigate()
  const { state } = useLocation()
  const { cashBalance } = usePortfolio()

  const result   = state?.result ?? {}
  const ticker   = state?.ticker ?? '—'
  const qty      = state?.qty ?? 0
  const isSell   = state?.side === 'sell'
  const isQueued = result.status === 'QUEUED'
  const pnl      = state?.pnl
  const pnlPositive = state?.pnlPositive

  const execPrice = result.execution_price ?? 0
  const marketPrice = result.market_price ?? execPrice
  const hasSlippage = !isSell && execPrice && marketPrice && Math.abs(execPrice - marketPrice) > 0.01
  const slippageAmt = hasSlippage ? Math.abs(execPrice - marketPrice) * qty : 0

  const fee   = result.fee ?? TRANSACTION_FEE
  const total = (qty * execPrice).toFixed(2)
  const net   = isSell ? (qty * execPrice - fee).toFixed(2) : (qty * execPrice + fee).toFixed(2)

  const ts = new Date().toLocaleString('en-US', { weekday:'short', hour:'numeric', minute:'2-digit', hour12:true, timeZone:'America/New_York' }) + ' EST'

  return (
    <AppShell active="portfolio">
      <div style={{ maxWidth:560, margin:'0 auto', display:'flex', flexDirection:'column', gap:20 }}>
        <div style={{ textAlign:'center', padding:'8px 0' }}>
          <div style={{ width:48, height:48, borderRadius:'50%', background:isQueued?C.goldBg:isSell?C.redBg:C.aqua50, border:`2px solid ${isQueued?C.gold:isSell?C.red:C.aqua400}`, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 12px', fontFamily:SANS, fontSize:22, color:isQueued?C.gold:isSell?C.red:C.aqua400 }}>
            {isQueued ? '⏳' : '✓'}
          </div>
          <div style={{ fontFamily:DISPLAY, fontWeight:700, fontSize:28, color:C.ink900, letterSpacing:'-0.02em' }}>
            {isQueued ? 'Order queued' : isSell ? 'Sold' : 'Order filled'}
          </div>
          <div style={{ fontFamily:SANS, fontSize:14, color:C.ink400, marginTop:4 }}>{ts}</div>
        </div>

        <div style={{ background:C.white, border:`1px solid ${C.ink100}`, borderRadius:8, padding:'4px 20px 12px' }}>
          <div style={{ padding:'12px 0 6px' }}><Eyebrow>Transaction receipt</Eyebrow></div>
          {isSell ? (
            <>
              <ReceiptRow label="Sold" value={`${qty} shares of ${ticker}`}/>
              <ReceiptRow label="Executed at" value={`$${execPrice.toFixed(2)} / share`}/>
              <ReceiptRow label="Gross proceeds" value={`$${total}`}/>
              {pnl != null && (
                <ReceiptRow
                  label={<TermUnderline>{pnlPositive ? 'Realised gain' : 'Realised loss'}</TermUnderline>}
                  value={`${pnlPositive?'+':'−'}$${Math.abs(pnl).toFixed(2)}`}
                  valueColor={pnlPositive?C.aqua600:C.red}
                />
              )}
              <ReceiptRow label={<TermUnderline>Transaction fee</TermUnderline>} value={`−$${fee.toFixed(2)}`}/>
              <ReceiptRow label="Net to cash" value={`$${net}`} bold/>
            </>
          ) : isQueued ? (
            <>
              <ReceiptRow label="Queued" value={`Buy ${qty} ${ticker}`}/>
              <ReceiptRow label="Order type" value="Market order"/>
              <ReceiptRow label="Executes" value="Next market open (9:30 AM EST)" bold/>
            </>
          ) : (
            <>
              <ReceiptRow label="Bought" value={`${qty} shares of ${ticker}`}/>
              <ReceiptRow label="Executed at" value={`$${execPrice.toFixed(2)} / share`}/>
              <ReceiptRow label="Gross cost" value={`$${total}`}/>
              {hasSlippage && (
                <ReceiptRow
                  label={<TermUnderline>Slippage</TermUnderline>}
                  value={`−$${slippageAmt.toFixed(2)} vs. order price`}
                  valueColor={C.gold}
                />
              )}
              {result.spread_component > 0 && (
                <ReceiptRow
                  label={<TermUnderline>Bid-ask spread</TermUnderline>}
                  value={`$${(result.spread_component * qty).toFixed(2)} (${result.spread_bps ?? '—'} bps)`}
                  valueColor={C.gold}
                />
              )}
              <ReceiptRow label={<TermUnderline>Transaction fee</TermUnderline>} value={`$${fee.toFixed(2)}`}/>
              <ReceiptRow label="Net deducted" value={`$${net}`} bold/>
            </>
          )}
        </div>

        {hasSlippage && (
          <div style={{ background:C.goldBg, border:`1px solid ${C.gold}30`, borderRadius:8, padding:'12px 16px', display:'flex', gap:10 }}>
            <div style={{ width:24, height:24, borderRadius:'50%', background:C.aqua50, border:`1.5px solid ${C.aqua400}40`, display:'flex', alignItems:'center', justifyContent:'center', color:C.aqua400, fontSize:11, flexShrink:0 }}>◇</div>
            <div>
              <div style={{ fontFamily:SANS, fontSize:12, fontWeight:600, color:C.gold, letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:4 }}>Why is the price different?</div>
              <div style={{ fontFamily:SANS, fontSize:13, color:C.ink600, lineHeight:1.5 }}>
                Your order price was ${marketPrice.toFixed(2)}. The executed price was ${execPrice.toFixed(2)} — this small difference is called <TermUnderline>slippage</TermUnderline>. A limit order would have protected you.
              </div>
            </div>
          </div>
        )}

        {isSell && (
          <div style={{ display:'flex', gap:10, alignItems:'flex-start', padding:'12px 16px', background:C.ame50, border:`1px solid ${C.ame100}`, borderRadius:8 }}>
            <div style={{ width:28, height:28, borderRadius:'50%', background:`${C.ame400}12`, border:`1.5px solid ${C.ame400}35`, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:SANS, fontWeight:700, fontSize:10, color:C.ame400, flexShrink:0 }}>WB</div>
            <div>
              <div style={{ fontFamily:SANS, fontSize:12, fontWeight:600, color:C.ame600, marginBottom:3 }}>Warren on this trade</div>
              <div style={{ fontFamily:SANS, fontSize:13, color:C.ink600, lineHeight:1.5, fontStyle:'italic' }}>"A loss can be the right decision. What changed your mind? Understanding your own reasoning is more valuable than the money."</div>
              <div onClick={() => navigate('/ask')} style={{ fontFamily:SANS, fontSize:12, color:C.ame400, marginTop:6, cursor:'pointer' }}>Add a reflection note →</div>
            </div>
          </div>
        )}

        {cashBalance != null && (
          <div style={{ display:'flex', justifyContent:'space-between', padding:'0 4px' }}>
            <div style={{ fontFamily:SANS, fontSize:14, color:C.ink500 }}>Cash remaining</div>
            <div style={{ fontFamily:SANS, fontSize:14, fontWeight:700, color:C.ink900 }}>${cashBalance.toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 })}</div>
          </div>
        )}

        <div style={{ display:'flex', flexDirection:'column', gap:10, marginTop:4 }}>
          {!isSell && !isQueued && (
            <CTA label="Continue to portfolio  →" full onClick={() => navigate('/hero-handoff')}/>
          )}
          {(isSell || isQueued) && (
            <CTA label="Back to portfolio  →" full onClick={() => navigate('/portfolio')}/>
          )}
        </div>
      </div>
    </AppShell>
  )
}

function ReceiptRow({ label, value, valueColor, bold }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:`1px solid ${C.ink100}` }}>
      <div style={{ fontFamily:SANS, fontSize:14, color:C.ink500 }}>{label}</div>
      <div style={{ fontFamily:SANS, fontSize:14, fontWeight:bold?700:500, color:valueColor||C.ink700 }}>{value}</div>
    </div>
  )
}
