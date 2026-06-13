import { cn } from '../lib/utils'

// Red outline "Sell" action used on the StockDetail trade panel/footer.
export function SellButton({ ticker, navigate, full }) {
  return (
    <div
      onClick={() => navigate(`/sell/${ticker}`)}
      className={cn(
        'flex h-12 flex-shrink-0 cursor-pointer items-center justify-center rounded-input border border-red px-4 font-sans text-[15px] font-semibold text-red',
        full && 'w-full',
      )}
    >
      Sell
    </div>
  )
}
