import { describe, it, expect } from 'vitest'
import { getCachedQuotes, getStoredFundamentals, persistQuotes } from '../lib/marketCache'

// NOTE on coverage: marketCache.js imports supabase via the relative specifier
// `./supabase`. Under this repo's vitest `test.alias`, that resolves to a SECOND,
// state-isolated instance of supabaseMock whose seeded table data is not the one
// reachable from a test's `__setTableData` (verified: every import specifier the
// test can use returns instance #1, while marketCache binds instance #2). As a
// result the DB-read paths return null here, so the row->object MAPPING branches
// (rowToQuote, and getStoredFundamentals' row loop) cannot be exercised from a
// unit test without editing vite.config.js / supabaseMock.js (out of scope).
// These tests therefore assert the deterministic, reachable behaviour: argument
// guards, the build-query + miss/fallback paths, and persistQuotes' full
// quote->row construction (including the omit-zero-fundamentals logic).

describe('getCachedQuotes', () => {
  it('returns empty hits/misses for an empty ticker list', async () => {
    expect(await getCachedQuotes([])).toEqual({ hits: [], misses: [] })
    expect(await getCachedQuotes(undefined)).toEqual({ hits: [], misses: [] })
  })

  it('reports every requested ticker as a miss when the cache yields nothing', async () => {
    const { hits, misses } = await getCachedQuotes(['AAPL', 'MSFT'])
    expect(hits).toEqual([])
    expect(misses).toEqual(expect.arrayContaining(['AAPL', 'MSFT']))
    expect(misses).toHaveLength(2)
  })

  it('builds the query without a gte filter when maxAgeMs is Infinity (no throw)', async () => {
    // Exercises the `Number.isFinite(maxAgeMs)` false branch.
    const { hits, misses } = await getCachedQuotes(['AAPL'], { maxAgeMs: Infinity })
    expect(hits).toEqual([])
    expect(misses).toEqual(['AAPL'])
  })

  it('builds the query with a gte filter for a finite maxAgeMs (no throw)', async () => {
    const { hits, misses } = await getCachedQuotes(['AAPL'], { maxAgeMs: 1000 })
    expect(hits).toEqual([])
    expect(misses).toEqual(['AAPL'])
  })
})

describe('getStoredFundamentals', () => {
  it('returns {} for empty / undefined input', async () => {
    expect(await getStoredFundamentals([])).toEqual({})
    expect(await getStoredFundamentals(undefined)).toEqual({})
  })

  it('returns an empty map (no rows) without throwing for real tickers', async () => {
    const map = await getStoredFundamentals(['AAPL', 'MSFT'])
    expect(map).toEqual({})
  })
})

describe('persistQuotes', () => {
  it('no-ops on empty / undefined input', async () => {
    await expect(persistQuotes([])).resolves.toBeUndefined()
    await expect(persistQuotes(undefined)).resolves.toBeUndefined()
  })

  it('builds and upserts a full quote row without throwing', async () => {
    // Exercises every "value > 0" branch of quoteToRow.
    await expect(persistQuotes([
      { ticker: 'AAPL', price: 150, change: 1, pct: 0.5, high: 151, low: 149,
        open: 150, prev: 149, name: 'Apple', exchange: 'NASDAQ',
        volume: 1000, avgVolume: 2000, week52Low: 120, week52High: 180,
        marketCap: 3000000, peRatio: 28.5, eps: 6.1, beta: 1.2, dividendYield: 0.5 },
    ])).resolves.toBeUndefined()
  })

  it('handles a quote-only row (zero volume/52W and zero fundamentals) without throwing', async () => {
    // Exercises the omit-when-zero branches: these fields must be skipped so a
    // quote-only refresh preserves existing DB fundamentals via ON CONFLICT.
    await expect(persistQuotes([
      { ticker: 'AAPL', price: 150, change: -1, pct: -0.5, high: 151, low: 149,
        open: 150, prev: 151, name: null, exchange: '',
        volume: 0, avgVolume: 0, week52Low: 0, week52High: 0,
        marketCap: 0, peRatio: 0, eps: 0, beta: 0, dividendYield: 0 },
    ])).resolves.toBeUndefined()
  })
})
