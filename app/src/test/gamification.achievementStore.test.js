// UT-B4 — achievementStore adapter tests (mocked supabase injected directly)
// Coverage target: >90% lines on src/gamification/achievementStore.js

import { describe, it, expect, vi } from 'vitest'
import { createAchievementStore } from '../gamification/achievementStore'

// Build a minimal chainable supabase stub.
// select/eq chain resolves on .then (await-able); upsert returns a promise.
function makeSupabase({ selectRows = null, selectError = null } = {}) {
  const upsertSpy = vi.fn().mockResolvedValue({ error: null })

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

describe('createAchievementStore — earned()', () => {
  it('returns a Set of achievement_type ids from the DB', async () => {
    const rows = [
      { achievement_type: 'first_trade' },
      { achievement_type: 'researcher' },
    ]
    const { supabase } = makeSupabase({ selectRows: rows })
    const store = createAchievementStore(supabase)

    const result = await store.earned('user-1')

    expect(result).toBeInstanceOf(Set)
    expect(result.has('first_trade')).toBe(true)
    expect(result.has('researcher')).toBe(true)
    expect(result.size).toBe(2)
  })

  it('returns empty Set when no achievements exist (empty array)', async () => {
    const { supabase } = makeSupabase({ selectRows: [] })
    const store = createAchievementStore(supabase)

    const result = await store.earned('user-1')

    expect(result).toBeInstanceOf(Set)
    expect(result.size).toBe(0)
  })

  it('returns empty Set when data is null', async () => {
    const { supabase } = makeSupabase({ selectRows: null })
    const store = createAchievementStore(supabase)

    const result = await store.earned('user-1')

    expect(result).toBeInstanceOf(Set)
    expect(result.size).toBe(0)
  })

  it('returns empty Set on supabase error', async () => {
    const { supabase } = makeSupabase({ selectError: new Error('rls error') })
    const store = createAchievementStore(supabase)

    const result = await store.earned('user-1')

    expect(result).toBeInstanceOf(Set)
    expect(result.size).toBe(0)
  })

  it('queries achievements table filtering by user_id', async () => {
    const { supabase, fromSpy, chain } = makeSupabase({ selectRows: [] })
    const store = createAchievementStore(supabase)

    await store.earned('user-abc')

    expect(fromSpy).toHaveBeenCalledWith('achievements')
    expect(chain.select).toHaveBeenCalledWith('achievement_type')
    expect(chain.eq).toHaveBeenCalledWith('user_id', 'user-abc')
  })

  it('handles duplicate achievement rows without crashing (Set deduplicates)', async () => {
    // Defensive: if DB somehow returns duplicates
    const rows = [
      { achievement_type: 'first_trade' },
      { achievement_type: 'first_trade' },
    ]
    const { supabase } = makeSupabase({ selectRows: rows })
    const store = createAchievementStore(supabase)

    const result = await store.earned('user-1')
    expect(result.size).toBe(1)
    expect(result.has('first_trade')).toBe(true)
  })
})

describe('createAchievementStore — award()', () => {
  it('upserts rows for each id with ignoreDuplicates onConflict', async () => {
    const { supabase, upsertSpy, fromSpy } = makeSupabase()
    const store = createAchievementStore(supabase)

    await store.award('user-1', ['first_trade', 'researcher'])

    expect(fromSpy).toHaveBeenCalledWith('achievements')
    expect(upsertSpy).toHaveBeenCalledTimes(1)

    const [rows, opts] = upsertSpy.mock.calls[0]
    expect(opts).toEqual({
      onConflict: 'user_id,achievement_type',
      ignoreDuplicates: true,
    })
    expect(rows).toHaveLength(2)
    expect(rows).toEqual(
      expect.arrayContaining([
        { user_id: 'user-1', achievement_type: 'first_trade' },
        { user_id: 'user-1', achievement_type: 'researcher' },
      ]),
    )
  })

  it('does NOT call upsert when ids is an empty array', async () => {
    const { supabase, upsertSpy } = makeSupabase()
    const store = createAchievementStore(supabase)

    await store.award('user-1', [])

    expect(upsertSpy).not.toHaveBeenCalled()
  })

  it('does NOT call upsert when ids is null/undefined', async () => {
    const { supabase, upsertSpy } = makeSupabase()
    const store = createAchievementStore(supabase)

    await store.award('user-1', null)
    await store.award('user-1', undefined)

    expect(upsertSpy).not.toHaveBeenCalled()
  })

  it('upserts a single id correctly', async () => {
    const { supabase, upsertSpy } = makeSupabase()
    const store = createAchievementStore(supabase)

    await store.award('user-2', ['council'])

    const [rows, opts] = upsertSpy.mock.calls[0]
    expect(rows).toHaveLength(1)
    expect(rows[0]).toEqual({ user_id: 'user-2', achievement_type: 'council' })
    expect(opts.ignoreDuplicates).toBe(true)
  })

  it('resolves without throwing even if award is called with many ids', async () => {
    const { supabase } = makeSupabase()
    const store = createAchievementStore(supabase)
    const ids = ['first_trade','limit','diversified','etf','etf2','first_crypto',
                 'researcher','contrarian','momentum','patient','long_term',
                 'steady','reflection','council','macro']

    await expect(store.award('user-1', ids)).resolves.toBeUndefined()
  })
})
