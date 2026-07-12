// simFolio gamification config — metric reducers + achievement conditions for
// all 15 badges (GAMreq §5). Zero per-badge imperative code: every badge is a
// declarative entry. Name/description are pulled from BADGES so they stay in
// sync with the rest of the app.

import { BADGES } from '../tokens'

const byId = Object.fromEntries(BADGES.map((b) => [b.id, b]))
const meta = (id) => ({ name: byId[id]?.name, description: byId[id]?.desc })

// ── Metric definitions ─────────────────────────────────────────────────────────
// Event-derived metrics fold incrementally via track(); gauge metrics read live
// state via StateProvider. Targets enable UI progress bars.

export const METRICS = [
  // event-derived
  { id: 'tradeCount', kind: 'count', match: { type: 'trade.placed' }, target: 1 },
  { id: 'limitOrders', kind: 'count', match: { type: 'trade.placed', where: { type: { eq: 'LIMIT' } } }, target: 1 },
  { id: 'distinctStockViews', kind: 'distinct', match: { type: 'stock.viewed' }, prop: 'ticker', target: 10 },
  { id: 'contraBuys', kind: 'threshold-event', match: { type: 'trade.placed', where: { side: { eq: 'BUY' } } }, prop: 'dayChange', op: 'lte', value: -10, target: 1 },
  { id: 'momoBuys', kind: 'threshold-event', match: { type: 'trade.placed', where: { side: { eq: 'BUY' } } }, prop: 'dayChange', op: 'gte', value: 5, target: 1 },
  { id: 'mentorChosen', kind: 'count', match: { type: 'hero.unlocked' }, target: 1 },
  { id: 'reflections', kind: 'count', match: { type: 'sell.reflected' }, target: 1 },
  { id: 'macroQuestions', kind: 'count', match: { type: 'chat.sent', where: { macro: { eq: true } } }, target: 1 },

  // duration (opportunistic on load)
  { id: 'maxHoldDays', kind: 'duration', match: { type: 'trade.placed' }, since: 'first', while: 'positionOpen', target: 90 },

  // gauges (live state)
  { id: 'heldDistinct', kind: 'gauge', source: 'heldDistinct', target: 5 },
  { id: 'etfHeld', kind: 'gauge', source: 'etfHeld', target: 1 },
  { id: 'etfDistinct', kind: 'gauge', source: 'etfDistinct', target: 3 },
  { id: 'cryptoHeld', kind: 'gauge', source: 'cryptoHeld', target: 1 },
  { id: 'councilSize', kind: 'gauge', source: 'councilSize', target: 2 },
  { id: 'heldThroughDrop', kind: 'gauge', source: 'heldThroughDrop', target: 1 },
]

// ── Achievement definitions ────────────────────────────────────────────────────

export const ACHIEVEMENTS = [
  { id: 'first_trade', ...meta('first_trade'), condition: { metric: 'tradeCount', op: '>=', value: 1 } },
  { id: 'limit', ...meta('limit'), condition: { metric: 'limitOrders', op: '>=', value: 1 } },
  { id: 'diversified', ...meta('diversified'), condition: { metric: 'heldDistinct', op: '>=', value: 5 } },
  { id: 'etf', ...meta('etf'), condition: { metric: 'etfHeld', op: '>=', value: 1 } },
  { id: 'etf2', ...meta('etf2'), condition: { metric: 'etfDistinct', op: '>=', value: 3 } },
  { id: 'first_crypto', ...meta('first_crypto'), condition: { metric: 'cryptoHeld', op: '>=', value: 1 } },
  { id: 'researcher', ...meta('researcher'), condition: { metric: 'distinctStockViews', op: '>=', value: 10 } },
  { id: 'contrarian', ...meta('contrarian'), condition: { metric: 'contraBuys', op: '>=', value: 1 } },
  { id: 'momentum', ...meta('momentum'), condition: { metric: 'momoBuys', op: '>=', value: 1 } },
  { id: 'patient', ...meta('patient'), condition: { metric: 'maxHoldDays', op: '>=', value: 30 } },
  { id: 'long_term', ...meta('long_term'), condition: { metric: 'maxHoldDays', op: '>=', value: 90 } },
  { id: 'steady', ...meta('steady'), condition: { metric: 'heldThroughDrop', op: '>=', value: 1 } },
  { id: 'reflection', ...meta('reflection'), condition: { metric: 'reflections', op: '>=', value: 1 } },
  { id: 'mentor', ...meta('mentor'), condition: { metric: 'mentorChosen', op: '>=', value: 1 } },
  {
    id: 'macro',
    ...meta('macro'),
    condition: {
      all: [
        { metric: 'councilSize', op: '>=', value: 1 },
        { metric: 'macroQuestions', op: '>=', value: 1 },
      ],
    },
  },
]

