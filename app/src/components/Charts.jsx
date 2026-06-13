import { useState, useRef, useEffect } from 'react';
import { C, SANS } from '../tokens';

const RANGES = ['1W','1M','3M','1Y','All'];

export function PortfolioChart({ width=342, height=80 }) {
  const pts = [0.55,0.48,0.52,0.44,0.50,0.42,0.38,0.41,0.35,0.28,0.32,0.24,0.18,0.22,0.15,0.10,0.13,0.08,0.04,0.02];
  const w = width, h = height;
  const coords = pts.map((v,i) => `${(i/(pts.length-1))*w},${v*h}`).join(' ');
  const lastX = w, lastY = pts[pts.length-1]*h;
  const labels = ['Jan','Mar','May','Now'];
  return (
    <div style={{ position:'relative', width, height:height+20 }}>
      <svg width={w} height={h} style={{ display:'block' }}>
        <polyline points={coords} fill="none" stroke={C.aqua400} strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round"/>
        <circle cx={lastX} cy={lastY} r={3} fill={C.aqua400}/>
      </svg>
      <div style={{ display:'flex', justifyContent:'space-between', marginTop:4, paddingRight:2 }}>
        {labels.map(l => (
          <div key={l} style={{ fontSize:11, color:C.ink400, fontFamily:"'Barlow Condensed',sans-serif" }}>{l}</div>
        ))}
      </div>
    </div>
  );
}

export function MiniChart({ height=280, candles=[], isLoading=false, isError=false, range='3M', overlayCandles=null }) {
  const font = "'Barlow Condensed', sans-serif"
  const svgRef = useRef(null)
  const [w, setW] = useState(0)
  const [hoverIdx, setHoverIdx] = useState(null)

  useEffect(() => {
    if (!svgRef.current) return
    const ro = new ResizeObserver(e => setW(e[0].contentRect.width))
    ro.observe(svgRef.current)
    return () => ro.disconnect()
  }, [])

  const hasData = !isLoading && !isError && candles?.length >= 2

  const longRange = range === '1Y' || range === 'All'
  const fmtDate  = t => {
    const d = new Date(t * 1000)
    const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,'0'), day = String(d.getDate()).padStart(2,'0')
    return longRange ? `${y}/${m}/${day}` : `${d.getMonth()+1}/${d.getDate()}`
  }
  const fmtPrice = v => `$${v.toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 })}`
  // 3 significant digits keeps the y gutter narrow
  const fmtYLbl  = v => {
    const sig = n => String(Number(n.toPrecision(3)))
    if (v >= 1e6) return `$${sig(v/1e6)}M`
    if (v >= 1e3) return `$${sig(v/1e3)}k`
    return `$${sig(v)}`
  }

  // Chart geometry — only computed when data is available
  const padR = 8, padT = 8, padB = longRange ? 26 : 20
  const plotH = height - padT - padB
  let padL = 44, plotW = w - padL - padR

  let prices, timestamps, min, max, priceRange, color, px, py, points, yLines, xLabels, overlayPoints
  if (hasData && w > 0) {
    prices     = candles.map(c => c.c)
    timestamps = candles.map(c => c.t)
    min        = Math.min(...prices)
    max        = Math.max(...prices)
    priceRange = max - min || 1
    yLines     = Array.from({ length:6 }, (_, i) => min + priceRange * (i / 5))
    // Gutter hugs the widest y label (Barlow Condensed 11px ≈ 5.2px/char)
    padL       = 8 + Math.max(...yLines.map(v => fmtYLbl(v).length)) * 5.2
    plotW      = w - padL - padR
    color      = prices[prices.length-1] >= prices[0] ? C.aqua400 : C.red
    px         = i => padL + (i / (prices.length - 1)) * plotW
    py         = v => padT + plotH - ((v - min) / priceRange) * plotH
    points     = prices.map((v, i) => `${px(i)},${py(v)}`).join(' ')
    const X_COUNT = w < 400 ? 3 : w < 650 ? 5 : 10
    xLabels    = Array.from({ length:X_COUNT }, (_, i) => {
      const idx = Math.round(i * (prices.length - 1) / (X_COUNT - 1))
      return { x:px(idx), t:timestamps[idx], anchor: i===0?'start':i===X_COUNT-1?'end':'middle' }
    })

    if (overlayCandles?.length >= 2) {
      const op = overlayCandles.map(c => c.c)
      const oMin = Math.min(...op), oMax = Math.max(...op), oRange = oMax - oMin || 1
      const pyO = v => padT + plotH - ((v - oMin) / oRange) * plotH
      const pxO = i => padL + (i / (op.length - 1)) * plotW
      overlayPoints = op.map((v, i) => `${pxO(i)},${pyO(v)}`).join(' ')
    }
  }

  const onMouseMove = e => {
    if (!hasData || !px) return
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return
    const relX = e.clientX - rect.left - padL
    const idx = Math.round((relX / plotW) * (prices.length - 1))
    setHoverIdx(Math.max(0, Math.min(prices.length - 1, idx)))
  }

  const hx = (hasData && hoverIdx !== null && px) ? px(hoverIdx) : null
  const hy = (hasData && hoverIdx !== null && py) ? py(prices[hoverIdx]) : null
  const tooltipLeft = hx !== null && hx > w * 0.65

  return (
    <svg
      ref={svgRef}
      width="100%"
      height={height}
      style={{ display:'block', cursor: hasData ? 'crosshair' : 'default' }}
      onMouseMove={onMouseMove}
      onMouseLeave={() => setHoverIdx(null)}
    >
      {/* Loading / error state */}
      {!hasData && (
        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" fontSize={12} fontFamily={font} fill={C.ink300}>
          {isLoading ? 'Loading chart…' : 'Chart unavailable'}
        </text>
      )}

      {/* Chart content */}
      {hasData && w > 0 && (<>
        {yLines.map((v, i) => (
          <g key={i}>
            <line x1={padL} x2={padL+plotW} y1={py(v)} y2={py(v)} stroke={C.ink100} strokeWidth={1}/>
            <text x={4} y={py(v)} textAnchor="start" dominantBaseline="middle" fontSize={11} fontFamily={font} fill={C.ink400}>{fmtYLbl(v)}</text>
          </g>
        ))}
        <polyline points={points} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round"/>
        {overlayPoints && <polyline points={overlayPoints} fill="none" stroke={C.ame400} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" opacity={0.75}/>}
        {hoverIdx === null && <circle cx={px(prices.length-1)} cy={py(prices[prices.length-1])} r={3.5} fill={color}/>}
        {xLabels.map(({ x, t, anchor }, i) => (
          <text key={i} x={x} y={height-6} textAnchor={anchor} fontSize={11} fontFamily={font} fill={C.ink400}>{fmtDate(t)}</text>
        ))}
        {hoverIdx !== null && hx !== null && (<>
          <line x1={hx} x2={hx} y1={padT} y2={padT+plotH} stroke={C.ink400} strokeWidth={1} strokeDasharray="4 3"/>
          <line x1={padL} x2={padL+plotW} y1={hy} y2={hy} stroke={C.ink400} strokeWidth={1} strokeDasharray="4 3"/>
          <circle cx={hx} cy={hy} r={4} fill={color} stroke={C.white} strokeWidth={2}/>
          <g transform={`translate(${tooltipLeft ? hx-124 : hx+8},${Math.max(padT, hy-44)})`}>
            <rect width={116} height={42} rx={4} fill={C.ink900}/>
            <text x={10} y={15} fontSize={12} fontFamily={font} fill={C.ink100}>{fmtDate(timestamps[hoverIdx])}</text>
            <text x={10} y={33} fontSize={16} fontFamily={font} fill={C.white} fontWeight={700}>{fmtPrice(prices[hoverIdx])}</text>
          </g>
        </>)}
      </>)}
    </svg>
  )
}

