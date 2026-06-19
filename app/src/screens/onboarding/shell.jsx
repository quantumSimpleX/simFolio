// Shared onboarding-flavoured layout primitives. Extracted from Onboarding.jsx so the hero
// selection grid can be reused outside onboarding (e.g. the "Find a new mentor" flow) while
// keeping the exact same look — brand panel on desktop, top bar on mobile, Sage header, etc.
import { useState, useEffect } from 'react';
import { Logo, SimPill, GuideAvatar } from '../../components/Primitives';
import BrandPanel from '../../components/BrandPanel';
import { cn } from '../../lib/utils';

// Fluid type: scales linearly from `min`px at 480px viewport to `max`px at 1280px viewport
export function fluid(min, max) {
  return `clamp(${min}px, calc(${min}px + ${max - min} * ((100vw - 480px) / 800)), ${max}px)`;
}

export function useIsDesktop() {
  const [wide, setWide] = useState(() => window.innerWidth >= 768);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const handler = e => setWide(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return wide;
}

// Desktop: persistent brand panel on the left, content on the right.
// Mobile: top nav bar with content below.
export function ScreenShell({ children }) {
  const isDesktop = useIsDesktop();

  if (isDesktop) {
    return (
      <div className="flex h-[100dvh] w-full overflow-hidden bg-paper">
        <div className="w-[45%] min-w-[420px] max-w-[620px] flex-shrink-0">
          <BrandPanel/>
        </div>
        <div className="flex flex-1 justify-center overflow-auto px-12 pb-12 pt-14">
          <div className="flex h-fit w-full max-w-[640px] flex-col gap-7">
            {children}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[100dvh] w-full flex-col bg-paper">
      <div className="flex flex-shrink-0 items-center justify-between border-b border-ink-100 bg-white px-6 py-3.5">
        <Logo size={19}/>
        <SimPill/>
      </div>
      <div className="flex flex-1 justify-center overflow-auto">
        <div className="flex w-full max-w-[480px] flex-col gap-5 px-6 pb-8 pt-5">
          {children}
        </div>
      </div>
    </div>
  );
}

export function BackButton({ onBack }) {
  return (
    <div
      onClick={onBack}
      className="flex cursor-pointer items-center gap-1.5 self-start font-sans font-semibold text-ink-400"
      style={{ fontSize: fluid(13, 15) }}
    >
      ← Back
    </div>
  );
}

export function SageHeader({ avatarSize, isDesktop, children }) {
  return (
    <div className="flex items-start" style={{ gap: isDesktop ? 18 : 10 }}>
      <GuideAvatar size={avatarSize}/>
      <div className={cn('flex-1', isDesktop && 'pt-1')}>
        <div
          className="font-sans font-semibold uppercase tracking-[0.14em] text-ink-400"
          style={{ fontSize: fluid(11, 13), marginBottom: isDesktop ? 8 : 6 }}
        >Sage</div>
        <div className="font-sans leading-normal text-ink-600" style={{ fontSize: fluid(15, 22) }}>{children}</div>
      </div>
    </div>
  );
}
