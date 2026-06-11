import { C } from '../tokens'
import { TopNav, BottomNav } from './Nav'
import { useIsMobile } from '../hooks/useBreakpoint'

// Responsive app chrome: TopNav at every width (compact on mobile), plus on
// mobile a fixed bottom region that is either the tab BottomNav or a
// screen-supplied `footer` (e.g. a Buy/Sell action bar on detail screens).
// Content is a fluid, centered column with a max width and viewport-aware padding.
export function AppShell({ active, children, maxWidth = 1100, pad = true, footer = null }) {
  const mobile = useIsMobile()
  return (
    <div style={{ minHeight: '100dvh', width: '100%', display: 'flex', flexDirection: 'column', background: C.paper }}>
      <TopNav active={active} />

      <div style={{ flex: 1, width: '100%', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <div
          style={{
            width: '100%',
            maxWidth,
            margin: '0 auto',
            boxSizing: 'border-box',
            padding: pad ? (mobile ? '16px 16px 96px' : '28px 32px 40px') : (mobile ? '0 0 96px' : 0),
          }}
        >
          {children}
        </div>
      </div>

      {mobile && (
        <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 50 }}>
          {footer ?? <BottomNav active={active} />}
        </div>
      )}
    </div>
  )
}
