import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { buildRankingPrompt, parseRankedIds, type Candidate } from './parse.ts'
import { callLLMWithFallback } from '../_shared/llm.ts'

const OPENROUTER_KEY   = Deno.env.get('OPENROUTER_API_KEY') ?? ''
const SUPABASE_URL     = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE_KEY = Deno.env.get('APP_SERVICE_ROLE_KEY') ?? ''

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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

    // Reuse hero-chat's fallback chain; a model only counts as a success when it yields at least
    // one valid ranked id, otherwise we fall through to the next model.
    const llm = await callLLMWithFallback<string[]>({
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userPrompt },
      ],
      apiKey: OPENROUTER_KEY,
      label: 'rank-heroes',
      validate: (content) => {
        const ids = parseRankedIds(content, validIds)
        return ids.length > 0 ? ids : null
      },
    })
    const ranked = llm.value ?? []

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
