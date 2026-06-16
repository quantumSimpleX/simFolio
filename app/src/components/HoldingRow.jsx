import { StockRow } from './StockRow';
import { TermUnderline } from './Primitives';

export function HoldingRow({ ticker, name, qty, value, pct, pos, compact = false, highlighted = false, onClick, onMouseEnter, onMouseLeave }) {
  return (
    <StockRow
      ticker={ticker}
      name={name}
      subtitle={<span className="font-semibold text-ame-600">{qty} <TermUnderline>shares</TermUnderline></span>}
      rightTop={`$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
      rightBottom={`${pos ? '+' : ''}${pct.toFixed(1)}%`}
      rightBottomPos={pos}
      highlighted={highlighted}
      compact={compact}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    />
  )
}
