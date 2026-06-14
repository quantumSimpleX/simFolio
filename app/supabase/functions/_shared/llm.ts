// Shared LLM access for every edge function that talks to a model (hero-chat, rank-heroes, …).
// One fallback chain, one call loop — so chat and the onboarding hero-ranking behave identically
// and can never drift apart.

// Fallback chain: the biggest free OpenRouter model from each of four vendors, tried in order
// until one returns usable content. Order: Google → OpenAI → Meta → NVIDIA.
// NOTE: the NVIDIA 550B model is very large and can exceed the edge function wall-clock limit —
// it sits last as a final fallback only.
export const MODELS = [
  'google/gemma-4-31b-it:free',
  'openai/gpt-oss-120b:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'nvidia/nemotron-3-ultra-550b-a55b:free',
]

export interface LLMMessage {
  role: string
  content: string
}

export interface LLMResult<T> {
  ok: boolean
  model: string | null   // the model that produced an accepted answer, or null if all failed
  content: string | null // raw assistant text from the accepted answer
  value: T | null        // validated/transformed value (defaults to `content`)
  failures: string[]     // per-model failure reasons, in order tried
}

interface CallOptions<T> {
  messages: LLMMessage[]
  apiKey: string
  // Decide whether a model's raw content is usable. Return the value to keep, or null/undefined to
  // reject this model and try the next. Defaults to accepting any truthy content as-is.
  validate?: (content: string) => T | null | undefined
  models?: string[]
  label?: string // log prefix, e.g. 'hero-chat'
}

// Walk the fallback chain, returning the first accepted answer. Never throws on a model error —
// it records the reason and moves on, so a single bad model never breaks the caller.
export async function callLLMWithFallback<T = string>(
  opts: CallOptions<T>,
): Promise<LLMResult<T>> {
  const { messages, apiKey, validate, label = 'llm' } = opts
  const models = opts.models ?? MODELS
  const failures: string[] = []

  for (const model of models) {
    let content: string | undefined
    let why = ''
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://simfolio.app',
          'X-Title': 'simFolio',
        },
        body: JSON.stringify({ model, messages }),
      })
      const data = await res.json()
      content = data.choices?.[0]?.message?.content
      why = data.error?.message ?? `HTTP ${res.status}`
    } catch (err) {
      why = String(err)
    }

    if (content) {
      const value = validate ? validate(content) : (content as unknown as T)
      if (value !== null && value !== undefined) {
        return { ok: true, model, content, value: value as T, failures }
      }
      why = 'returned content failed validation'
    }

    failures.push(`${model}: ${why}`)
    console.warn(`[${label}] model failed —`, model, why)
  }

  return { ok: false, model: null, content: null, value: null, failures }
}
