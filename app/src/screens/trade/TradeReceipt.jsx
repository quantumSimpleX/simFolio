import { useLocation, useNavigate } from 'react-router-dom'
import { cn, shares } from '../../lib/utils'
import { C } from '../../tokens'
import { CTA, Eyebrow, TermUnderline, ReceiptRow } from '../../components/Primitives'
import { AppShell } from '../../components/AppShell'
import { usePortfolio } from '../../hooks/usePortfolio'
import { useTrack } from '../../gamification/useGamification'
import { TRANSACTION_FEE } from '../../lib/fees'

export default function TradeReceipt() {
  const navigate = useNavigate()
  const track = useTrack()
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

  const statusRing = isQueued ? 'border-gold bg-goldBg text-gold' : isSell ? 'border-red bg-redBg text-red' : 'border-aqua-400 bg-aqua-50 text-aqua-400'

  return (
    <AppShell active="portfolio">
      <div className="mx-auto flex max-w-[560px] flex-col gap-5">
        <div className="py-2 text-center">
          <div className={cn('mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-pill border-2', statusRing)}>
            {isQueued ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 22h14M5 2h14M17 22v-4.17a2 2 0 0 0-.59-1.42L12 12l-4.41 4.41A2 2 0 0 0 7 17.83V22M7 2v4.17a2 2 0 0 0 .59 1.42L12 12l4.41-4.41A2 2 0 0 0 17 6.17V2"/>
              </svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 6 9 17l-5-5"/>
              </svg>
            )}
          </div>
          <h1 className="font-sans text-[28px] font-bold tracking-[-0.02em] text-ink-900">
            {isQueued ? 'Order queued' : isSell ? 'Sold' : 'Order filled'}
          </h1>
          <div className="mt-1 font-mono text-sm text-ink-400">{ts}</div>
        </div>

        <div className="rounded-card border border-ink-100 bg-white px-5 pb-3 pt-1">
          <div className="pb-1.5 pt-3"><Eyebrow>Transaction receipt</Eyebrow></div>
          {isSell ? (
            <>
              <ReceiptRow label="Sold" value={`${shares(qty)} of ${ticker}`}/>
              <ReceiptRow label={<TermUnderline>Executed at</TermUnderline>} value={`$${execPrice.toFixed(2)} / share`} mono/>
              <ReceiptRow label={<TermUnderline>Gross proceeds</TermUnderline>} value={`$${total}`} mono/>
              {pnl != null && (
                <ReceiptRow
                  label={<TermUnderline>{pnlPositive ? 'Realised gain' : 'Realised loss'}</TermUnderline>}
                  value={`${pnlPositive?'+':'−'}$${Math.abs(pnl).toFixed(2)}`}
                  valueColor={pnlPositive ? C.aqua600 : C.red}
                  mono
                />
              )}
              <ReceiptRow label={<TermUnderline>Transaction fee</TermUnderline>} value={`−$${fee.toFixed(2)}`} mono/>
              <ReceiptRow label={<TermUnderline>Net to cash</TermUnderline>} value={`$${net}`} bold mono/>
            </>
          ) : isQueued ? (
            <>
              <ReceiptRow label="Queued" value={`Buy ${qty} ${ticker}`}/>
              <ReceiptRow label="Order type" value="Market order"/>
              <ReceiptRow label="Executes" value="Next market open (9:30 AM EST)" bold/>
            </>
          ) : (
            <>
              <ReceiptRow label="Bought" value={`${shares(qty)} of ${ticker}`}/>
              <ReceiptRow label={<TermUnderline>Executed at</TermUnderline>} value={`$${execPrice.toFixed(2)} / share`} mono/>
              <ReceiptRow label={<TermUnderline>Gross cost</TermUnderline>} value={`$${total}`} mono/>
              {hasSlippage && (
                <ReceiptRow
                  label={<TermUnderline>Slippage</TermUnderline>}
                  value={`−$${slippageAmt.toFixed(2)} vs. order price`}
                  valueColor="var(--gold)"
                  mono
                />
              )}
              {result.spread_component > 0 && (
                <ReceiptRow
                  label={<TermUnderline>Bid-ask spread</TermUnderline>}
                  value={`$${(result.spread_component * qty).toFixed(2)} (${result.spread_bps ?? '—'} bps)`}
                  valueColor="var(--gold)"
                  mono
                />
              )}
              <ReceiptRow label={<TermUnderline>Transaction fee</TermUnderline>} value={`$${fee.toFixed(2)}`} mono/>
              <ReceiptRow label={<TermUnderline>Net deducted</TermUnderline>} value={`$${net}`} bold mono/>
            </>
          )}
        </div>

        {hasSlippage && (
          <div className="flex gap-2.5 rounded-card border border-gold/30 bg-goldBg px-4 py-3">
            <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-pill border-[1.5px] border-aqua-400/40 bg-aqua-50 text-[11px] text-aqua-400">◇</div>
            <div>
              <div className="mb-1 font-sans text-xs font-semibold uppercase tracking-[0.14em] text-gold">Why is the price different?</div>
              <div className="font-sans text-[13px] leading-normal text-ink-600">
                Your order price was ${marketPrice.toFixed(2)}. The executed price was ${execPrice.toFixed(2)} — this small difference is called <TermUnderline>slippage</TermUnderline>. A limit order would have protected you.
              </div>
            </div>
          </div>
        )}

        {isSell && (
          <div className="flex items-start gap-2.5 rounded-card border border-ame-100 bg-ame-50 px-4 py-3">
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-pill border-[1.5px] border-ame-400/35 bg-ame-400/10 font-sans text-[10px] font-bold text-ame-400">WB</div>
            <div>
              <div className="mb-[3px] font-sans text-xs font-semibold text-ame-600">Warren on this trade</div>
              <div className="font-sans text-[13px] italic leading-normal text-ink-600">"A loss can be the right decision. What changed your mind? Understanding your own reasoning is more valuable than the money."</div>
              <div onClick={() => { track('sell.reflected', { ticker }); navigate('/ask') }} className="mt-1.5 cursor-pointer font-sans text-xs text-ame-400">Add a reflection note →</div>
            </div>
          </div>
        )}

        {cashBalance != null && (
          <div className="flex justify-between px-1">
            <div className="font-sans text-sm text-ink-500">Cash remaining</div>
            <div className="font-mono text-sm font-bold text-ink-900">${cashBalance.toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 })}</div>
          </div>
        )}

        <div className="mt-1 flex flex-col gap-2.5">
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
