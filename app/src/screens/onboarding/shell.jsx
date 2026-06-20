// Shared onboarding-flavoured layout primitives. Extracted from Onboarding.jsx so the hero
// selection grid can be reused outside onboarding (e.g. the "Find a new mentor" flow) while
// keeping the exact same look — brand panel on desktop, top bar on mobile, Sage header, etc.
import { Logo, SimPill, GuideAvatar } from '../../components/Primitives';
import BrandPanel from '../../components/BrandPanel';
import { cn } from '../../lib/utils';
import { fluid } from '../../lib/fluid';
import { useIsDesktop } from '../../hooks/useIsDesktop';

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
      <div className="flex flex-shrink-0 items-center justify-between border-b border-ink-100 bg-paper px-6 py-3.5">
        <Logo size={19}/>
        <SimPill/>
      </div>
      <div className="flex flex-1 justify-center overflow-auto">
        <div className="flex w-full max-w-[480px] flex-col gap-5 px-6 pt-5 pb-5">
          {children}
          {/* Real spacer (not padding): mobile Safari drops a scroll container's
              bottom padding from its scrollable area, leaving the last button flush
              against the screen edge. A flex-shrink-0 element is always scrollable. */}
          <div aria-hidden className="flex-shrink-0" style={{ height: 'calc(1.5rem + env(safe-area-inset-bottom))' }}/>
        </div>
      </div>
    </div>
  );
}

export function BackButton({ onBack }) {
  return (
    <button
      type="button"
      aria-label="Back"
      onClick={onBack}
      className="flex cursor-pointer items-center gap-1.5 self-start rounded-input font-sans font-semibold text-ink-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ame-400"
      style={{ fontSize: fluid(13, 15) }}
    >
      ← Back
    </button>
  );
}

// Segmented progress bar for the onboarding flow. Sits alongside the textual
// "step of total" counter (ProgressDots) and gives spatial feedback, especially
// on mobile where the brand panel is hidden. Completed segments fill ame-400.
export function OnboardingProgress({ step, total }) {
  return (
    <div
      role="progressbar"
      aria-valuenow={step}
      aria-valuemin={1}
      aria-valuemax={total}
      aria-label={`Step ${step} of ${total}`}
      className="flex gap-1"
    >
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={cn('h-1 flex-1 rounded-pill', i < step ? 'bg-ame-400' : 'bg-ink-100')}
        />
      ))}
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
        <div className="font-sans italic leading-normal text-ink-600" style={{ fontSize: fluid(15, 22) }}>{children}</div>
      </div>
    </div>
  );
}
