import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { modelLabel } from '../lib/modelLabel'
import { fluid } from '../lib/fluid'
import { useIsDesktop } from '../hooks/useIsDesktop'

describe('modelLabel (R1)', () => {
  it('maps known vendor ids to short labels', () => {
    expect(modelLabel('openai/gpt-oss-120b:free')).toBe('GPT-OSS')
    expect(modelLabel('google/gemma-4-31b-it:free')).toBe('Gemma')
    expect(modelLabel('google/gemini-2.0-flash:free')).toBe('Gemini')
    expect(modelLabel('nvidia/nemotron-3-ultra-550b-a55b:free')).toBe('Nemotron')
    expect(modelLabel('meta-llama/llama-3.3-70b-instruct:free')).toBe('Llama')
    expect(modelLabel('anthropic/claude-3-5-sonnet')).toBe('Claude')
  })

  it('falls back to the bare model name and is empty for falsy input', () => {
    expect(modelLabel('someorg/mystery-model-7b:free')).toBe('mystery-model-7b')
    expect(modelLabel('')).toBe('')
    expect(modelLabel(null)).toBe('')
    expect(modelLabel(undefined)).toBe('')
  })
})

describe('fluid (R2)', () => {
  it('returns a clamp() string interpolating min and max', () => {
    const out = fluid(14, 22)
    expect(out).toMatch(/^clamp\(/)
    expect(out).toContain('14px')
    expect(out).toContain('22px')
    // delta (max - min) appears in the linear term
    expect(out).toContain('8')
  })
})

describe('useIsDesktop (R3)', () => {
  let listeners
  afterEach(() => { vi.restoreAllMocks() })

  function mockMatchMedia(initialMatches) {
    listeners = []
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: initialMatches,
      media: query,
      addEventListener: (_e, cb) => listeners.push(cb),
      removeEventListener: (_e, cb) => { listeners = listeners.filter(l => l !== cb) },
    }))
  }

  it('is true when viewport >= 768', () => {
    Object.defineProperty(window, 'innerWidth', { value: 1200, configurable: true, writable: true })
    mockMatchMedia(true)
    const { result } = renderHook(() => useIsDesktop())
    expect(result.current).toBe(true)
  })

  it('is false when viewport < 768', () => {
    Object.defineProperty(window, 'innerWidth', { value: 500, configurable: true, writable: true })
    mockMatchMedia(false)
    const { result } = renderHook(() => useIsDesktop())
    expect(result.current).toBe(false)
  })

  it('updates on a matchMedia change event', () => {
    Object.defineProperty(window, 'innerWidth', { value: 500, configurable: true, writable: true })
    mockMatchMedia(false)
    const { result } = renderHook(() => useIsDesktop())
    expect(result.current).toBe(false)
    act(() => { listeners.forEach(cb => cb({ matches: true })) })
    expect(result.current).toBe(true)
  })
})
