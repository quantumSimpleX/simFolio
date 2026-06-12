import { useState } from 'react';
import { C, SANS, DISPLAY } from '../../tokens';
import { Eyebrow } from '../../components/Primitives';
import { BottomNav, TopNav } from '../../components/Nav';
import { ChartPanel, RangeButtons } from '../../components/Charts';
import { HoldingRow } from '../../components/HoldingRow';
import { useNavigate } from 'react-router-dom';
import { usePortfolio } from '../../hooks/usePortfolio';
import { usePortfolioCandles } from '../../hooks/usePortfolioCandles';
import { useCandles } from '../../hooks/useStockDetail';

// Dev mock: ~$10k per position at mid-2025 prices
// AAPL $213 · NVDA $138 · NOW $1,048 · SFDC $295
// Cost basis uses avg buy prices; starting capital $50k
const DEV_HOLDINGS = [
  { ticker:'AAPL', name:'Apple Inc.',      total_qty:'47', average_cost_basis:'175', price:213,  value:10011, cost:8225, pnl:1786, pct:21.7, pos:true },
  { ticker:'NVDA', name:'NVIDIA Corp.',    total_qty:'73', average_cost_basis:'92',  price:138,  value:10074, cost:6716, pnl:3358, pct:50.0, pos:true },
  { ticker:'NOW',  name:'ServiceNow Inc.', total_qty:'10', average_cost_basis:'820', price:1048, value:10480, cost:8200, pnl:2280, pct:27.8, pos:true },
  { ticker:'CRM',  name:'Salesforce Inc.', total_qty:'34', average_cost_basis:'230', price:295,  value:10030, cost:7820, pnl:2210, pct:28.3, pos:true },
];
const DEV_CASH     = 19039;
const DEV_STARTING = 50000;

function fmt(n) {
  return n?.toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 }) ?? '—';
}

export default function PortfolioMobile() {
  const navigate = useNavigate();
  const [activeRange, setActiveRange] = useState('All');
  const [hoveredTicker, setHoveredTicker] = useState(null);
  const { positions, cashBalance, totalValue, totalPnl, totalPct, loading } = usePortfolio();

  const useDev          = !loading && positions.length === 0;
  const displayHoldings = useDev ? DEV_HOLDINGS : positions;
  const displayCash     = useDev ? DEV_CASH : (cashBalance ?? 0);
  const displayTotal    = useDev ? DEV_CASH + DEV_HOLDINGS.reduce((s,h) => s + h.value, 0) : totalValue;
  const displayPnl      = useDev ? displayTotal - DEV_STARTING : totalPnl;
  const displayPct      = useDev ? (displayPnl / DEV_STARTING) * 100 : totalPct;

  const { data: overlayCandles } = useCandles(hoveredTicker, activeRange);
  const { candles, isLoading: candlesLoading, isError: candlesError } = usePortfolioCandles(
    useDev ? DEV_HOLDINGS : positions,
    displayCash,
    activeRange,
  );

  const pnlPos = displayPnl >= 0;

  return (
    <div style={{ width:'100%', height:'100dvh', background:C.paper, display:'flex', flexDirection:'column', overflow:'hidden' }}>
      <TopNav active="portfolio"/>
      <div style={{ padding:'18px 24px 0', flexShrink:0 }}>
        <Eyebrow>Portfolio</Eyebrow>
        <div style={{ display:'flex', alignItems:'flex-end', gap:12, marginTop:6 }}>
          <div style={{ fontFamily:DISPLAY, fontWeight:700, fontSize:38, color:C.ink900, letterSpacing:'-0.02em', lineHeight:1 }}>
            {loading ? '…' : `$${fmt(displayTotal)}`}
          </div>
          <div style={{ fontFamily:SANS, fontSize:14, color:pnlPos?C.aqua600:C.red, fontWeight:500, lineHeight:1.1 }}>
            {pnlPos?'+':''}{fmt(displayPnl)} ({pnlPos?'+':''}{displayPct.toFixed(1)}%)
          </div>
          <div style={{ marginLeft:'auto' }}>
            <RangeButtons range={activeRange} onRangeChange={setActiveRange}/>
          </div>
        </div>
      </div>

      <div style={{ padding:'12px 6px 0', flexShrink:0, background:C.white, borderBottom:`1px solid ${C.ink100}` }}>
        <ChartPanel
          height={168}
          candles={candles}
          isLoading={loading || candlesLoading}
          isError={candlesError}
          range={activeRange}
          onRangeChange={setActiveRange}
          overlayCandles={overlayCandles ?? null}
        />
      </div>

      <div style={{ padding:'16px 24px 0', flexShrink:0 }}>
        <div style={{ display:'flex' }}>
          {[['Cash', `$${fmt(displayCash)}`], ['Positions', String(displayHoldings.length)], ['All-time', `${pnlPos?'+':''}${displayPct.toFixed(1)}%`]].map(([label,value],i,arr) => (
            <div key={label} style={{ flex:1, borderRight:i<arr.length-1?`1px solid ${C.ink100}`:'none', paddingRight:i<arr.length-1?16:0, paddingLeft:i>0?16:0 }}>
              <div style={{ fontFamily:SANS, fontSize:11, color:C.ink400, letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:3 }}>{label}</div>
              <div style={{ fontFamily:SANS, fontSize:16, fontWeight:600, color:C.ink900 }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ flex:1, padding:'20px 24px 0', overflow:'auto' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
          <Eyebrow>Holdings</Eyebrow>
          <div onClick={() => navigate('/markets')} style={{ fontFamily:SANS, fontSize:13, color:C.ame400, cursor:'pointer' }}>+ Add</div>
        </div>
        {loading && positions.length === 0 && (
          <div style={{ fontFamily:SANS, fontSize:14, color:C.ink400, padding:'20px 0' }}>Loading positions…</div>
        )}
        {displayHoldings.map(h => (
          <HoldingRow
            key={h.ticker}
            ticker={h.ticker}
            name={h.name}
            qty={parseFloat(h.total_qty)}
            value={h.value}
            pnl={h.pnl}
            pct={h.pct}
            pos={h.pos}
            compact
            highlighted={h.ticker === hoveredTicker}
            onClick={() => navigate(`/stock/${h.ticker}`)}
            onMouseEnter={() => setHoveredTicker(h.ticker)}
            onMouseLeave={() => setHoveredTicker(null)}
          />
        ))}
      </div>

      <BottomNav active="portfolio"/>
    </div>
  );
}
