import { useMemo, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { C } from '../../tokens'
import { HeroAvatar } from '../../components/Primitives'
import { BadgeGlyphForIndex, MedalGlyph, TrophyGlyph } from '../../components/Badges'
import { ProgressRing } from '../../components/Charts'
import { Dialog, DialogPortal, DialogOverlay } from '../../components/ui/dialog'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Button } from '../../components/ui/button'
import { useAchievements } from '../../hooks/useAchievements'
import { useReveal } from '../../gamification/useGamification'
import { computeProgression, MEDALS, TROPHIES } from '../../gamification/defs'

// Expand a queue of freshly-awarded badge ids into an ordered reveal sequence,
// interleaving any medal/trophy thresholds a badge crosses right after it. Diffs
// computeProgression before/after each badge is added to the earned set, so every
// crossed threshold is queued — never dropped, even when one badge completes more
// than one medal (or a medal and the trophy) at once.
function buildRevealSequence(queueIds, earnedIds) {
  const running = new Set(earnedIds)
  queueIds.forEach((id) => running.delete(id)) // baseline: before this batch
  let before = computeProgression(running)

  const seq = []
  for (const badgeId of queueIds) {
    seq.push({ kind: 'badge', badgeId })
    running.add(badgeId)
    const after = computeProgression(running)
    after.medals.forEach((med, i) => {
      if (med.earned && !before.medals[i].earned) seq.push({ kind: 'medal', item: med })
    })
    after.trophies.forEach((tr, i) => {
      if (tr.earned && !before.trophies[i].earned) seq.push({ kind: 'trophy', item: tr })
    })
    before = after
  }
  return seq
}

// Pick the most meaningful medal a just-earned badge advances toward: the unearned
// medal it belongs to that is closest to completion (falls back to any containing
// medal). Returns a computeProgression medal (has earnedCount / threshold / progress).
function nearestMedalForBadge(badgeId, medals) {
  const containing = medals.filter((med) => med.badges.includes(badgeId))
  if (!containing.length) return null
  const unearned = containing.filter((med) => !med.earned)
  const candidates = unearned.length ? unearned : containing
  return candidates.reduce((best, med) => (med.progress > best.progress ? med : best), candidates[0])
}

const MOMENT_TYPES = {
  badge: {
    eyebrow: 'Badge earned',
    eyebrowColor: C.aqua400,
    title: 'First Trade',
    desc: "You made your first simulated trade. You're an investor now.",
    progressLabel: '1 of 10 toward your first medal',
    progressSub: 'Keep trading, exploring, and learning.',
    progressColor: C.ame400,
    progressVal: 1,
    heroeQuote: '"Every investor started exactly here — with one trade."',
    ctaLabel: 'Continue  →',
  },
  medal: {
    eyebrow: 'Medal earned',
    eyebrowColor: C.gold,
    title: 'Apprentice',
    desc: '10 badges collected. You\'re building real investing habits.',
    progressLabel: '1 of 10 toward your first trophy',
    progressSub: 'Earn 9 more medals to unlock a trophy.',
    progressColor: C.goldLight,
    progressVal: 1,
    heroeQuote: '"Patience compounds. So does knowledge."',
    ctaLabel: 'Continue  →',
  },
  trophy: {
    eyebrow: 'Trophy earned',
    eyebrowColor: C.goldLight,
    title: 'The Disciplined Investor',
    desc: '100 badges. 10 medals. You think like an investor — not a speculator.',
    // No progress ring: Master of Trading is the terminal achievement — there is no
    // next threshold to count toward. A plain "mastered every medal" line is shown.
    masteryLine: "You've mastered every medal.",
    progressColor: C.goldLight,
    heroeQuote: '"Discipline is the bridge between goals and accomplishment."',
    ctaLabel: 'Continue  →',
  },
}

