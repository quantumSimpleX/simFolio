import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { C } from '../../tokens'
import { BadgeGlyphForIndex, MedalGlyph, TrophyGlyph } from '../../components/Badges'
import { ProgressRing } from '../../components/Charts'
import { Dialog, DialogPortal, DialogOverlay } from '../../components/ui/dialog'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Button } from '../../components/ui/button'
import { useAchievements } from '../../hooks/useAchievements'
import { useReveal } from '../../gamification/useGamification'

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
    progressLabel: '1 of 10 toward Master of Trading',
    progressSub: 'The rarest achievement in simFolio.',
    progressColor: C.goldLight,
    progressVal: 1,
    heroeQuote: '"Discipline is the bridge between goals and accomplishment."',
    ctaLabel: 'Continue  →',
  },
}

export default function BadgeEarned() {
  const navigate = useNavigate()
  const { state } = useLocation()
  const { badges, earnedCount } = useAchievements()
  const { currentId, queue, advance } = useReveal()
  // The reveal queue is the primary source: show the badge at the head of the
  // queue. Router state is a fallback for legacy/direct callers and the no-state
  // smoke test. `tier` carries the moment kind; legacy callers passed `type`.
  const queuedBadge = currentId ? badges.find((b) => b.id === currentId) : null
  const tier = queuedBadge ? 'badge' : (state?.tier || state?.type || 'badge')
  const badge = queuedBadge || state?.badge || null
  const [open, setOpen] = useState(true)

  // Index drives which glyph shows; -1 falls back to glyph 0.
  const badgeIndex = badge ? badges.findIndex(b => b.id === badge.id) : 0

  let m = MOMENT_TYPES[tier] || MOMENT_TYPES.badge
  if (tier === 'badge' && badge) {
    const towardMedal = earnedCount % 10 === 0 ? 10 : earnedCount % 10
    m = {
      ...MOMENT_TYPES.badge,
      title: badge.name,
      desc: badge.desc,
      progressVal: towardMedal,
      progressLabel: `${towardMedal} of 10 toward your first medal`,
    }
  }

  function dismiss() {
    // Draining the queue: advance to the next unlock and keep the moment open.
    // Only leave once nothing remains to reveal.
    if (currentId) {
      advance()
      const remaining = queue.length - 1
      if (remaining > 0) return
    }
    setOpen(false)
    navigate('/portfolio')
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

            {/* Progress card */}
            <div
              className="flex w-full items-center gap-4 rounded-card border border-white/[0.08] bg-white/[0.05] px-5 py-4"
              role="progressbar"
              aria-valuenow={m.progressVal}
              aria-valuemin={0}
              aria-valuemax={10}
              aria-label={m.progressLabel}
            >
              <ProgressRing value={m.progressVal} total={10} size={52} color={m.progressColor}/>
              <div>
                <div className="mb-[3px] font-sans text-[15px] font-semibold text-white">{m.progressLabel}</div>
                <div className="font-sans text-[13px] text-ink-400">{m.progressSub}</div>
              </div>
            </div>

            {/* Hero quote */}
            <div className="flex w-full items-start gap-2.5 rounded-card bg-white/[0.04] px-4 py-3">
              <div aria-label="Warren Buffett" role="img" className="flex h-[28px] w-[28px] flex-shrink-0 items-center justify-center rounded-pill border-[1.5px] border-ame-400/50 bg-ame-400/20 font-sans text-[11px] font-bold text-ame-400">WB</div>
              <blockquote className="font-sans text-[13px] italic leading-normal text-ink-400">{m.heroeQuote}</blockquote>
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
