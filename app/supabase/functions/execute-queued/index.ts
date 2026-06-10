import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const FINNHUB_KEY      = Deno.env.get('FINNHUB_API_KEY') ?? ''
const SUPABASE_URL     = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE_KEY = Deno.env.get('APP_SERVICE_ROLE_KEY') ?? ''

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function isMarketOpen() {
  const now = new Date()
  const et = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }))
  const day = et.getDay()
  if (day === 0 || day === 6) return false
  const h = et.getHours(), m = et.getMinutes()
  const mins = h * 60 + m
  return mins >= 9 * 60 + 30 && mins < 16 * 60
}

// Finnhub quote: c = current, o = today's open
async function getQuote(ticker: string): Promise<{ current: number; open: number }> {
  const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${FINNHUB_KEY}`)
  const q = await res.json()
  return { current: q.c ?? 0, open: q.o ?? 0 }
}

// True if the order was placed during today's market session (after 9:30 ET
// today). Such orders fill at the current price; orders placed while the
// market was closed fill at today's opening price.
function placedDuringTodaySession(createdAt: string): boolean {
  const fmt = (d: Date) => d.toLocaleString('en-US', { timeZone: 'America/New_York' })
  const created = new Date(fmt(new Date(createdAt)))
  const now = new Date(fmt(new Date()))
  if (created.toDateString() !== now.toDateString()) return false
  return created.getHours() * 60 + created.getMinutes() >= 9 * 60 + 30
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const authHeader = req.headers.get('Authorization') ?? ''
  const jwt = authHeader.replace('Bearer ', '')
  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
  const { data: { user }, error: authErr } = await adminClient.auth.getUser(jwt)
  if (authErr || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: cors })
  }
  const uid = user.id

  try {
    const marketOpen = isMarketOpen()

    const { data: queued } = await adminClient
      .from('orders')
      .select('*')
      .eq('user_id', uid)
      .eq('status', 'QUEUED')
      .order('created_at', { ascending: true })

    const results: unknown[] = []

    for (const order of queued ?? []) {
      const isCrypto = order.asset_type === 'CRYPTO'
      if (!marketOpen && !isCrypto) continue

      const qty = parseFloat(order.requested_qty)
      const { current, open } = await getQuote(order.ticker)

      // Market orders placed while the market was closed fill at the day's
      // opening price; everything else (crypto, limit, orders placed during
      // the session) fills at the current price.
      let basePrice: number
      if (order.type === 'LIMIT') {
        const limit = parseFloat(order.limit_price)
        const conditionMet = order.side === 'BUY' ? current > 0 && current <= limit : current >= limit
        if (!conditionMet) continue
        basePrice = current
      } else if (isCrypto || placedDuringTodaySession(order.created_at)) {
        basePrice = current
      } else {
        basePrice = open > 0 ? open : current
      }
      if (basePrice <= 0) continue

      // 0.01%–0.05% slippage — against the user on both sides
      const slippagePct = (Math.random() * 0.0004 + 0.0001) * (order.side === 'BUY' ? 1 : -1)
      const execPrice = parseFloat((basePrice * (1 + slippagePct)).toFixed(4))
      const cost = parseFloat((execPrice * qty).toFixed(4))
      // Flat commission per trade — must match TRANSACTION_FEE in src/lib/fees.js
      const fee = 1.00

      const { data: bal } = await adminClient
        .from('user_balances')
        .select('cash_balance')
        .eq('user_id', uid)
        .single()
      const cash = parseFloat(bal?.cash_balance ?? 0)

      if (order.side === 'BUY' && cash < cost + fee) {
        await adminClient.from('orders').update({ status: 'CANCELLED' }).eq('order_id', order.order_id)
        results.push({ order_id: order.order_id, ticker: order.ticker, status: 'CANCELLED', reason: 'Insufficient cash at execution' })
        continue
      }

      const { data: pos } = await adminClient
        .from('positions')
        .select('total_qty, average_cost_basis')
        .eq('user_id', uid)
        .eq('ticker', order.ticker)
        .single()

      if (order.side === 'SELL' && (!pos || parseFloat(pos.total_qty) < qty)) {
        await adminClient.from('orders').update({ status: 'CANCELLED' }).eq('order_id', order.order_id)
        results.push({ order_id: order.order_id, ticker: order.ticker, status: 'CANCELLED', reason: 'Insufficient shares at execution' })
        continue
      }

      const { error: execErr } = await adminClient
        .from('executions')
        .insert({ order_id: order.order_id, user_id: uid, filled_qty: qty, execution_price: execPrice, fees_deducted: fee })
      if (execErr) throw new Error(execErr.message)

      await adminClient.from('orders').update({ status: 'FILLED' }).eq('order_id', order.order_id)

      const delta = order.side === 'BUY' ? -(cost + fee) : (cost - fee)
      await adminClient
        .from('user_balances')
        .update({ cash_balance: cash + delta })
        .eq('user_id', uid)

      if (order.side === 'BUY') {
        if (pos) {
          const newQty = parseFloat(pos.total_qty) + qty
          const newCost = ((parseFloat(pos.average_cost_basis) * parseFloat(pos.total_qty)) + (execPrice * qty)) / newQty
          await adminClient.from('positions').update({ total_qty: newQty, average_cost_basis: newCost }).eq('user_id', uid).eq('ticker', order.ticker)
        } else {
          await adminClient.from('positions').insert({ user_id: uid, ticker: order.ticker, asset_type: order.asset_type, total_qty: qty, average_cost_basis: execPrice })
        }
      } else {
        const newQty = parseFloat(pos.total_qty) - qty
        if (newQty <= 0) {
          await adminClient.from('positions').delete().eq('user_id', uid).eq('ticker', order.ticker)
        } else {
          await adminClient.from('positions').update({ total_qty: newQty }).eq('user_id', uid).eq('ticker', order.ticker)
        }
      }

      results.push({
        order_id: order.order_id,
        ticker: order.ticker,
        status: 'FILLED',
        execution_price: execPrice,
        market_price: basePrice,
        slippage: Math.abs(execPrice - basePrice),
        filled_qty: qty,
        fee,
      })
    }

    return new Response(JSON.stringify({ market_open: marketOpen, executed: results }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
