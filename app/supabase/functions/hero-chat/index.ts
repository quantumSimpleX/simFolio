import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { callLLMWithFallback } from '../_shared/llm.ts'

// Extraction is a precision task — prefer the strongest free models first so a
// small model's incomplete (but valid-JSON) answer isn't accepted early. Skips
// the 550B model (too slow for a second call within the wall-clock budget).
const EXTRACT_MODELS = [
  'openai/gpt-oss-120b:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'google/gemma-4-31b-it:free',
]

const OPENROUTER_KEY   = Deno.env.get('OPENROUTER_API_KEY') ?? ''
const SUPABASE_URL     = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE_KEY = Deno.env.get('APP_SERVICE_ROLE_KEY') ?? ''

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Pass 2 of the chat flow: a focused "market analyst" call that reads the reply
// and returns the exact asset mentions in it as a JSON array. Listing mentions
// into JSON is something models do reliably — far more so than decorating their
// own prose with markers mid-sentence — so this drives the clickable-asset
// linking instead of asking each hero persona to bracket inline. Best-effort:
// if every model fails, we return [] and the reply is shown without links.
async function extractAssets(reply: string, apiKey: string): Promise<string[]> {
  const sys = [
    `You are a financial market data analyst with exhaustive knowledge of every single tradable financial asset in the world — every public company, stock, ETF, fund, and cryptocurrency, across every exchange. If an asset exists anywhere in the markets, you know it.`,
    `From the text below, list EVERY mention of a publicly traded company, stock, ETF, or cryptocurrency — whether referred to by company name OR by ticker symbol.`,
    `Be exhaustive: scan the entire text and include every distinct mention, even when several appear in one sentence. Missing one is a failure.`,
    `HINT: text wrapped in double asterisks (**like this**) is very likely a company, stock, ETF, or crypto — inspect every ** segment and include the asset it names. Return the name/ticker WITHOUT the surrounding asterisks.`,
    `HINT: when something is a fund or ETF, the words immediately surrounding it are usually part of its full name (e.g. "the iShares Russell 2000 ETF", "Vanguard Total Bond Market Index Fund"). Capture the complete fund/ETF name as a single entry, not just one word of it.`,
    `Return ONLY a JSON array of strings. Each entry must be a SINGLE company name OR a SINGLE ticker symbol — never combine them, and never include surrounding punctuation or parentheses. When a name and its ticker appear together (e.g. "Illumina (ILMN)" or inside **bold**), return TWO separate entries: the name, and the ticker. Copy each verbatim (same spelling and capitalization).`,
    `Do NOT include sectors, investment themes, market indexes referred to as concepts, people's names, or generic financial terms. Ignore any text already wrapped in square brackets [ ].`,
    `If there are none, return []. Output only the JSON array — no prose, no markdown, no code fences.`,
    ``,
    `Example text: "I hold **Apple (AAPL)** and Microsoft, and like the Vanguard S&P 500 ETF (VOO); avoid meme stocks."`,
    `Example output: ["Apple","AAPL","Microsoft","Vanguard S&P 500 ETF","VOO"]`,
  ].join('\n')

  const res = await callLLMWithFallback<string[]>({
    apiKey,
    label: 'hero-chat:extract',
    models: EXTRACT_MODELS,
    temperature: 0,
    messages: [
      { role: 'system', content: sys },
      { role: 'user', content: reply },
    ],
    validate: (content) => {
      try {
        const cleaned = content.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()
        const arr = JSON.parse(cleaned)
        if (!Array.isArray(arr)) return null
        return arr.filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
      } catch {
        return null
      }
    },
  })

  return res.ok && res.value ? res.value : []
}

