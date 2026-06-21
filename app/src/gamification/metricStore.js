// MetricStore adapter — persists materialized metric counters to Supabase
// `user_metrics`. See GAMreq §3.3 / §4. State is opaque JSONB per metric.
//
// apply() merges each delta into its metric's state and upserts. The engine
// passes full next-state deltas (the fold already produced the new state), so
// merging = replacing that metric's row state with the provided delta.

export function createMetricStore(supabase) {
  async function get(userId) {
    const { data, error } = await supabase
      .from('user_metrics')
      .select('metric_id, state')
      .eq('user_id', userId)

    if (error || !data) return {}

    const out = {}
    for (const row of data) out[row.metric_id] = row.state ?? {}
    return out
  }

  async function apply(userId, deltas) {
    const current = await get(userId)
    const next = { ...current }
    const rows = []

    for (const [metricId, delta] of Object.entries(deltas)) {
      const merged = { ...(current[metricId] ?? {}), ...delta }
      next[metricId] = merged
      rows.push({
        user_id: userId,
        metric_id: metricId,
        state: merged,
        updated_at: new Date().toISOString(),
      })
    }

    if (rows.length) {
      await supabase
        .from('user_metrics')
        .upsert(rows, { onConflict: 'user_id,metric_id' })
    }

    return next
  }

  return { get, apply }
}
