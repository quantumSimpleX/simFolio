// gamekit — domain-agnostic gamification engine.
// PURE: this folder must not import anything outside app/src/gamekit/.
//
// This file is the frozen API contract (T0). All shapes are JSDoc typedefs
// because the repo is plain JS (no TypeScript). See GAMreq.md §3 for the spec.

/**
 * @typedef {Object} GameEvent
 * @property {string} type           Event name, e.g. 'trade.placed'.
 * @property {number} [ts]           Epoch ms; defaults to clock.now() when folded.
 * @property {Record<string, any>} [props]
 */

/**
 * Comparison operators usable in matchers and leaf conditions.
 * @typedef {'eq'|'ne'|'gt'|'gte'|'lt'|'lte'|'in'} CmpOp
 */

/**
 * @typedef {Object} Matcher
 * @property {string} [type]                         Required event type (omit to match any).
 * @property {Record<string, {[op in CmpOp]?: any}>} [where]  Per-prop comparisons.
 */

/**
 * Metric reducer definition. `kind` selects the fold; remaining fields are kind-specific.
 * @typedef {Object} MetricDef
 * @property {string} id
 * @property {'count'|'distinct'|'sum'|'max'|'threshold-event'|'gauge'|'duration'|'streak'} kind
 * @property {Matcher} [match]            count/distinct/sum/max/threshold-event/duration/streak
 * @property {string} [prop]             distinct/sum/max/threshold-event
 * @property {CmpOp} [op]                threshold-event
 * @property {any} [value]              threshold-event
 * @property {string} [source]           gauge — key read from StateProvider
 * @property {'first'|'last'} [since]    duration
 * @property {string} [while]            duration — gauge source that must be truthy to count
 * @property {'day'|'week'} [period]     streak
 * @property {number} [target]           optional — enables progress bars
 */

/**
 * Achievement condition (recursive).
 * @typedef {(
 *   { metric: string, op: '>='|'>'|'=='|'<'|'<=', value: number }
 *   | { all: Condition[] }
 *   | { any: Condition[] }
 *   | { not: Condition }
 *   | { custom: (ctx: EvalCtx) => boolean }
 * )} Condition
 */

/**
 * @typedef {Object} AchievementDef
 * @property {string} id
 * @property {string} [name]
 * @property {string} [description]
 * @property {string} [tier]
 * @property {Object} [meta]
 * @property {Condition} condition
 */

/**
 * @typedef {Object} Progress
 * @property {string} id
 * @property {number} value
 * @property {number} target
 * @property {number} pct     0..100, clamped.
 */

/**
 * @typedef {Object} EvalCtx
 * @property {Record<string, number>} values   Computed metric values.
 * @property {Record<string, number>} gauges   Live gauge values.
 * @property {number} now
 */

/**
 * Ports — the host implements these adapters.
 * @typedef {Object} MetricStore
 * @property {(userId: string) => Promise<Record<string, any>>} get   metricId -> internal state
 * @property {(userId: string, deltas: Record<string, any>) => Promise<Record<string, any>>} apply
 *
 * @typedef {Object} StateProvider
 * @property {(userId: string) => Promise<Record<string, number>>} read
 *
 * @typedef {Object} AchievementStore
 * @property {(userId: string) => Promise<Set<string>>} earned
 * @property {(userId: string, ids: string[]) => Promise<void>} award
 *
 * @typedef {Object} Clock
 * @property {() => number} now
 *
 * @typedef {Object} Ports
 * @property {MetricStore} metricStore
 * @property {StateProvider} stateProvider
 * @property {AchievementStore} achievementStore
 * @property {Clock} [clock]
 */

/**
 * @typedef {Object} Engine
 * @property {(userId: string, events: GameEvent|GameEvent[]) => Promise<void>} track
 * @property {(userId: string) => Promise<{ unlocked: AchievementDef[], progress: Progress[] }>} evaluate
 * @property {(userId: string) => Promise<Progress[]>} progress
 */

export {}
