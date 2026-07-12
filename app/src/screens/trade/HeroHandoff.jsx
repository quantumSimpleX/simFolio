import { useNavigate } from 'react-router-dom'
import { CTA, GhostCTA, HeroAvatar } from '../../components/Primitives'
import { AppShell } from '../../components/AppShell'
import { SageMsg } from '../../components/HeroMessage'
import { useOnboardingAnswers } from '../../hooks/useOnboardingAnswers'
import { useHeroRanking } from '../../hooks/useHeroRanking'
import { useHeroSelections } from '../../hooks/useHeroSelections'
import { useChangeHero } from '../../hooks/useChangeHero'
import { useIsDesktop } from '../../hooks/useIsDesktop'
import { HERO_DATA, heroIdFromName } from '../../data/heroes'

// Build the "matched based on…" signal from the user's stated goal. Falls back to a
// generic line when no goal was captured during onboarding.
function matchSignal(answers) {
  const goals = Array.isArray(answers?.goal) ? answers.goal : answers?.goal ? [answers.goal] : []
  const goal = goals[0]
  return goal
    ? `Matched based on your goal to ${goal.toLowerCase()}.`
    : 'Matched based on your investment preferences.'
}

export default function HeroHandoff() {
  const navigate = useNavigate()
  const isDesktop = useIsDesktop()
  const { answers } = useOnboardingAnswers()

  const pinnedId = heroIdFromName(answers.heroMention)
  const { heroIds, isLoading, isError } = useHeroRanking(answers, {
    count: 1,
    includeWarren: true,
    pinnedId,
  })

  // Top-ranked hero drives the intro card; fall back to Warren while ranking loads or errors.
  const heroId = isLoading || isError || !heroIds?.[0] ? 'warren' : heroIds[0]
  const hero = HERO_DATA[heroId] ?? HERO_DATA.warren

  const { heroes: existingSelections } = useHeroSelections()
  const alreadySelected = existingSelections.length > 0
  const { mutate: changeHero } = useChangeHero()

  // Persist the recommended hero (unless the user already picked one — don't clobber),
  // then route on. Persisting fires `hero.unlocked`, which earns the `mentor` badge.
  function proceed(to) {
    if (!alreadySelected) changeHero(heroId)
    navigate(to)
  }

  return (
    <AppShell active="portfolio">
      <div className="mx-auto flex max-w-[560px] flex-col gap-5">
        <SageMsg text="You just bought your first stock. You're officially an investor."/>
        <SageMsg text={`Before you continue — there's someone I think you should meet. ${hero.name} has been following what you've shared.`}/>

        {/* Recommended hero intro card */}
        <div className="flex items-start gap-4 rounded-card border-[1.5px] border-ame-400/30 bg-white px-5 py-[18px]">
          <HeroAvatar id={heroId} initials={hero.initials} color={hero.color} size={48}/>
          <div className="flex-1">
            <div className="mb-0.5 font-sans text-[17px] font-bold text-ink-900">{hero.name}</div>
            <div className="mb-2.5 font-sans text-[13px]" style={{ color: hero.color }}>{hero.style} · Your first advisor</div>
            <div className="font-sans text-sm italic leading-relaxed text-ink-600">
              {hero.philosophy}
            </div>
          </div>
        </div>

        {/* Match signal */}
        <div className="flex items-center gap-2.5 rounded-input border border-ame-100 bg-ame-50 px-3.5 py-2.5">
          <div className="h-1.5 w-1.5 flex-shrink-0 rounded-pill bg-ame-400"/>
          <div className="font-sans text-[13px] leading-snug text-ame-600">
            {matchSignal(answers)}
          </div>
        </div>

        <div className="font-sans text-sm leading-relaxed text-ink-500">
          From here, {hero.name} will be your guide. They can discuss any trade, question your thinking, and suggest things worth reading. The Sage steps back.
        </div>

        <div className="mt-1 flex flex-col gap-2.5">
          <CTA label={`Talk to ${hero.name}  →`} full onClick={() => proceed(isDesktop ? '/portfolio' : '/ask')}/>
          <GhostCTA label="Continue buying first" onClick={() => proceed('/markets')}/>
        </div>
      </div>
    </AppShell>
  )
}
