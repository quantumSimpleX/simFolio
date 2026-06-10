import { StockRow } from './StockRow';
import { C } from '../tokens';

export function HoldingRow({ ticker, name, qty, value, pct, pos, compact = false, highlighted = false, onClick, onMouseEnter, onMouseLeave }) {
  return (
    <StockRow
      ticker={ticker}
      name={name}
      subtitle={<span style={{ color: C.ame600, fontWeight: 600 }}>{qty} shares</span>}
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
