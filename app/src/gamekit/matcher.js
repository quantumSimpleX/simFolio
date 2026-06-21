// matcher.js — event matching + value comparisons (pure, no IO).

/**
 * Compare a value against a target using a comparison operator.
 * Missing values (undefined) never satisfy ordered ops (gt/gte/lt/lte).
 * @param {any} value
 * @param {import('./types').CmpOp} op
 * @param {any} target
 * @returns {boolean}
 */
export function compare(value, op, target) {
  switch (op) {
    case 'eq':  return value === target
    case 'ne':  return value !== target
    case 'in':  return Array.isArray(target) && target.includes(value)
    case 'gt':  return value !== undefined && value !== null && value > target
    case 'gte': return value !== undefined && value !== null && value >= target
    case 'lt':  return value !== undefined && value !== null && value < target
    case 'lte': return value !== undefined && value !== null && value <= target
    default:    return false
  }
}

/**
 * Test whether an event satisfies a matcher.
 * Empty matcher (or undefined) matches any event. Missing props never throw.
 * @param {import('./types').GameEvent} event
 * @param {import('./types').Matcher} [matcher]
 * @returns {boolean}
 */
export function matchEvent(event, matcher) {
  if (!matcher) return true
  if (matcher.type !== undefined && event.type !== matcher.type) return false
  const where = matcher.where
  if (!where) return true
  const props = event.props || {}
  for (const prop of Object.keys(where)) {
    const ops = where[prop]
    for (const op of Object.keys(ops)) {
      if (!compare(props[prop], /** @type {any} */ (op), ops[op])) return false
    }
  }
  return true
}