export default function BadgeEarned() {
  const navigate = useNavigate()
  const { state } = useLocation()
  const { badges, medalCount } = useAchievements()
  const { currentId, queue, advance } = useReveal()
  const [open, setOpen] = useState(true)

  // Freeze the awarded-badge queue on mount so the reveal sequence stays stable
  // as advance() drains the shared queue underneath us.
  const [frozenQueue] = useState(() => queue)
  // Full earned set is stable across the reveal session (advancing the queue does
  // not un-earn badges), so it is safe to derive the sequence from it each render.
  const earnedIds = useMemo(
    () => new Set(badges.filter((b) => b.earned).map((b) => b.id)),
    [badges],
  )
  const seq = useMemo(
    () => (frozenQueue.length ? buildRevealSequence(frozenQueue, earnedIds) : []),
    [frozenQueue, earnedIds],
  )
  const [step, setStep] = useState(0)
  const item = seq[step]

  // The reveal sequence is the primary source. Router state is a fallback for
  // legacy/direct callers and the no-state smoke test. `tier` carries the moment
  // kind; legacy callers passed `type`.
  const tier = item ? item.kind : (state?.tier || state?.type || 'badge')
  const badge =
    (item?.kind === 'badge' && badges.find((b) => b.id === item.badgeId)) ||
    (!item && state?.badge) ||
    null

  // Index drives which glyph shows; -1 falls back to glyph 0.
  const badgeIndex = badge ? badges.findIndex(b => b.id === badge.id) : 0

  let m = MOMENT_TYPES[tier] || MOMENT_TYPES.badge
  if (tier === 'badge' && badge) {
    // Real progress toward the medal this badge most advances — its actual threshold
    // (which is 3, 4, or 5 for thematic medals; 5/10/15 for Explorer), never a fake
    // count/10 ladder.
    const { medals } = computeProgression(earnedIds)
    const med = nearestMedalForBadge(badge.id, medals)
    m = {
      ...MOMENT_TYPES.badge,
      title: badge.name,
      desc: badge.desc,
      progressVal: med ? med.earnedCount : 0,
      progressTotal: med ? med.threshold : 10,
      progressLabel: med
        ? `${med.earnedCount} of ${med.threshold} toward ${med.name}`
        : MOMENT_TYPES.badge.progressLabel,
    }
  } else if (tier === 'medal') {
    // Toward the single trophy (Master of Trading): its threshold is the medal count,
    // and the remaining-medals subtitle is derived from it — not a hardcoded "9 more".
    const total = TROPHIES[0]?.threshold ?? MEDALS.length
    const earnedMedals = medalCount ?? item?.item.earnedCount ?? 0
    const remaining = Math.max(0, total - earnedMedals)
    m = {
      ...MOMENT_TYPES.medal,
      ...(item?.kind === 'medal' ? { title: item.item.name, desc: item.item.desc } : {}),
      progressVal: earnedMedals,
      progressTotal: total,
      progressLabel: `${earnedMedals} of ${total} toward Master of Trading`,
      progressSub: remaining > 0
        ? `Earn ${remaining} more medal${remaining !== 1 ? 's' : ''} to unlock the trophy.`
        : 'Every medal earned — Master of Trading awaits.',
    }
  } else if (item?.kind === 'trophy') {
    m = { ...MOMENT_TYPES.trophy, title: item.item.name, desc: item.item.desc }
  }

  function dismiss() {
    if (item) {
      // Draining the sequence: pop one badge from the shared queue per badge step
      // (so the router driver does not bounce us back), advance medals locally, and
      // only leave once the whole sequence — badges and crossed medals — is drained.
      if (item.kind === 'badge' && currentId) advance()
      if (step < seq.length - 1) {
        setStep((s) => s + 1)
        return
      }
    }
    setOpen(false)
    navigate(-1)
  }

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) dismiss() }}>
      <DialogPortal>
        <DialogOverlay className="bg-ink-900" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed inset-0 z-50 flex flex-col bg-ink-900 font-sans focus:outline-none"
        >
          <div className="mx-auto box-border flex w-full max-w-[480px] flex-1 flex-col items-center justify-center gap-6 p-10">
            {/* Glyph */}
            <div className="flex items-center justify-center">
              {tier === 'badge'  && <BadgeGlyphForIndex index={badgeIndex < 0 ? 0 : badgeIndex} size={96} earned/>}
              {tier === 'medal'  && <MedalGlyph size={88} earned/>}
              {tier === 'trophy' && <TrophyGlyph size={100} earned/>}
            </div>

            {/* Text */}
            <div className="text-center">
              <div className="mb-2.5 font-sans text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: m.eyebrowColor }}>{m.eyebrow}</div>
              <DialogPrimitive.Title className="font-sans text-4xl font-bold leading-none tracking-[-0.02em] text-white">{m.title}</DialogPrimitive.Title>
              <div className="mt-2 font-sans text-[15px] leading-normal text-ink-400">{m.desc}</div>
            </div>

            {/* Progress card — trophy is terminal, so no ring/"toward X" affordance */}
            {tier === 'trophy' ? (
              <div className="w-full rounded-card border border-white/[0.08] bg-white/[0.05] px-5 py-4 text-center font-sans text-[15px] font-semibold text-white">
                {m.masteryLine}
              </div>
            ) : (
              <div
                className="flex w-full items-center gap-4 rounded-card border border-white/[0.08] bg-white/[0.05] px-5 py-4"
                role="progressbar"
                aria-valuenow={m.progressVal}
                aria-valuemin={0}
                aria-valuemax={m.progressTotal ?? 10}
                aria-label={m.progressLabel}
              >
                <ProgressRing value={m.progressVal} total={m.progressTotal ?? 10} size={52} color={m.progressColor}/>
                <div>
                  <div className="mb-[3px] font-sans text-[15px] font-semibold text-white">{m.progressLabel}</div>
                  <div className="font-sans text-[13px] text-ink-400">{m.progressSub}</div>
                </div>
              </div>
            )}

            {/* Hero quote */}
            <div className="flex w-full items-start gap-2.5 rounded-card bg-white/[0.04] px-4 py-3">
              <HeroAvatar id="warren" initials="WB" color="var(--ame-400)" size={44}/>
              <div>
                <blockquote className="font-sans text-[15px] italic leading-normal text-ink-400">{m.heroeQuote}</blockquote>
                <cite className="mt-1 block font-sans text-[11px] font-semibold not-italic text-ame-400/70">Warren Buffett</cite>
              </div>
            </div>
          </div>

          <div className="mx-auto box-border w-full max-w-[480px] flex-shrink-0 px-6 pb-9">
            <Button size="cta" onClick={dismiss} className="w-full bg-ame-400 font-bold text-ink-900 hover:bg-ame-400 hover:opacity-90">{m.ctaLabel}</Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  )
}
