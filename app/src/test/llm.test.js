import { describe, it, expect, vi, afterEach } from 'vitest'
import { MODELS, callLLMWithFallback } from '../../supabase/functions/_shared/llm.ts'

afterEach(() => vi.restoreAllMocks())

// Build a fake fetch Response whose .json() resolves to `body`.
const jsonRes = (body, status = 200) => ({ status, json: async () => body })
const ok = (content) => jsonRes({ choices: [{ message: { content } }] })
const apiErr = (message, status = 429) => jsonRes({ error: { message } }, status)

const baseMsgs = [{ role: 'user', content: 'hi' }]

describe('MODELS chain', () => {
  it('is the four-vendor fallback order, Google first and NVIDIA last', () => {
    expect(MODELS).toHaveLength(4)
    expect(MODELS[0]).toContain('google/')
    expect(MODELS[1]).toContain('openai/')
    expect(MODELS[2]).toContain('meta-llama/')
    expect(MODELS[MODELS.length - 1]).toContain('nvidia/')
  })
})

describe('callLLMWithFallback', () => {
  it('returns the first model that answers and stops calling further models', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(ok('hello there'))
    vi.stubGlobal('fetch', fetchMock)

    const r = await callLLMWithFallback({ messages: baseMsgs, apiKey: 'k' })

    expect(r.ok).toBe(true)
    expect(r.model).toBe(MODELS[0])
    expect(r.value).toBe('hello there')
    expect(r.content).toBe('hello there')
    expect(r.failures).toEqual([])
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('sends the OpenRouter request with the API key and the model in the body', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(ok('ok'))
    vi.stubGlobal('fetch', fetchMock)

    await callLLMWithFallback({ messages: baseMsgs, apiKey: 'secret-key' })

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://openrouter.ai/api/v1/chat/completions')
    expect(init.headers.Authorization).toBe('Bearer secret-key')
    const sent = JSON.parse(init.body)
    expect(sent.model).toBe(MODELS[0])
    expect(sent.messages).toEqual(baseMsgs)
  })

  it('falls through to a later model when earlier ones fail, recording each reason', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(apiErr('rate limited', 429))
      .mockResolvedValueOnce(jsonRes({}, 500)) // no choices, no error.message → "HTTP 500"
      .mockResolvedValueOnce(ok('third time lucky'))
    vi.stubGlobal('fetch', fetchMock)

    const r = await callLLMWithFallback({ messages: baseMsgs, apiKey: 'k' })

    expect(r.ok).toBe(true)
    expect(r.model).toBe(MODELS[2])
    expect(r.value).toBe('third time lucky')
    expect(r.failures).toHaveLength(2)
    expect(r.failures[0]).toBe(`${MODELS[0]}: rate limited`)
    expect(r.failures[1]).toBe(`${MODELS[1]}: HTTP 500`)
  })

  it('reports a clean failure when every model fails', async () => {
    const fetchMock = vi.fn().mockResolvedValue(apiErr('down'))
    vi.stubGlobal('fetch', fetchMock)

    const r = await callLLMWithFallback({ messages: baseMsgs, apiKey: 'k' })

    expect(r.ok).toBe(false)
    expect(r.model).toBeNull()
    expect(r.value).toBeNull()
    expect(r.content).toBeNull()
    expect(r.failures).toHaveLength(MODELS.length)
    expect(fetchMock).toHaveBeenCalledTimes(MODELS.length)
  })

  it('treats a thrown fetch (network error) as a model failure and moves on', async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new Error('ECONNRESET'))
      .mockResolvedValueOnce(ok('recovered'))
    vi.stubGlobal('fetch', fetchMock)

    const r = await callLLMWithFallback({ messages: baseMsgs, apiKey: 'k' })

    expect(r.ok).toBe(true)
    expect(r.model).toBe(MODELS[1])
    expect(r.failures[0]).toContain('ECONNRESET')
  })

  it('applies validate(): rejects content that does not pass and keeps the transformed value', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(ok('garbage, no ids here'))
      .mockResolvedValueOnce(ok('["ray","cathie"]'))
    vi.stubGlobal('fetch', fetchMock)

    const r = await callLLMWithFallback({
      messages: baseMsgs,
      apiKey: 'k',
      validate: (content) => {
        const m = content.match(/\[.*\]/)
        const arr = m ? JSON.parse(m[0]) : []
        return arr.length ? arr : null
      },
    })

    expect(r.ok).toBe(true)
    expect(r.model).toBe(MODELS[1])
    expect(r.value).toEqual(['ray', 'cathie'])
    expect(r.failures[0]).toContain('failed validation')
  })

  it('honors a custom models list', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(ok('hi'))
    vi.stubGlobal('fetch', fetchMock)

    const r = await callLLMWithFallback({ messages: baseMsgs, apiKey: 'k', models: ['only/one:free'] })

    expect(r.model).toBe('only/one:free')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
