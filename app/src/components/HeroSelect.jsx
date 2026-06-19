import { useState } from 'react';
import { cn } from '../lib/utils';
import { CTA, HeroAvatar } from './Primitives';
import { HERO_DATA } from '../data/heroes';
import { ScreenShell, SageHeader, BackButton, fluid, useIsDesktop } from '../screens/onboarding/shell';

// Reusable 8-hero selection screen. Used both at the end of onboarding (Warren pinned, "Ask {name}")
// and by the "Find a new mentor" flow (8 of 20, "Make {name} my mentor"). Copy + CTA wording are
// passed in by the caller so the same grid serves both contexts.
export function HeroSelect({
  heroIds,
  loading,
  onChoose,
  saving,
  onBack,
  message,
  loadingMessage,
  ctaPrefix = 'Ask',
  ctaSuffix = '',
}) {
  const [picked, setPicked] = useState(null);
  const isDesktop = useIsDesktop();
  const avatarSize = isDesktop ? 48 : 34;

  return (
    <ScreenShell>
      {onBack && <BackButton onBack={onBack}/>}

      <SageHeader avatarSize={avatarSize} isDesktop={isDesktop}>
        {loading ? loadingMessage : message}
      </SageHeader>

      {loading ? (
        <div className="grid grid-cols-2 gap-2.5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-[88px] animate-pulse rounded-card border-[1.5px] border-ink-100 bg-ink-50"/>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2.5">
          {heroIds.map(id => {
            const h = HERO_DATA[id];
            const isPicked = picked === id;
            return (
              <div
                key={id}
                onClick={() => setPicked(id)}
                className={cn(
                  'flex cursor-pointer items-center gap-3 rounded-card border-[1.5px] p-3',
                  isPicked ? 'border-ame-400 bg-ame-50' : 'border-ink-200 bg-white',
                )}
              >
                <HeroAvatar id={id} initials={h.initials} color={h.color} size={isDesktop ? 64 : 52}/>
                <div className="min-w-0 flex-1">
                  <div className="font-sans font-semibold text-ink-900" style={{ fontSize: fluid(15, 17) }}>{h.name}</div>
                  <div className="mt-0.5 font-sans leading-snug text-ink-400" style={{ fontSize: fluid(12, 14) }}>{h.style}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CTA
        label={picked ? `${ctaPrefix} ${HERO_DATA[picked].name}${ctaSuffix}  →` : 'Pick an expert to continue'}
        full
        loading={saving}
        disabled={!picked}
        onClick={() => picked && onChoose(picked)}
      />
    </ScreenShell>
  );
}