export function ChartPanel({ height, candles, isLoading, isError, range='All', overlayCandles=null }) {
  return (
    <MiniChart height={height} candles={candles} isLoading={isLoading} isError={isError} range={range} overlayCandles={overlayCandles}/>
  )
}

// Compact range selector meant to sit in a header row, outside the chart pane
export function RangeButtons({ range, onRangeChange }) {
  return (
    <div style={{ display:'flex', gap:4 }}>
      {RANGES.map(r => (
        <div key={r} onClick={() => onRangeChange?.(r)} style={{ padding:'5px 10px', background:r===range?C.ink900:'transparent', border:`1px solid ${r===range?C.ink900:C.ink100}`, borderRadius:3, fontFamily:SANS, fontSize:13, fontWeight:r===range?600:400, color:r===range?C.white:C.ink500, cursor:'pointer', userSelect:'none', whiteSpace:'nowrap' }}>{r}</div>
      ))}
    </div>
  )
}

export function Sparkline({ positive=true, width=40, height=20 }) {
  const color = positive ? C.aqua400 : C.red;
  const pts = positive
    ? [0.8,0.7,0.75,0.6,0.5,0.55,0.4,0.3,0.2,0.15]
    : [0.2,0.3,0.25,0.4,0.5,0.45,0.6,0.7,0.8,0.85];
  const coords = pts.map((v,i) => `${(i/(pts.length-1))*width},${v*height}`).join(' ');
  return (
    <svg width={width} height={height}>
      <polyline points={coords} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round"/>
    </svg>
  );
}

export function ProgressRing({ value=1, total=10, size=52, color=C.ame400 }) {
  const r = size/2 - 5;
  const circ = 2*Math.PI*r;
  const dash = (value/total)*circ;
  return (
    <div style={{ position:'relative', width:size, height:size, flexShrink:0 }}>
      <svg width={size} height={size} style={{ transform:'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={3}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={3} strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"/>
      </svg>
      <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:"'Barlow Condensed',sans-serif", fontSize:11, fontWeight:700, color:'white' }}>{value}/{total}</div>
    </div>
  );
}
