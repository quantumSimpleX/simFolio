import { cn } from '../lib/utils'

// Toggle a ticker on/off the watchlist. 48px tall to align with the Buy CTA.
export function WatchlistButton({ watching, onClick, full }) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'flex h-12 flex-shrink-0 cursor-pointer items-center justify-center rounded-input border px-4 font-sans text-sm font-semibold transition-colors',
        watching ? 'border-ame-200 bg-ame-50 text-ame-600' : 'border-ink-200 bg-transparent text-ink-500',
        full && 'w-full',
      )}
    >
      {watching ? 'Watching' : '+ Watchlist'}
    </div>
  )
}
