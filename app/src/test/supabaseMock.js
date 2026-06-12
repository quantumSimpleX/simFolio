// Stand-in for src/lib/supabase.js in tests (aliased in vite.config.js).
// Every query chain resolves to { data, error: null }; seed per-table data
// with __setTableData / reset with __reset.
import { vi } from 'vitest'

const tableData = new Map()

export function __setTableData(table, data) {
  tableData.set(table, data)
}

export function __reset() {
  tableData.clear()
}

function builder(table) {
  const result = () => {
    const rows = tableData.get(table) ?? null
    return { data: rows, error: null }
  }
  const single = () => {
    const rows = tableData.get(table)
    return { data: Array.isArray(rows) ? rows[0] ?? null : rows ?? null, error: null }
  }
  const b = {}
  const chain = ['select', 'insert', 'update', 'upsert', 'delete', 'eq', 'neq', 'in', 'gt', 'gte', 'lt', 'lte', 'not', 'or', 'order', 'limit', 'range']
  for (const m of chain) b[m] = vi.fn(() => b)
  b.single = vi.fn(() => ({ then: (res, rej) => Promise.resolve(single()).then(res, rej) }))
  b.maybeSingle = vi.fn(() => ({ then: (res, rej) => Promise.resolve(single()).then(res, rej) }))
  b.then = (res, rej) => Promise.resolve(result()).then(res, rej)
  return b
}

export const mockUser = {
  id: 'test-user',
  email: 'test@example.com',
  user_metadata: { first_name: 'Test' },
}

const mockSession = { user: mockUser, access_token: 'test-token' }

export const supabase = {
  from: vi.fn((table) => builder(table)),
  functions: {
    invoke: vi.fn(async () => ({ data: null, error: null })),
  },
  auth: {
    getSession: vi.fn(async () => ({ data: { session: mockSession } })),
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    signInAnonymously: vi.fn(async () => ({ data: { session: mockSession } })),
    signUp: vi.fn(async () => ({ data: { session: mockSession, user: mockUser } })),
    signInWithPassword: vi.fn(async () => ({ data: { session: mockSession } })),
    signOut: vi.fn(async () => ({ error: null })),
    getUser: vi.fn(async () => ({ data: { user: mockUser } })),
  },
}
