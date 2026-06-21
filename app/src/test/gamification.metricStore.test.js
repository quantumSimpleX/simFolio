// UT-B2 — metricStore adapter tests (mocked supabase injected directly)
// Coverage target: >90% lines on src/gamification/metricStore.js

import { describe, it, expect, vi } from 'vitest'
import { createMetricStore } from '../gamification/metricStore'

// Build a minimal chainable supabase stub that is injected into the factory.
// We construct it per-test so spy call counts reset cleanly.
function makeSupabase({ selectRows = null, selectError = null, upsertError = null } = {}) {
  const upsertSpy = vi.fn().mockResolvedValue({ error: upsertError })

  const chain = {
    select: vi.fn().mockReturnThis(),
    eq:     vi.fn().mockReturnThis(),
    upsert: upsertSpy,
  }
  chain.then = (res, rej) =>
    Promise.resolve({ data: selectRows, error: selectError }).then(res, rej)

  const fromSpy = vi.fn().mockReturnValue(chain)

  return { supabase: { from: fromSpy }, chain, upsertSpy, fromSpy }
}

describe('createMetricStore — get()', () => {
  it('returns a keyed state map when rows exist', async () => {
    const rows = [
      { metric_id: 'tradeCount', state: { n: 3 } },
      { metric_id: 'distinctStockViews', state: { set: ['AAPL', 'MSFT'] } },
    ]
    const { supabase } = makeSupabase({ selectRows: rows })
    const store = createMetricStore(supabase)

    const result = await store.get('user-1')

    expect(result).toEqual({
      tradeCount: { n: 3 },
      distinctStockViews: { set: ['AAPL', 'MSFT'] },
    })
  })

  it('returns {} when no rows exist (null data)', async () => {
    const { supabase } = makeSupabase({ selectRows: null })
    const store = createMetricStore(supabase)

    expect(await store.get('user-1')).toEqual({})
  })

  it('returns {} when data is an empty array', async () => {
    const { supabase } = makeSupabase({ selectRows: [] })
    const store = createMetricStore(supabase)

    expect(await store.get('user-1')).toEqual({})
  })

  it('returns {} on supabase error', async () => {
    const { supabase } = makeSupabase({ selectError: new Error('db error') })
    const store = createMetricStore(supabase)

    expect(await store.get('user-1')).toEqual({})
  })

  it('treats a null state column as empty object {}', async () => {
    const rows = [{ metric_id: 'tradeCount', state: null }]
    const { supabase } = makeSupabase({ selectRows: rows })
    const store = createMetricStore(supabase)

    const result = await store.get('user-1')
    expect(result.tradeCount).toEqual({})
  })

  it('queries user_metrics and filters by user_id', async () => {
    const { supabase, fromSpy, chain } = makeSupabase({ selectRows: [] })
    const store = createMetricStore(supabase)

    await store.get('user-abc')

    expect(fromSpy).toHaveBeenCalledWith('user_metrics')
    expect(chain.select).toHaveBeenCalledWith('metric_id, state')
    expect(chain.eq).toHaveBeenCalledWith('user_id', 'user-abc')
  })
})

