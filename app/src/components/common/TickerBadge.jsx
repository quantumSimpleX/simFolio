import { cn } from '../../lib/utils'

const SIZES = {
  lg: 'h-[46px] w-[46px] text-[15px] transition-colors',
  md: 'h-[38px] w-[38px] text-[11px]',
  sm: 'h-9 w-9 text-[11px]',
}

export default function TickerBadge({ ticker, size = 'md', highlighted = false }) {
  return (
    <div className={cn(
      'flex flex-shrink-0 items-center justify-center rounded-input font-sans font-bold',
      SIZES[size],
      highlighted ? 'bg-ame-100 text-ame-600' : 'bg-ink-50 text-ink-500',
    )}>{ticker}</div>
  )
}
