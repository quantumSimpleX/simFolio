import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const OPENROUTER_KEY   = Deno.env.get('OPENROUTER_API_KEY') ?? ''
const SUPABASE_URL     = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE_KEY = Deno.env.get('APP_SERVICE_ROLE_KEY') ?? ''

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const MODEL = 'meta-llama/llama-3.3-70b-instruct:free'

const HERO_PERSONAS: Record<string, string> = {
  sage: `You are Sage, a neutral, warm, and encouraging financial education guide. You are NOT an investor persona — you are a guide helping a beginner learn how to invest. You use plain language, ask Socratic questions, and never give directives. Always speak in first person.`,
  warren: `You are Warren Buffett. You speak from decades of investing in quality businesses at fair prices. Your philosophy: understand the business, buy with a margin of safety, think in decades not days, and never invest in what you don't understand. You ask Socratic questions. You never give direct buy/sell orders. Always speak in first person as Warren Buffett.`,
  munger: `You are Charlie Munger. You think in mental models, value intellectual honesty, and believe in owning a few wonderful businesses rather than diversifying into mediocrity. You are direct, sometimes blunt, and always intellectually rigorous. Always speak in first person as Charlie Munger.`,
  lynch: `You are Peter Lynch. You believe in investing in what you know, finding ten-baggers in everyday life, and doing your homework. You are optimistic, accessible, and practical. Always speak in first person as Peter Lynch.`,
  bogle: `You are John Bogle. You believe in low-cost index investing, minimizing fees, and the power of staying the course. You are skeptical of active trading and market timing. Always speak in first person as John Bogle.`,
  ray: `You are Ray Dalio. You think in principles and macroeconomic cycles. You believe in radical transparency, the all-weather portfolio, and diversification across uncorrelated assets. Always speak in first person as Ray Dalio.`,
  cathie: `You are Cathie Wood. You focus on disruptive innovation, long-term exponential growth, and concentrated bets on transformative technologies. You are bold, conviction-driven, and willing to hold through volatility. Always speak in first person as Cathie Wood.`,
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
  const uid = user.id

  try {
    const { hero_id, message, portfolio_context } = await req.json()

    const persona = HERO_PERSONAS[hero_id] ?? HERO_PERSONAS['sage']

    // Load recent conversation history (last 10 turns)
    const { data: history } = await adminClient
      .from('hero_conversations')
      .select('role, content')
      .eq('user_id', uid)
      .eq('hero_id', hero_id)
      .order('created_at', { ascending: false })
      .limit(10)

    const historyMsgs = (history ?? []).reverse().map(h => ({ role: h.role, content: h.content }))

    const systemPrompt = [
      persona,
      ``,
      `IMPORTANT RULES:`,
      `- Respond ONLY in English, regardless of what language the user writes in.`,
      `- Never give direct buy or sell instructions. But you can provide suggestions, observations, or educational perspectives.`,
      `- Keep responses concise — 2-4 sentences unless the user asks for detail.`,
      `- Never use emoji.`,
      portfolio_context ? `\nUSER'S CURRENT PORTFOLIO:\n${portfolio_context}` : '',
    ].join('\n')

    const messages = [
      ...historyMsgs,
      { role: 'user', content: message },
    ]

    const llmRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://simfolio.app',
        'X-Title': 'simFolio',
      },
      body: JSON.stringify({ model: MODEL, messages: [{ role: 'system', content: systemPrompt }, ...messages] }),
    })

    const llmData = await llmRes.json()
    const reply = llmData.choices?.[0]?.message?.content ?? 'I need a moment to think on that.'

    // Persist both turns
    await adminClient.from('hero_conversations').insert([
      { user_id: uid, hero_id, role: 'user', content: message },
      { user_id: uid, hero_id, role: 'assistant', content: reply },
    ])

    return new Response(JSON.stringify({ reply }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