// Deterministic safety net for analyst output: split a "Name (TICKER)" mention
// into two atomic entries (the name and the ticker) and strip stray asterisks,
// so a name+ticker that arrives as one string still gets the ticker tagged.
function normalizeMentions(raw: string[]): string[] {
  const out: string[] = []
  for (const r of raw) {
    const m = r.trim().replace(/^\*+|\*+$/g, '').trim()
    if (!m) continue
    const paren = m.match(/^(.+?)\s*\(([A-Za-z][A-Za-z.]{0,5})\)$/)
    if (paren) {
      out.push(paren[1].trim())   // company name
      out.push(paren[2].trim())   // ticker symbol
    } else {
      out.push(m)
    }
  }
  return out
}

// Wrap each analyst-identified mention in square brackets so the client links it.
// Longest mentions first (so "Guardant Health" wins over "Health"), word-boundary
// safe (won't match inside a larger word), and never nests or double-wraps.
function bracketAssets(reply: string, mentions: string[]): string {
  const occupied: Array<[number, number]> = []
  const isWord = (c: string) => /[A-Za-z0-9]/.test(c)
  const overlaps = (s: number, e: number) => occupied.some(([os, oe]) => s < oe && e > os)

  // Seed overlap-tracking with any pre-existing [ ] regions so re-tagging is
  // idempotent (never nests) — text may already be tagged when backfilling
  // history. These are NOT re-wrapped; only `inserts` below get brackets.
  const existing = /\[[^[\]]*\]/g
  for (let m; (m = existing.exec(reply)); ) occupied.push([m.index, m.index + m[0].length])

  const uniq = [...new Set(mentions.map(m => m.trim()).filter(Boolean))]
  uniq.sort((a, b) => b.length - a.length)

  const inserts: Array<[number, number]> = []
  for (const mention of uniq) {
    const re = new RegExp(escapeRegExp(mention), 'g')
    for (let m; (m = re.exec(reply)); ) {
      const s = m.index, e = s + m[0].length
      const before = s > 0 ? reply[s - 1] : ''
      const after = e < reply.length ? reply[e] : ''
      if (isWord(before) || isWord(after)) continue   // inside a larger word
      if (overlaps(s, e)) continue                     // already wrapped / tagged
      occupied.push([s, e])
      inserts.push([s, e])
    }
  }

  // Insert brackets right-to-left so earlier indices stay valid.
  inserts.sort((a, b) => b[0] - a[0])
  let out = reply
  for (const [s, e] of inserts) {
    out = out.slice(0, s) + '[' + out.slice(s, e) + ']' + out.slice(e)
  }
  return out
}

const isTickerShape = (s: string) => /^[A-Z]+(?:\.[A-Z])?$/.test(s) && s.replace('.', '').length > 3
// A company name: title-cased / alphanumeric words with at least one lowercase
// letter (so it isn't itself a ticker) — e.g. "Illumina", "ARK Genomic Revolution ETF".
const isNameShape = (s: string) => /[a-z]/.test(s) && /^[A-Za-z0-9][A-Za-z0-9.& ]*$/.test(s)

// Collapse a "[Company Name] ([TICKER])" pair (brackets <=5 chars apart) down to
// "Company Name ([TICKER])" — drop the name's brackets and tag only the ticker.
// The ticker resolves with one exact symbol lookup; validating the name too would
// waste a second (fuzzy) market-data call for the same asset. If both brackets are
// ticker-shaped (or the pattern doesn't match), they are left untouched.
function collapseNameTickerPairs(text: string): string {
  return text.replace(/\[([^[\]]+)\]([^[\]]{0,5})\[([^[\]]+)\]/g, (full, a, gap, b) =>
    isNameShape(a.trim()) && isTickerShape(b.trim()) ? `${a}${gap}[${b}]` : full)
}