describe('createMetricStore — apply()', () => {
  it('merges deltas into existing state and returns nextState', async () => {
    // Arrange: existing DB has { n: 2 } for tradeCount
    const existingRows = [{ metric_id: 'tradeCount', state: { n: 2 } }]

    let callCount = 0
    const upsertSpy = vi.fn().mockResolvedValue({ error: null })
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq:     vi.fn().mockReturnThis(),
      upsert: upsertSpy,
    }
    // First call to from('user_metrics') used by get() inside apply()
    chain.then = (res, rej) =>
      Promise.resolve({
        data: callCount++ === 0 ? existingRows : [],
        error: null,
      }).then(res, rej)

    const supabase = { from: vi.fn().mockReturnValue(chain) }
    const store = createMetricStore(supabase)

    const next = await store.apply('user-1', { tradeCount: { n: 3 } })

    expect(next.tradeCount).toEqual({ n: 3 })
  })

  it('merges (shallow-spreads) delta fields over existing state fields', async () => {
    // Existing: { set: ['AAPL'] }; delta: { set: ['AAPL', 'MSFT'] }
    // Result should be the merged spread: { set: ['AAPL', 'MSFT'] }
    const existingRows = [{ metric_id: 'distinctStockViews', state: { set: ['AAPL'] } }]
    const upsertSpy = vi.fn().mockResolvedValue({ error: null })
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq:     vi.fn().mockReturnThis(),
      upsert: upsertSpy,
    }
    chain.then = (res, rej) =>
      Promise.resolve({ data: existingRows, error: null }).then(res, rej)
    const supabase = { from: vi.fn().mockReturnValue(chain) }
    const store = createMetricStore(supabase)

    const next = await store.apply('user-1', { distinctStockViews: { set: ['AAPL', 'MSFT'] } })

    expect(next.distinctStockViews).toEqual({ set: ['AAPL', 'MSFT'] })
  })

  it('preserves existing metrics not in the delta', async () => {
    const existingRows = [
      { metric_id: 'tradeCount', state: { n: 5 } },
      { metric_id: 'reflections', state: { n: 2 } },
    ]
    const upsertSpy = vi.fn().mockResolvedValue({ error: null })
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq:     vi.fn().mockReturnThis(),
      upsert: upsertSpy,
    }
    chain.then = (res, rej) =>
      Promise.resolve({ data: existingRows, error: null }).then(res, rej)
    const supabase = { from: vi.fn().mockReturnValue(chain) }
    const store = createMetricStore(supabase)

    const next = await store.apply('user-1', { tradeCount: { n: 6 } })

    // reflections unchanged
    expect(next.reflections).toEqual({ n: 2 })
    expect(next.tradeCount).toEqual({ n: 6 })
  })

  it('calls upsert with onConflict user_id,metric_id', async () => {
    const upsertSpy = vi.fn().mockResolvedValue({ error: null })
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq:     vi.fn().mockReturnThis(),
      upsert: upsertSpy,
    }
    chain.then = (res, rej) =>
      Promise.resolve({ data: [], error: null }).then(res, rej)
    const supabase = { from: vi.fn().mockReturnValue(chain) }
    const store = createMetricStore(supabase)

    await store.apply('user-1', { tradeCount: { n: 1 } })

    expect(upsertSpy).toHaveBeenCalledTimes(1)
    const [rows, opts] = upsertSpy.mock.calls[0]
    expect(opts).toEqual({ onConflict: 'user_id,metric_id' })
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      user_id: 'user-1',
      metric_id: 'tradeCount',
      state: { n: 1 },
    })
    expect(rows[0].updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })

  it('does NOT call upsert when deltas is empty', async () => {
    const upsertSpy = vi.fn().mockResolvedValue({ error: null })
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq:     vi.fn().mockReturnThis(),
      upsert: upsertSpy,
    }
    chain.then = (res, rej) =>
      Promise.resolve({ data: [], error: null }).then(res, rej)
    const supabase = { from: vi.fn().mockReturnValue(chain) }
    const store = createMetricStore(supabase)

    await store.apply('user-1', {})

    expect(upsertSpy).not.toHaveBeenCalled()
  })

  it('merges new metric when no existing row for that metric_id', async () => {
    // DB has no row for tradeCount; delta is { n: 1 }
    const upsertSpy = vi.fn().mockResolvedValue({ error: null })
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq:     vi.fn().mockReturnThis(),
      upsert: upsertSpy,
    }
    chain.then = (res, rej) =>
      Promise.resolve({ data: [], error: null }).then(res, rej)
    const supabase = { from: vi.fn().mockReturnValue(chain) }
    const store = createMetricStore(supabase)

    const next = await store.apply('user-1', { tradeCount: { n: 1 } })

    expect(next.tradeCount).toEqual({ n: 1 })
    const [rows] = upsertSpy.mock.calls[0]
    expect(rows[0].state).toEqual({ n: 1 })
  })

  it('upserts multiple metrics in a single call', async () => {
    const upsertSpy = vi.fn().mockResolvedValue({ error: null })
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq:     vi.fn().mockReturnThis(),
      upsert: upsertSpy,
    }
    chain.then = (res, rej) =>
      Promise.resolve({ data: [], error: null }).then(res, rej)
    const supabase = { from: vi.fn().mockReturnValue(chain) }
    const store = createMetricStore(supabase)

    await store.apply('user-1', {
      tradeCount: { n: 1 },
      reflections: { n: 1 },
    })

    const [rows] = upsertSpy.mock.calls[0]
    expect(rows).toHaveLength(2)
    const ids = rows.map((r) => r.metric_id)
    expect(ids).toContain('tradeCount')
    expect(ids).toContain('reflections')
  })
})
