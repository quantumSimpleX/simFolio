// conditions.js — evaluateConditions(): declarative conditions -> satisfied + progress.

/**
 * Evaluate a leaf comparison of a metric value against a numeric target.
 * @param {number} value
 * @param {'>='|'>'|'=='|'<'|'<='} op
 * @param {number} target
 * @returns {boolean}
 */
function compareLeaf(value, op, target) {
  switch (op) {
    case '>=': return value >= target
    case '>':  return value > target
    case '==': return value === target
    case '<':  return value < target
    case '<=': return value <= target
    default:   return false
  }
}

/** Recursively test a condition against computed values + ctx. */
function satisfies(cond, values, ctx) {
  if (!cond) return false
  if ('all' in cond) return cond.all.every((c) => satisfies(c, values, ctx))
  if ('any' in cond) return cond.any.some((c) => satisfies(c, values, ctx))
  if ('not' in cond) return !satisfies(cond.not, values, ctx)
  if ('custom' in cond) return !!cond.custom(ctx)
  // leaf
  const value = typeof values[cond.metric] === 'number' ? values[cond.metric] : 0
  return compareLeaf(value, cond.op, cond.value)
}

/** Clamp a 0..100 percentage. */
function clampPct(pct) {
  if (pct < 0) return 0
  if (pct > 100) return 100
  return pct
}

/**
 * Build the best-effort progress entry for an achievement. Leaf conditions with
 * a numeric target produce {id, value, target, pct}; composites report the min
 * child pct. Conditions without a numeric target (e.g. custom) produce nothing.
 * @returns {import('./types').Progress | null}
 */
function progressFor(id, cond, values) {
  const p = leafProgress(cond, values)
  if (!p) return null
  return { id, value: p.value, target: p.target, pct: clampPct(p.pct) }
}

/**
 * Reduce a (possibly composite) condition to a representative {value,target,pct}.
 * Returns null when no numeric leaf target is reachable.
 */
function leafProgress(cond, values) {
  if (!cond) return null
  if ('all' in cond) return minChild(cond.all, values)
  if ('any' in cond) return minChild(cond.any, values)
  if ('not' in cond) return leafProgress(cond.not, values)
  if ('custom' in cond) return null
  if (typeof cond.value !== 'number') return null
  const value = typeof values[cond.metric] === 'number' ? values[cond.metric] : 0
  const target = cond.value
  const pct = target === 0 ? 100 : (value / target) * 100
  return { value, target, pct }
}

function minChild(children, values) {
  let best = null
  for (const child of children) {
    const p = leafProgress(child, values)
    if (!p) continue
    if (best === null || clampPct(p.pct) < clampPct(best.pct)) best = p
  }
  return best
}

/**
 * Evaluate all achievement definitions.
 * @param {import('./types').AchievementDef[]} achievementDefs
 * @param {Record<string, number>} values  computed metric values
 * @param {Set<string>} earnedSet          already-earned achievement ids
 * @param {import('./types').EvalCtx} ctx   { values, gauges, now }
 * @returns {{ satisfied: string[], progress: import('./types').Progress[] }}
 */
export function evaluateConditions(achievementDefs, values, earnedSet, ctx) {
  const earned = earnedSet || new Set()
  const satisfied = []
  const progress = []

  for (const def of achievementDefs) {
    if (!earned.has(def.id) && satisfies(def.condition, values, ctx)) {
      satisfied.push(def.id)
    }
    const p = progressFor(def.id, def.condition, values)
    if (p) progress.push(p)
  }

  return { satisfied, progress }
}
