import { TopNav, BottomNav } from './Nav'
import { useIsMobile } from '../hooks/useBreakpoint'
import { cn } from '../lib/utils'

// Responsive app chrome: TopNav at every width (compact on mobile), plus on
// mobile a fixed bottom region that is either the tab BottomNav or a
// screen-supplied `footer` (e.g. a Buy/Sell action bar on detail screens).
// Content is a fluid, centered column with a max width and viewport-aware padding.
export function AppShell({ active, children, maxWidth = 1100, pad = true, footer = null }) {
  const mobile = useIsMobile()
  return (
    <div className="flex h-[calc(100dvh/var(--zoom))] w-full flex-col bg-paper">
      <TopNav active={active} />

      <div className="w-full flex-1 overflow-y-auto [-webkit-overflow-scrolling:touch]">
        <div
          className={cn(
            'mx-auto box-border w-full',
            pad
              ? (mobile ? 'px-2.5 pb-24 pt-4' : 'px-8 pb-10 pt-7')
              : (mobile ? 'pb-24' : 'p-0'),
          )}
          style={{ maxWidth }}
        >
          {children}
        </div>
      </div>

      {mobile && (
        <div className="fixed inset-x-0 bottom-0 z-50">
          {footer ?? <BottomNav active={active} />}
        </div>
      )}
    </div>
  )
}
