import { cn } from '../lib/utils';

export function StockRow({
  ticker, name, subtitle,
  rightTop, rightBottom, rightBottomPos,
  highlighted = false, badge = null, compact = false,
  onClick, onMouseEnter, onMouseLeave,
}) {
  return (
    <div
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={cn(
        'flex items-center gap-3 border-t transition-colors',
        compact ? 'py-2.5' : 'py-3',
        highlighted ? 'border-ame-100 bg-ame-50' : 'border-ink-100 bg-transparent',
        onClick ? 'cursor-pointer' : 'cursor-default',
      )}
    >
      <div className={cn(
        'flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-input font-sans text-[11px] font-bold transition-colors',
        highlighted ? 'bg-ame-100 text-ame-600' : 'bg-ink-50 text-ink-500',
      )}>{ticker}</div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <div className={cn(
            'truncate font-sans text-base',
            name ? 'font-semibold text-ink-900' : 'font-normal text-ink-400',
          )}>
            {name || ticker}
          </div>
          {badge}
        </div>
        {subtitle && (
          <div className="mt-0.5 truncate font-sans text-base text-ink-600">{subtitle}</div>
        )}
      </div>

      <div className="flex-shrink-0 text-right">
        {rightTop && (
          <div className="font-sans text-base font-semibold text-ink-900">{rightTop}</div>
        )}
        {rightBottom && (
          <div className={cn(
            'mt-0.5 font-sans text-base',
            rightBottomPos === true ? 'text-aqua-600' : rightBottomPos === false ? 'text-red' : 'text-ink-400',
          )}>{rightBottom}</div>
        )}
      </div>
    </div>
  )
}
