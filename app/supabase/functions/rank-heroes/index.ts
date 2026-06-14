import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { buildRankingPrompt, parseRankedIds, type Candidate } from './parse.ts'

const OPENROUTER_KEY   = Deno.env.get('OPENROUTER_API_KEY') ?? ''
const SUPABASE_URL     = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE_KEY = Deno.env.get('APP_SERVICE_ROLE_KEY') ?? ''

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Same model strategy as hero-chat: OpenAI's largest free open-weight model.
const MODELS = [
  'openai/gpt-oss-120b:free',
]

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  const authHeader = req.headers.get('Authorization') ?? ''
  const jwt = authHeader.replace('Bearer ', '')

  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
  const { data: { user }, error: authErr } = await adminClient.auth.getUser(jwt)
  if (authErr || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: cors })
  }

  try {
    const { answers, candidates } = await req.json() as {
      answers: Record<string, unknown>
      candidates: Candidate[]
    }

    if (!Array.isArray(candidates) || candidates.length === 0) {
      return new Response(JSON.stringify({ error: 'No candidates provided' }), {
        status: 422, headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const validIds = candidates.map(c => c.id)
    const { system, user: userPrompt } = buildRankingPrompt(answers ?? {}, candidates)

    let ranked: string[] = []
    const failures: string[] = []
    for (const model of MODELS) {
      const llmRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://simfolio.app',
          'X-Title': 'simFolio',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: userPrompt },
          ],
        }),
      })
      const llmData = await llmRes.json()
      const content = llmData.choices?.[0]?.message?.content
      if (content) {
        ranked = parseRankedIds(content, validIds)
        if (ranked.length > 0) break
      }
      const why = llmData.error?.message ?? `HTTP ${llmRes.status}`
      failures.push(`${model}: ${why}`)
      console.warn('[rank-heroes] model failed —', model, why)
    }

    // Always 200 with whatever we ranked (possibly []). The client fills any shortfall from its
    // deterministic fallback, so onboarding never blocks on the model.
    return new Response(JSON.stringify({ ranked }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
