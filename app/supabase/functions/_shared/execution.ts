// Shared execution-realism helpers for place-order and execute-queued.

// NYSE full-day holidays, 2026 (ET dates). Early closes not modeled.
const MARKET_HOLIDAYS = new Set([
  '2026-01-01', // New Year's Day
  '2026-01-19', // MLK Day
  '2026-02-16', // Presidents' Day
  '2026-04-03', // Good Friday
  '2026-05-25', // Memorial Day
  '2026-06-19', // Juneteenth
  '2026-07-03', // Independence Day (observed)
  '2026-09-07', // Labor Day
  '2026-11-26', // Thanksgiving
  '2026-12-25', // Christmas
])

function etParts(d: Date) {
  const et = new Date(d.toLocaleString('en-US', { timeZone: 'America/New_York' }))
  const iso = `${et.getFullYear()}-${String(et.getMonth() + 1).padStart(2, '0')}-${String(et.getDate()).padStart(2, '0')}`
  return { et, iso }
}

export function isMarketOpen(): boolean {
  const { et, iso } = etParts(new Date())
  const day = et.getDay()
  if (day === 0 || day === 6) return false
  if (MARKET_HOLIDAYS.has(iso)) return false
  const mins = et.getHours() * 60 + et.getMinutes()
  return mins >= 9 * 60 + 30 && mins < 16 * 60
}

// True if the timestamp falls on a previous ET calendar day (used to expire DAY orders).
export function placedBeforeToday(createdAt: string): boolean {
  return etParts(new Date(createdAt)).iso < etParts(new Date()).iso
}

export interface LiquidityInfo {
  avgVolume: number   // shares/day; 0 if unknown
  high: number        // today's high; 0 if unknown
  low: number         // today's low; 0 if unknown
}

export interface ExecutionPricing {
  execPrice: number
  spreadAmt: number      // per-share cost of crossing the synthetic bid-ask spread
  slippageAmt: number    // per-share market-impact + volatility slippage
  spreadBps: number
  slippagePct: number
  participation: number  // order size as a fraction of average daily volume
}

const clamp = (lo: number, hi: number, v: number) => Math.min(hi, Math.max(lo, v))

// Realistic fill price: cross a liquidity-derived bid-ask spread (buys lift the
// ask, sells hit the bid), then add slippage scaled by intraday volatility and
// the order's share of average daily volume. Always against the user.
export function priceExecution(
  basePrice: number,
  side: 'BUY' | 'SELL',
  qty: number,
  liq: LiquidityInfo,
): ExecutionPricing {
  const dollarVol = liq.avgVolume > 0 ? basePrice * liq.avgVolume : 0
  // Mega-caps (~$10B/day) ≈ 2bps; thin names clamp at 25bps
  const spreadBps = dollarVol > 0
    ? clamp(1, 25, 1 + 100 / Math.sqrt(dollarVol / 1e6 + 1))
    : 10
  const halfSpreadPct = spreadBps / 2 / 10_000

  const volPct = liq.high > liq.low && basePrice > 0
    ? (liq.high - liq.low) / basePrice
    : 0.02
  const participation = liq.avgVolume > 0 ? qty / liq.avgVolume : 0.001
  const slippagePct = Math.min(
    0.01,
    (0.2 + Math.random() * 0.8) * volPct * 0.01 + 0.1 * Math.sqrt(participation),
  )

  const dir = side === 'BUY' ? 1 : -1
  const execPrice = parseFloat((basePrice * (1 + dir * (halfSpreadPct + slippagePct))).toFixed(4))
  return {
    execPrice,
    spreadAmt: parseFloat((basePrice * halfSpreadPct).toFixed(4)),
    slippageAmt: parseFloat((basePrice * slippagePct).toFixed(4)),
    spreadBps: parseFloat(spreadBps.toFixed(2)),
    slippagePct,
    participation,
  }
}

// Partial-fill model for limit orders: small orders (<0.1% of daily volume)
// fill completely; larger ones may only get 40–90% of the quantity this sweep,
// leaving the remainder queued.
export function fillQuantity(qty: number, participation: number): number {
  if (participation < 0.001) return qty
  const fraction = 0.4 + Math.random() * 0.5
  const filled = parseFloat((qty * fraction).toFixed(4))
  const remainder = qty - filled
  return remainder < 0.01 ? qty : filled
}
