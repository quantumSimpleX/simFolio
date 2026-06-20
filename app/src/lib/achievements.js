// Achievement rule engine (client-side evaluator).
//
// Pure functions: given a snapshot of the user's orders + positions, decide
// which badges are satisfied. The engine hook (useAchievementEngine) diffs the
// result against rows already in the `achievements` table and persists new ones.
//
// Only execution-derived badges are wired here — every rule is decidable from
// orders/positions alone. Behavioural badges that depend on events we don't yet
// capture (page views, hold duration, chat topics, sell reflections) are listed
// in BEHAVIORAL_STUBS and intentionally left unimplemented.

const heldPositions = (positions) =>
  (positions ?? []).filter((p) => Number(p.total_qty) > 0)

const distinctTickers = (rows) => new Set((rows ?? []).map((r) => r.ticker))

// Each rule: { id, test(ctx) -> boolean }. ctx = { orders, positions }.
export const EXECUTION_RULES = [
  // Any order placed at all.
  { id: 'first_trade', test: ({ orders }) => (orders ?? []).length > 0 },

  // First limit order placed.
  { id: 'limit', test: ({ orders }) => (orders ?? []).some((o) => o.type === 'LIMIT') },

  // Holding 5+ distinct securities.
  { id: 'diversified', test: ({ positions }) => distinctTickers(heldPositions(positions)).size >= 5 },

  // Holding any ETF.
  { id: 'etf', test: ({ positions }) => heldPositions(positions).some((p) => p.asset_type === 'ETF') },

  // Holding 3+ distinct ETFs.
  {
    id: 'etf2',
    test: ({ positions }) =>
      distinctTickers(heldPositions(positions).filter((p) => p.asset_type === 'ETF')).size >= 3,
  },

  // Holding any crypto.
  { id: 'first_crypto', test: ({ positions }) => heldPositions(positions).some((p) => p.asset_type === 'CRYPTO') },
]

// Behavioural badges — not yet wired. Each needs an event source we don't
// currently persist. TODO: implement when the underlying signals exist.
export const BEHAVIORAL_STUBS = [
  'researcher',   // view 10 distinct stock detail pages  -> needs page-view tracking
  'contrarian',   // buy a stock down 10%+ on the day     -> needs day-change at fill time
  'momentum',     // buy a stock up 5%+ on the day        -> needs day-change at fill time
  'patient',      // hold a position 30+ days             -> needs hold-duration job
  'long_term',    // hold a position 90+ days             -> needs hold-duration job
  'steady',       // hold through a 5%+ drop without selling -> needs drawdown tracking
  'reflection',   // write a reflection note after a sell -> needs reflection persistence
  'council',      // unlock a second hero advisor         -> needs hero_selections signal
  'macro',        // ask the council about market conditions -> needs chat-topic detection
]

// Returns a Set of badge ids the user currently qualifies for.
export function evaluateEarned(ctx) {
  const earned = new Set()
  for (const rule of EXECUTION_RULES) {
    if (rule.test(ctx)) earned.add(rule.id)
  }
  return earned
}
