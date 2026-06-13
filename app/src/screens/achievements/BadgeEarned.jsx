import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { C } from '../../tokens'
import { BadgeGlyphForIndex, MedalGlyph, TrophyGlyph } from '../../components/Badges'
import { ProgressRing } from '../../components/Charts'
import { Dialog, DialogPortal, DialogOverlay } from '../../components/ui/dialog'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Button } from '../../components/ui/button'

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
  const type = state?.type || 'badge'
  const m = MOMENT_TYPES[type] || MOMENT_TYPES.badge
  const [open, setOpen] = useState(true)

  function dismiss() {
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
              {type === 'badge'  && <BadgeGlyphForIndex index={0} size={96} earned/>}
              {type === 'medal'  && <MedalGlyph size={88} earned/>}
              {type === 'trophy' && <TrophyGlyph size={100} earned/>}
            </div>

            {/* Text */}
            <div className="text-center">
              <div className="mb-2.5 font-sans text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: m.eyebrowColor }}>{m.eyebrow}</div>
              <DialogPrimitive.Title className="font-display text-4xl font-bold leading-none tracking-[-0.02em] text-white">{m.title}</DialogPrimitive.Title>
              <div className="mt-2 font-sans text-[15px] leading-normal text-ink-400">{m.desc}</div>
            </div>

            {/* Progress card */}
            <div className="flex w-full items-center gap-4 rounded-card border border-white/[0.08] bg-white/[0.05] px-5 py-4">
              <ProgressRing value={m.progressVal} total={10} size={52} color={m.progressColor}/>
              <div>
                <div className="mb-[3px] font-sans text-[15px] font-semibold text-white">{m.progressLabel}</div>
                <div className="font-sans text-[13px] text-ink-400">{m.progressSub}</div>
              </div>
            </div>

            {/* Hero quote */}
            <div className="flex w-full items-start gap-2.5 rounded-card bg-white/[0.04] px-4 py-3">
              <div className="flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center rounded-pill border-[1.5px] border-ame-400/50 bg-ame-400/20 font-sans text-[9px] font-bold text-ame-400">WB</div>
              <div className="font-sans text-[13px] italic leading-normal text-ink-400">{m.heroeQuote}</div>
            </div>
          </div>

          <div className="mx-auto box-border w-full max-w-[480px] flex-shrink-0 px-6 pb-9">
            <Button size="cta" onClick={dismiss} className="w-full bg-white font-bold text-ink-900 hover:bg-white hover:opacity-90">{m.ctaLabel}</Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  )
}
