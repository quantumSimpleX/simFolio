import { useNavigate } from 'react-router-dom'
import { Eyebrow } from '../../components/Primitives'
import { AppShell } from '../../components/AppShell'
import { PageHeader } from '../../components/Nav'
import { Card } from '../../components/ui/card'
import { useIsMobile } from '../../hooks/useBreakpoint'
import { BadgeGlyphForIndex, MedalGlyph, TrophyGlyph } from '../../components/Badges'
import { useAchievements } from '../../hooks/useAchievements'
import { cn } from '../../lib/utils'

// Milestone ("Explorer") medals are count-based across every badge, not a themed
// subset — they live in the shelf only and never head a badge group.
const isExplorer = (m) => m.id.startsWith('medal_explorer')

// One glyph + name + "3 of 4" progress in the summary shelf. Earned items go gold.
function ShelfItem({ name, earned, count, total, children }) {
  return (
    <div className="flex w-[62px] flex-col items-center text-center">
      {children}
      <div className={cn('mt-1 font-sans text-[10px] font-semibold leading-tight', earned ? 'text-gold' : 'text-ink-600')}>{name}</div>
      <div className="font-sans text-[10px] text-ink-400">{earned ? 'Earned' : `${count} of ${total}`}</div>
    </div>
  )
}

function BadgeCard({ badge: b, index, onOpen }) {
  return (
    <Card
      role="button"
      tabIndex={b.earned ? 0 : -1}
      aria-disabled={!b.earned}
      data-state={b.earned ? 'earned' : 'locked'}
      aria-label={b.earned ? `${b.name} badge — earned` : `${b.name} badge — locked: ${b.desc}`}
      onClick={() => onOpen(b)}
      onKeyDown={(e) => {
        if (b.earned && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          onOpen(b)
        }
      }}
      className={cn(
        'flex flex-col items-center gap-1.5 px-2.5 py-3.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ame-400',
        b.earned ? 'cursor-pointer border-ink-100' : 'cursor-default border-ink-50',
      )}
    >
      <BadgeGlyphForIndex index={index} size={36} earned={b.earned}/>
      <div className={cn('text-center font-sans text-xs font-semibold leading-tight', b.earned ? 'text-ink-900' : 'text-ink-700')}>{b.name}</div>
      {!b.earned && <div className="text-center font-sans text-[10px] leading-snug text-ink-500">{b.desc}</div>}
    </Card>
  )
}

export default function AchievementsMobile() {
  const navigate = useNavigate()
  const mobile = useIsMobile()
  const { badges, medals, trophies, earnedCount, medalCount, isLoading } = useAchievements()

  const byId = Object.fromEntries(badges.map((b) => [b.id, b]))
  const indexOf = (id) => badges.findIndex((b) => b.id === id)
  const thematic = medals.filter((m) => !isExplorer(m))
  const trophy = trophies[0]

  const openBadge = (b) => b.earned && navigate('/badge-earned', { state: { badge: b } })

  return (
    <AppShell active="achievements" maxWidth={860}>
      <PageHeader title="Achievements"/>

      <div className="flex flex-col gap-5">
        {/* Progress summary + medal shelf */}
        <Card className="px-5 py-[18px]">
          <div className="font-sans text-[28px] font-bold leading-none tracking-[-0.02em] text-ink-900">
            {isLoading ? '…' : `${earnedCount} badge${earnedCount !== 1 ? 's' : ''}`}
          </div>
          <div className="mt-1 font-sans text-[13px] text-ink-500">{medalCount} of {medals.length} medals earned</div>

          <div className="mt-4 flex flex-wrap items-start gap-x-4 gap-y-3">
            {medals.map((m) => (
              <ShelfItem key={m.id} name={m.name} earned={m.earned} count={m.earnedCount} total={m.threshold}>
                <MedalGlyph size={34} earned={m.earned} label={`${m.name} — ${m.earned ? 'earned' : `${m.earnedCount} of ${m.threshold}`}`}/>
              </ShelfItem>
            ))}
            {trophy && (
              <ShelfItem name={trophy.name} earned={trophy.earned} count={trophy.earnedCount} total={trophy.threshold}>
                <TrophyGlyph size={40} earned={trophy.earned} label={`${trophy.name} — ${trophy.earned ? 'earned' : `${trophy.earnedCount} of ${trophy.threshold}`}`}/>
              </ShelfItem>
            )}
          </div>
        </Card>

        {/* Badge grid — grouped under the four thematic medals */}
        {thematic.map((m) => {
          const items = m.badges.map((id) => byId[id]).filter(Boolean)
          if (!items.length) return null
          return (
            <div key={m.id}>
              <div className="mb-2"><Eyebrow as="h2">{m.name} — {m.earnedCount} of {m.threshold}</Eyebrow></div>
              <div
                className="mb-3 h-[4px] rounded-pill bg-ink-100"
                role="progressbar"
                aria-valuenow={m.earnedCount}
                aria-valuemin={0}
                aria-valuemax={m.threshold}
                aria-label={`${m.name} progress`}
              >
                <div className="h-full rounded-pill bg-ame-400" style={{ width: `${m.progress * 100}%` }}/>
              </div>
              <div className={cn('grid gap-2.5', mobile ? 'grid-cols-3' : 'grid-cols-5')}>
                {items.map((b) => (
                  <BadgeCard key={b.id} badge={b} index={indexOf(b.id)} onOpen={openBadge}/>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </AppShell>
  )
}
