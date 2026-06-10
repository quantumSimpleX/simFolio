import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const FINNHUB_KEY     = Deno.env.get('FINNHUB_API_KEY') ?? ''
const SUPABASE_URL    = Deno.env.get('SUPABASE_URL') ?? ''
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

async function getLivePrice(ticker: string): Promise<number> {
  const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${FINNHUB_KEY}`)
  const q = await res.json()
  return q.c ?? 0
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const authHeader = req.headers.get('Authorization') ?? ''
  const userClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  })

  // Resolve the user from the JWT
  const jwt = authHeader.replace('Bearer ', '')
  const { data: { user }, error: authErr } = await createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
    .auth.getUser(jwt)
  if (authErr || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: cors })
  }
  const uid = user.id

  try {
    const body = await req.json()
    const { ticker, asset_type, side, type: orderType, requested_qty, limit_price } = body

    // Insert order as QUEUED
    const { data: order, error: orderErr } = await userClient
      .from('orders')
      .insert({ user_id: uid, ticker, asset_type, side, type: orderType, requested_qty, limit_price, status: 'QUEUED' })
      .select()
      .single()
    if (orderErr) throw new Error(orderErr.message)

    const marketOpen = isMarketOpen() || asset_type === 'CRYPTO'

    if (orderType === 'MARKET' && marketOpen) {
      // Execute immediately
      const rawPrice = await getLivePrice(ticker)
      // Inject 0.01%–0.05% slippage for buys; negative for sells
      const slippagePct = (Math.random() * 0.0004 + 0.0001) * (side === 'BUY' ? 1 : -1)
      const execPrice = parseFloat((rawPrice * (1 + slippagePct)).toFixed(4))
      const cost = parseFloat((execPrice * requested_qty).toFixed(4))
      // Flat commission per trade — must match TRANSACTION_FEE in src/lib/fees.js
      const fee = 1.00

      // Verify cash balance for buys
      const { data: bal } = await userClient
        .from('user_balances')
        .select('cash_balance')
        .eq('user_id', uid)
        .single()

      if (side === 'BUY' && bal.cash_balance < cost + fee) {
        throw new Error('Insufficient cash balance')
      }

      // Write execution
      const { error: execErr } = await userClient
        .from('executions')
        .insert({ order_id: order.order_id, user_id: uid, filled_qty: requested_qty, execution_price: execPrice, fees_deducted: fee })
      if (execErr) throw new Error(execErr.message)

      // Update order status
      await userClient.from('orders').update({ status: 'FILLED' }).eq('order_id', order.order_id)

      // Update cash balance
      const delta = side === 'BUY' ? -(cost + fee) : (cost - fee)
      await userClient
        .from('user_balances')
        .update({ cash_balance: bal.cash_balance + delta })
        .eq('user_id', uid)

      // Upsert position
      const { data: pos } = await userClient
        .from('positions')
        .select('total_qty, average_cost_basis')
        .eq('user_id', uid)
        .eq('ticker', ticker)
        .single()

      if (side === 'BUY') {
        if (pos) {
          const newQty = parseFloat(pos.total_qty) + requested_qty
          const newCost = ((parseFloat(pos.average_cost_basis) * parseFloat(pos.total_qty)) + (execPrice * requested_qty)) / newQty
          await userClient.from('positions').update({ total_qty: newQty, average_cost_basis: newCost }).eq('user_id', uid).eq('ticker', ticker)
        } else {
          await userClient.from('positions').insert({ user_id: uid, ticker, asset_type, total_qty: requested_qty, average_cost_basis: execPrice })
        }
      } else {
        if (pos) {
          const newQty = parseFloat(pos.total_qty) - requested_qty
          if (newQty <= 0) {
            await userClient.from('positions').delete().eq('user_id', uid).eq('ticker', ticker)
          } else {
            await userClient.from('positions').update({ total_qty: newQty }).eq('user_id', uid).eq('ticker', ticker)
          }
        }
      }

      return new Response(JSON.stringify({
        status: 'FILLED',
        order_id: order.order_id,
        execution_price: execPrice,
        filled_qty: requested_qty,
        slippage: Math.abs(execPrice - rawPrice),
        market_price: rawPrice,
        fee,
      }), { headers: { ...cors, 'Content-Type': 'application/json' } })
    }

    // Market closed or limit order — stays QUEUED
    return new Response(JSON.stringify({
      status: 'QUEUED',
      order_id: order.order_id,
    }), { headers: { ...cors, 'Content-Type': 'application/json' } })

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
