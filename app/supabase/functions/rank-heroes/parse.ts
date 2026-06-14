// Pure helpers for the rank-heroes edge function. Kept in their own module (no top-level `serve`)
// so they can be unit-tested with `deno test` without booting the HTTP server.

export interface Candidate {
  id: string
  name: string
  style?: string
  philosophy?: string
}

// Defensively extract a ranked list of hero ids from a raw LLM completion. Free models are
// unreliable at strict JSON, so we try: (1) parse the whole string, (2) a {"ranked":[...]} object,
// (3) the first bare [...] array embedded in prose. Only ids present in `validIds` are kept;
// duplicates are dropped; result is capped at 7. Returns [] when nothing usable is found.
export function parseRankedIds(rawText: string, validIds: string[]): string[] {
  const valid = new Set(validIds)
  const out: string[] = []

  const push = (arr: unknown) => {
    if (!Array.isArray(arr)) return
    for (const x of arr) {
      const id = typeof x === 'string' ? x.trim() : ''
      if (valid.has(id) && !out.includes(id)) out.push(id)
    }
  }
  const tryParse = (s: string): unknown => {
    try { return JSON.parse(s) } catch { return null }
  }

  if (typeof rawText === 'string' && rawText.length > 0) {
    let parsed = tryParse(rawText)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      parsed = (parsed as Record<string, unknown>).ranked
    }
    push(parsed)

    if (out.length === 0) {
      const obj = rawText.match(/\{[\s\S]*\}/)
      if (obj) {
        const o = tryParse(obj[0])
        if (o && typeof o === 'object') push((o as Record<string, unknown>).ranked)
      }
    }
    if (out.length === 0) {
      const arr = rawText.match(/\[[\s\S]*?\]/)
      if (arr) push(tryParse(arr[0]))
    }
  }

  return out.slice(0, 7)
}

// Build the system + user prompt for ranking. Pure so the prompt shape can be eyeballed/tested.
export function buildRankingPrompt(answers: Record<string, unknown>, candidates: Candidate[]) {
  const roster = candidates
    .map(c => `- ${c.id}: ${c.name} — ${c.style ?? ''}${c.philosophy ? ` (${c.philosophy})` : ''}`)
    .join('\n')

  const system = [
    `You are an expert investment advisor helping match a beginner investor to legendary investor personas who would make the best advisors for them.`,
    `Given the investor's onboarding answers and the list of candidate investors below, rank the SEVEN whose philosophy, style, time horizon, and risk profile best fit this investor.`,
    `Use your pretrained knowledge of each investor. Do NOT include Warren Buffett — he is always shown separately.`,
    `Respond with STRICT JSON only, no prose: {"ranked": ["id1","id2","id3","id4","id5","id6","id7"]} using ONLY ids from the candidate list.`,
    ``,
    `CANDIDATES:`,
    roster,
  ].join('\n')

  const user = `INVESTOR ONBOARDING ANSWERS:\n${JSON.stringify(answers, null, 2)}`

  return { system, user }
}
