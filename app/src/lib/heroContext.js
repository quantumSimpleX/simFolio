// Builds the portfolio + watchlist summary handed to a hero as system-prompt
// context, so every reply is grounded in what the user actually owns and watches.
export function buildHeroContext(positions, cashBalance, watchlist) {
  const cash = `Cash: $${cashBalance?.toFixed(2) ?? 0}.`
  const holdings = positions?.length
    ? `Holdings: ${positions
        .map(p => `${p.ticker} (${parseFloat(p.total_qty)} shares @ avg $${parseFloat(p.average_cost_basis).toFixed(2)}, current $${p.price?.toFixed(2) ?? '?'})`)
        .join(', ')}.`
    : 'No positions yet.'
  const watch = watchlist?.length
    ? `Watchlist (watching, not owned): ${watchlist.join(', ')}.`
    : ''
  return [cash, holdings, watch].filter(Boolean).join(' ')
}
