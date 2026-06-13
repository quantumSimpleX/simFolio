import { useNavigate } from 'react-router-dom'
import { Eyebrow } from '../../components/Primitives'
import { AppShell } from '../../components/AppShell'
import { PageHeader } from '../../components/Nav'
import { Card } from '../../components/ui/card'
import { useIsMobile } from '../../hooks/useBreakpoint'
import { BadgeGlyphForIndex, MedalGlyph, TrophyGlyph } from '../../components/Badges'
import { useAchievements } from '../../hooks/useAchievements'
import { cn } from '../../lib/utils'

export default function AchievementsMobile() {
  const navigate = useNavigate()
  const mobile = useIsMobile()
  const { badges, earnedCount, medalCount, trophyCount, isLoading } = useAchievements()

  const toNextMedal = 10 - (earnedCount % 10)

  return (
    <AppShell active="achievements" maxWidth={860}>
      <PageHeader title="Achievements"/>

      <div className="flex flex-col gap-5">
        {/* Progress summary */}
        <Card className="flex items-center gap-5 px-5 py-[18px]">
          <div className="flex-1">
            <div className="font-display text-[28px] font-bold leading-none tracking-[-0.02em] text-ink-900">
              {isLoading ? '…' : `${earnedCount} badge${earnedCount !== 1 ? 's' : ''}`}
            </div>
            <div className="mt-1 font-sans text-[13px] text-ink-400">
              {toNextMedal === 10 && medalCount === 0 ? '10 badges → first medal' : `${toNextMedal} more → next medal`}
            </div>
            <div className="mt-2.5 h-[5px] rounded-pill bg-ink-100">
              <div className="h-full rounded-pill bg-ame-400" style={{ width: `${((earnedCount % 10) / 10) * 100}%` }}/>
            </div>
            <div className="mt-1 font-sans text-[11px] text-ink-400">{earnedCount % 10} of 10 badges toward next medal</div>
          </div>
          <div className="flex flex-col items-center gap-2.5">
            <div className="flex items-end gap-2">
              <div className="text-center">
                <MedalGlyph size={36} earned={medalCount > 0}/>
                <div className="mt-1 font-sans text-[10px] text-ink-400">{medalCount} medal{medalCount !== 1 ? 's' : ''}</div>
              </div>
              <div className="text-center">
                <TrophyGlyph size={44} earned={trophyCount > 0}/>
                <div className="mt-1 font-sans text-[10px] text-ink-400">{trophyCount} trophies</div>
              </div>
            </div>
          </div>
        </Card>

        {/* Badge grid */}
        <div>
          <div className="mb-3"><Eyebrow>Badges · {earnedCount} earned of {badges.length}</Eyebrow></div>
          <div className={cn('grid gap-2.5', mobile ? 'grid-cols-3' : 'grid-cols-5')}>
            {badges.map((b, i) => (
              <Card
                key={b.id}
                onClick={() => b.earned && navigate('/badge-earned', { state: { badge: b } })}
                className={cn(
                  'flex flex-col items-center gap-1.5 px-2.5 py-3.5',
                  b.earned ? 'cursor-pointer border-ink-100 opacity-100' : 'cursor-default border-ink-50 opacity-50',
                )}
              >
                <BadgeGlyphForIndex index={i} size={36} earned={b.earned}/>
                <div className={cn('text-center font-sans text-xs font-semibold leading-tight', b.earned ? 'text-ink-900' : 'text-ink-400')}>{b.name}</div>
                {!b.earned && <div className="text-center font-sans text-[10px] leading-snug text-ink-300">{b.desc}</div>}
              </Card>
            ))}
          </div>
        </div>

        {/* Medal progress */}
        {medalCount > 0 && (
          <div>
            <div className="mb-3"><Eyebrow>Medals · {medalCount} earned</Eyebrow></div>
            <div className="flex gap-2.5">
              {Array.from({ length: medalCount }, (_, i) => (
                <Card key={i} className="flex max-w-[140px] flex-1 flex-col items-center gap-1.5 p-3.5">
                  <MedalGlyph size={40} earned/>
                  <div className="text-center font-sans text-xs font-semibold text-gold">Medal {i + 1}</div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