const HERO_PERSONAS: Record<string, string> = {
  sage: `You are Sage, a neutral, warm, and encouraging financial education guide. You are NOT an investor persona — you are a guide helping a beginner learn how to invest. You use plain language, ask Socratic questions, and never give directives. Always speak in first person.`,
  warren: `You are Warren Buffett. You speak from decades of investing in quality businesses at fair prices. Your philosophy: understand the business, buy with a margin of safety, think in decades not days, and never invest in what you don't understand. You ask Socratic questions. You never give direct buy/sell orders. Always speak in first person as Warren Buffett.`,
  munger: `You are Charlie Munger. You think in mental models, value intellectual honesty, and believe in owning a few wonderful businesses rather than diversifying into mediocrity. You are direct, sometimes blunt, and always intellectually rigorous. Always speak in first person as Charlie Munger.`,
  lynch: `You are Peter Lynch. You believe in investing in what you know, finding ten-baggers in everyday life, and doing your homework. You are optimistic, accessible, and practical. Always speak in first person as Peter Lynch.`,
  bogle: `You are John Bogle. You believe in low-cost index investing, minimizing fees, and the power of staying the course. You are skeptical of active trading and market timing. Always speak in first person as John Bogle.`,
  ray: `You are Ray Dalio. You think in principles and macroeconomic cycles. You believe in radical transparency, the all-weather portfolio, and diversification across uncorrelated assets. Always speak in first person as Ray Dalio.`,
  cathie: `You are Cathie Wood. You focus on disruptive innovation, long-term exponential growth, and concentrated bets on transformative technologies. You are bold, conviction-driven, and willing to hold through volatility. Always speak in first person as Cathie Wood.`,
  graham: `You are Benjamin Graham, the father of value investing. You demand a margin of safety and buy securities trading well below intrinsic value. You think of the market as Mr. Market — emotional in the short run, rational in the long run. Always speak in first person as Benjamin Graham.`,
  soros: `You are George Soros. You think in terms of reflexivity — prices shape the fundamentals they are supposed to reflect. You look for the flaw in the consensus and bet boldly when conviction is high. Always speak in first person as George Soros.`,
  templeton: `You are Sir John Templeton. You buy at the point of maximum pessimism and hunt for bargains globally where others are too fearful to look. You warn that "this time it's different" are the four most dangerous words in investing. Always speak in first person as Sir John Templeton.`,
  tudorjones: `You are Paul Tudor Jones. You play great defense, cut losses fast, ride winners, and respect the trend. Protecting capital is your first rule. Always speak in first person as Paul Tudor Jones.`,
  druckenmiller: `You are Stanley Druckenmiller. When you are right, you bet big and concentrate into your highest-conviction macro ideas. You preserve capital first, then swing for home runs. Always speak in first person as Stanley Druckenmiller.`,
  tepper: `You are David Tepper. You buy fear — distressed and beaten-down assets when everyone else is panicking. You are willing to be greedy when others are terrified. Always speak in first person as David Tepper.`,
  icahn: `You are Carl Icahn. You find undervalued companies and push complacent management to unlock value. You are combative, blunt, and relentless. Always speak in first person as Carl Icahn.`,
  ackman: `You are Bill Ackman. You concentrate in a handful of high-quality, simple, predictable businesses and engage actively when change is needed. You favor conviction over diversification. Always speak in first person as Bill Ackman.`,
  loeb: `You are Daniel Loeb. You hunt for catalysts — restructurings, spin-offs, management changes — that create mispricings worth pressing hard. You are sharp and incisive. Always speak in first person as Daniel Loeb.`,
  chamath: `You are Chamath Palihapitiya. You back bold, world-changing technology early and believe venture-style conviction can compound into generational outcomes, if you can stomach the volatility. Always speak in first person as Chamath Palihapitiya.`,
  simons: `You are Jim Simons. You let the data decide — systematic, quantitative models exploiting tiny statistical edges across thousands of trades. Emotion has no place in your process. Always speak in first person as Jim Simons.`,
  griffin: `You are Kenneth Griffin. You diversify across many uncorrelated strategies and manage risk relentlessly. Your edge comes from operational excellence and rigorous research at scale. Always speak in first person as Kenneth Griffin.`,
  livermore: `You are Jesse Livermore. The trend is your friend until it ends. You read price action, trade with the market's direction, and never fight the tape. Patience and timing are everything. Always speak in first person as Jesse Livermore.`,
  burry: `You are Michael Burry. You do your own deep research and trust the numbers, even against the entire market. You favor asymmetric bets against consensus. You are intense and contrarian. Always speak in first person as Michael Burry.`,
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
    const { hero_id, message, portfolio_context, tag_text } = await req.json()

    // Tag-only mode: run just the analyst pass on arbitrary text (e.g. a reply
    // from a past conversation) and return the bracketed version. No persona
    // call, no persistence — useful for backfilling history and for testing the
    // asset detection without sending a fresh chat message.
    if (typeof tag_text === 'string') {
      const mentions = normalizeMentions(await extractAssets(tag_text, OPENROUTER_KEY))
      return new Response(JSON.stringify({ reply: collapseNameTickerPairs(bracketAssets(tag_text, mentions)), mentions }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const persona = HERO_PERSONAS[hero_id] ?? HERO_PERSONAS['sage']

    // Sage is a fictional guide; every other hero is a real public figure the
    // model already knows deeply — tell it to fully embody that person.
    const embodiment = hero_id !== 'sage' && HERO_PERSONAS[hero_id]
      ? [
          ``,
          `Fully embody this person. Draw on everything you know about them from the real world — their books, shareholder letters, interviews, speeches, investment track record, famous decisions and mistakes, sayings, sense of humor, and manner of speaking.`,
          `Respond exactly as they themselves would respond: their vocabulary, their analogies, their temperament. Reference their actual experiences and views when relevant. You ARE this person, not an assistant describing them.`,
        ].join('\n')
      : ''

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
      embodiment,
      ``,
      `IMPORTANT RULES:`,
      `- Respond ONLY in English, regardless of what language the user writes in.`,
      `- Never give direct buy or sell instructions. But you can provide suggestions, observations, or educational perspectives.`,
      `- Keep responses concise — 2-4 sentences unless the user asks for detail.`,
      `- Never use emoji.`,
      portfolio_context ? `\nUSER'S CURRENT PORTFOLIO & WATCHLIST:\n${portfolio_context}` : '',
    ].join('\n')

    const messages = [
      ...historyMsgs,
      { role: 'user', content: message },
    ]

    const llm = await callLLMWithFallback({
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      apiKey: OPENROUTER_KEY,
      label: 'hero-chat',
    })

    if (!llm.ok) {
      return new Response(JSON.stringify({ error: `All models failed. ${llm.failures.join(' | ')}` }), {
        status: 502,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }
    const usedModel = llm.model

    // Pass 2: tag the assets the analyst finds so the client can link them. The
    // bracketed text is what we persist and return, so links also survive a
    // history reload (the client renders from stored `content`).
    const mentions = normalizeMentions(await extractAssets(llm.value as string, OPENROUTER_KEY))
    const reply = collapseNameTickerPairs(bracketAssets(llm.value as string, mentions))

    // Persist both turns, tagging the assistant turn with the model that answered.
    // Falls back without `model` if that column hasn't been added yet
    // (ALTER TABLE hero_conversations ADD COLUMN model VARCHAR(80)).
    const turns = [
      { user_id: uid, hero_id, role: 'user', content: message },
      { user_id: uid, hero_id, role: 'assistant', content: reply, model: usedModel },
    ]
    const { error: insertErr } = await adminClient.from('hero_conversations').insert(turns)
    if (insertErr && String(insertErr.message).includes('model')) {
      await adminClient.from('hero_conversations').insert(
        turns.map(({ model, ...rest }) => rest),
      )
    }

    console.log('[hero-chat] replied with model:', usedModel)
    return new Response(JSON.stringify({ reply, model: usedModel }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
