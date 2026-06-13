import { useNavigate } from 'react-router-dom'
import { CTA, GhostCTA } from '../../components/Primitives'
import { AppShell } from '../../components/AppShell'
import { SageMsg } from '../../components/HeroMessage'

export default function HeroHandoff() {
  const navigate = useNavigate()

  return (
    <AppShell active="portfolio">
      <div className="mx-auto flex max-w-[560px] flex-col gap-5">
        <SageMsg text="You just bought your first stock. You're officially an investor."/>
        <SageMsg text="Before you continue — there's someone I think you should meet. Warren has been following what you've shared, and has a thought about Apple."/>

        {/* Warren intro card */}
        <div className="flex items-start gap-4 rounded-card border-[1.5px] border-ame-400/30 bg-white px-5 py-[18px]">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-pill border-[1.5px] border-ame-400/35 bg-ame-400/10 font-sans text-base font-bold text-ame-400">WB</div>
          <div className="flex-1">
            <div className="mb-0.5 font-sans text-[17px] font-bold text-ink-900">Warren Buffett</div>
            <div className="mb-2.5 font-sans text-[13px] text-ame-400">Value investor · Your first advisor</div>
            <div className="font-sans text-sm italic leading-relaxed text-ink-600">
              "The best time to buy a wonderful company at a fair price is better than a wonderful price at a fair company. Apple qualifies on both counts."
            </div>
          </div>
        </div>

        {/* Match signal */}
        <div className="flex items-center gap-2.5 rounded-input border border-ame-100 bg-ame-50 px-3.5 py-2.5">
          <div className="h-1.5 w-1.5 flex-shrink-0 rounded-pill bg-ame-400"/>
          <div className="font-sans text-[13px] leading-snug text-ame-600">
            Matched based on your long-term goal and interest in quality businesses.
          </div>
        </div>

        <div className="font-sans text-sm leading-relaxed text-ink-500">
          From here, Warren will be your guide. He can discuss any trade, question your thinking, and suggest things worth reading. The Sage steps back.
        </div>

        <div className="mt-1 flex flex-col gap-2.5">
          <CTA label="Talk to Warren  →" full onClick={() => navigate('/ask')}/>
          <GhostCTA label="Continue buying first" onClick={() => navigate('/markets')}/>
        </div>
      </div>
    </AppShell>
  )
}
