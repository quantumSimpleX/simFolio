import { C } from '../../tokens';
import { Mark, SimPill, CTA, SocialBtn, NavToggles, HeroAvatar } from '../../components/Primitives';
import QSWordmark from '../../components/QSWordmark';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils';

export default function WelcomeMobile() {
  const navigate = useNavigate();
  return (
    <div className="flex min-h-[calc(100dvh/var(--zoom))] w-full max-w-[390px] flex-col bg-paper">
      <div className="flex flex-1 flex-col px-8 py-4">
        <div className="flex flex-1 flex-col items-center justify-center gap-6">
          <div className="flex flex-col items-start gap-2.5">
            <Mark size={48}/>
            <div className="flex items-center gap-1.5 opacity-35">
              <span className="font-sans text-[11px] text-ink-500">by</span>
              <QSWordmark onDark={false} size={28}/>
            </div>
          </div>
          <div className="max-w-[280px] text-center">
            <div className="font-sans text-[18px] font-normal leading-relaxed text-ink-600">
              Learn investing by doing it.<br/>With legendary investors as your guides.
            </div>
          </div>
          <SimPill/>
          <div className="flex">
            {[['warren','WB',C.ame400],['cathie','CW',C.aqua400],['ray','RD',C.gold]].map(([id,init,color],i) => (
              <div
                key={id}
                className={cn('rounded-pill border-2 border-white', i > 0 && '-ml-3')}
                style={{ zIndex:4-i }}
              >
                <HeroAvatar id={id} initials={init} color={color} size={60}/>
              </div>
            ))}
            <div className="z-0 -ml-3 flex h-[64px] w-[64px] items-center justify-center rounded-pill border-2 border-white bg-ink-50 font-sans text-[13px] text-ink-400">+17</div>
          </div>
          <div className="font-sans text-[13px] text-ink-400">20 legendary investors in the library</div>
        </div>
        <div className="flex flex-col gap-2.5 pb-2">
          <CTA label="Get started  →" full onClick={() => navigate('/sign-up')}/>
          <CTA label="Sign in" full ghost onClick={() => navigate('/sign-in')}/>
          <div className="flex gap-2">
            <SocialBtn provider="Google"/>
            <SocialBtn provider="Apple"/>
          </div>
          <div className="flex justify-end pt-1">
            <NavToggles/>
          </div>
        </div>
      </div>
    </div>
  );
}