// ── Progression: medals + trophies ───────────────────────────────────────────────
// Medals/trophies are derived (not persisted): badges are the only stored unit.
// Thematic medals require a full themed set; milestone (Explorer) medals count any
// badge toward a threshold. The single trophy requires every medal.

const ALL_BADGE_IDS = ACHIEVEMENTS.map((a) => a.id)

export const MEDALS = [
  // Thematic — full set required (threshold = set size)
  { id: 'medal_trader', name: 'Trader Medal', desc: 'Master every trading style badge',
    badges: ['first_trade', 'limit', 'contrarian', 'momentum'], threshold: 4 },
  { id: 'medal_builder', name: 'Builder Medal', desc: 'Build a diversified portfolio',
    badges: ['diversified', 'etf', 'etf2', 'first_crypto'], threshold: 4 },
  { id: 'medal_longterm', name: 'Long-term Medal', desc: 'Prove your patience',
    badges: ['patient', 'long_term', 'steady'], threshold: 3 },
  { id: 'medal_student', name: 'Student Medal', desc: 'Learn from the greats',
    badges: ['researcher', 'reflection', 'macro', 'mentor'], threshold: 4 },
  // Milestone — any badges count (the flexible "explorer" pattern)
  { id: 'medal_explorer_1', name: 'Explorer I', desc: 'Earn any 5 badges', badges: ALL_BADGE_IDS, threshold: 5 },
  { id: 'medal_explorer_2', name: 'Explorer II', desc: 'Earn any 10 badges', badges: ALL_BADGE_IDS, threshold: 10 },
  { id: 'medal_explorer_3', name: 'Explorer III', desc: 'Earn all 15 badges', badges: ALL_BADGE_IDS, threshold: 15 },
]

export const TROPHIES = [
  { id: 'trophy_master', name: 'Master of Trading', desc: 'Earn every medal',
    medals: MEDALS.map((m) => m.id), threshold: MEDALS.length },
]

// Pure helper — no React, no IO. Trophies are computed from the medal results of the
// same call. `earnedBadgeIds` may be a Set or any iterable of badge ids.
export function computeProgression(earnedBadgeIds) {
  const earned = earnedBadgeIds instanceof Set ? earnedBadgeIds : new Set(earnedBadgeIds || [])

  const medals = MEDALS.map((def) => {
    const earnedCount = def.badges.filter((id) => earned.has(id)).length
    return {
      ...def,
      earnedCount,
      earned: earnedCount >= def.threshold,
      progress: Math.min(1, earnedCount / def.threshold),
    }
  })
  const earnedMedalIds = new Set(medals.filter((m) => m.earned).map((m) => m.id))

  const trophies = TROPHIES.map((def) => {
    const earnedCount = def.medals.filter((id) => earnedMedalIds.has(id)).length
    return {
      ...def,
      earnedCount,
      earned: earnedCount >= def.threshold,
      progress: Math.min(1, earnedCount / def.threshold),
    }
  })

  return {
    medals,
    trophies,
    medalCount: medals.filter((m) => m.earned).length,
    trophyCount: trophies.filter((t) => t.earned).length,
  }
}
