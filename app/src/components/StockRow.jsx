import { C, SANS } from '../tokens';

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
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: compact ? '10px 0' : '12px 0',
        borderTop: `1px solid ${highlighted ? C.ame100 : C.ink100}`,
        background: highlighted ? C.ame50 : 'transparent',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'background 0.12s, border-color 0.12s',
      }}
    >
      <div style={{
        width: 38, height: 38,
        background: highlighted ? C.ame100 : C.ink50,
        borderRadius: 4, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: SANS, fontWeight: 700, fontSize: 11,
        color: highlighted ? C.ame600 : C.ink500,
        transition: 'background 0.12s, color 0.12s',
      }}>{ticker}</div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ fontFamily: SANS, fontWeight: name ? 600 : 400, fontSize: 16, color: name ? C.ink900 : C.ink400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {name || ticker}
          </div>
          {badge}
        </div>
        {subtitle && (
          <div style={{ fontFamily: SANS, fontSize: 16, color: C.ink600, marginTop: 2 }}>{subtitle}</div>
        )}
      </div>

      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        {rightTop && (
          <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: 16, color: C.ink900 }}>{rightTop}</div>
        )}
        {rightBottom && (
          <div style={{
            fontFamily: SANS, fontSize: 16, marginTop: 2,
            color: rightBottomPos === true ? C.aqua600 : rightBottomPos === false ? C.red : C.ink400,
          }}>{rightBottom}</div>
        )}
      </div>
    </div>
  )
}
