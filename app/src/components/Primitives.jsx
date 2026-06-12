import { useState, useRef, useEffect } from 'react';
import { C, SANS, DISPLAY } from '../tokens';
import { useLang } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import glossary from '../data/glossary.json';

// Map display text → glossary key
const TERM_MAP = {
  'market order':    'market_order',
  'limit order':     'limit_order',
  'slippage':        'slippage',
  'cost basis':      'cost_basis',
  'regulatory fee':  'regulatory_fee',
  'transaction fee': 'regulatory_fee',
  'p/e ratio':       'pe_ratio',
  'market cap':      'market_cap',
  'div. yield':      'dividend_yield',
  'dividend yield':  'dividend_yield',
  'etf':             'etf',
  'realised gain':   'realised_pnl',
  'realised loss':   'realised_pnl',
  'unrealised p&l':  'unrealised_pnl',
  '52w high':        '52w_high',
  '52-week high':    '52w_high',
  'partial fill':    'partial_fill',
  'expense ratio':   'expense_ratio',
};

export function StatusBar() {
  return (
    <div style={{ height:52, display:'flex', alignItems:'flex-end', justifyContent:'space-between', padding:'0 24px 10px', flexShrink:0 }}>
      <div style={{ fontFamily:SANS, fontSize:15, fontWeight:600, color:C.ink900 }}>9:41</div>
      <div style={{ width:16, height:10, border:`1.5px solid ${C.ink900}`, borderRadius:2, position:'relative' }}>
        <div style={{ position:'absolute', left:1, top:1, bottom:1, right:'30%', background:C.ink900, borderRadius:1 }}/>
      </div>
    </div>
  );
}

export function Logo({ size = 22, color = C.ink900 }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
      <div style={{ width:size*1.1, height:size*1.1, background:`${C.ame400}12`, border:`1.5px solid ${C.ame400}30`, borderRadius:4, display:'flex', alignItems:'center', justifyContent:'center', color:C.ame400, fontSize:size*0.65, lineHeight:1 }}>◇</div>
      <div style={{ fontFamily:DISPLAY, fontWeight:700, fontSize:size, color, letterSpacing:'-0.02em' }}>simFolio</div>
    </div>
  );
}

export function Mark({ size = 40 }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
      <div style={{ width:size, height:size, borderRadius:Math.round(size*0.2), background:`${C.ame400}10`, border:`2px solid ${C.ame400}30`, display:'flex', alignItems:'center', justifyContent:'center', color:C.ame400, fontSize:Math.round(size*0.55) }}>◇</div>
      <div style={{ fontFamily:DISPLAY, fontWeight:700, fontSize:Math.round(size*0.65), color:C.ink900, letterSpacing:'-0.025em' }}>simFolio</div>
    </div>
  );
}

export function SimPill() {
  return (
    <div style={{ display:'inline-flex', alignItems:'center', gap:6, background:C.ame50, border:`1px solid ${C.ame100}`, borderRadius:999, padding:'4px 12px', fontFamily:SANS, fontSize:12, color:C.ame600, fontWeight:500 }}>
      <div style={{ width:5, height:5, borderRadius:'50%', background:C.ame400 }}/>
      Simulated only — no real money
    </div>
  );
}

export function CTA({ label, full=false, ghost=false, danger=false, disabled=false, loading=false, style={}, onClick }) {
  const bg   = danger ? C.red : ghost ? 'transparent' : C.ink900;
  const fg   = ghost ? C.ink700 : C.white;
  const bord = ghost ? `1px solid ${C.ink200}` : 'none';
  return (
    <div onClick={!disabled && !loading ? onClick : undefined} style={{ height:48, background:bg, color:fg, border:bord, borderRadius:4, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:SANS, fontSize:15, fontWeight:600, letterSpacing:'0.01em', cursor:disabled||loading?'default':'pointer', width:full?'100%':undefined, userSelect:'none', opacity:disabled?0.45:1, ...style }}>
      {loading ? 'Please wait…' : label}
    </div>
  );
}

export function GhostCTA({ label, style={}, onClick }) {
  return (
    <div onClick={onClick} style={{ height:48, background:'transparent', color:C.ink600, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:SANS, fontSize:14, fontWeight:500, cursor:'pointer', ...style }}>
      {label}
    </div>
  );
}

// Field supports both wireframe mode (no onChange) and live input mode
export function Field({ label, placeholder, type='text', value, onChange, filled=false, error=false, errorMsg }) {
  const isLive = !!onChange;
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
      <div style={{ fontFamily:SANS, fontSize:13, fontWeight:600, color:error?C.red:C.ink600, letterSpacing:'0.04em' }}>{label}</div>
      {isLive ? (
        <input
          type={type}
          value={value ?? ''}
          onChange={onChange}
          placeholder={placeholder}
          style={{ height:48, border:`1.5px solid ${error?C.red:C.ink700}`, borderRadius:4, padding:'0 14px', background:C.white, fontFamily:SANS, fontSize:15, color:C.ink900, outline:'none', width:'100%', boxSizing:'border-box' }}
        />
      ) : (
        <div style={{ height:48, border:`1.5px solid ${error?C.red:filled?C.ink700:C.ink200}`, borderRadius:4, padding:'0 14px', display:'flex', alignItems:'center', background:C.white, fontFamily:SANS, fontSize:15, color:filled?C.ink900:C.ink300 }}>
          {placeholder}
        </div>
      )}
      {error && errorMsg && <div style={{ fontFamily:SANS, fontSize:12, color:C.red }}>{errorMsg}</div>}
    </div>
  );
}

export function SocialBtn({ provider }) {
  return (
    <div style={{ height:48, border:`1px solid ${C.ink200}`, borderRadius:4, display:'flex', alignItems:'center', gap:12, padding:'0 18px', background:C.white, cursor:'pointer', flex:1 }}>
      <div style={{ width:18, height:18, borderRadius:'50%', background:C.ink100, flexShrink:0 }}/>
      <div style={{ fontFamily:SANS, fontSize:14, fontWeight:500, color:C.ink700 }}>Continue with {provider}</div>
    </div>
  );
}

export function Divider({ label='or with email' }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:12 }}>
      <div style={{ flex:1, height:1, background:C.ink100 }}/>
      <div style={{ fontFamily:SANS, fontSize:12, color:C.ink400 }}>{label}</div>
      <div style={{ flex:1, height:1, background:C.ink100 }}/>
    </div>
  );
}

export function LangToggle() {
  const { lang, setLang } = useLang();

  const active = lang === 'zh-TW' ? 1 : 0;
  return (
    <div style={{ display:'inline-flex', border:`1px solid ${C.ink100}`, borderRadius:4, overflow:'hidden' }}>
      {['EN','繁中'].map((l, i) => (
        <div key={l} onClick={() => setLang && setLang(i === 0 ? 'en' : 'zh-TW')} style={{ padding:'5px 14px', fontFamily:SANS, fontSize:13, fontWeight:i===active?600:400, background:i===active?C.ink900:'transparent', color:i===active?C.white:C.ink400, cursor:'pointer' }}>{l}</div>
      ))}
    </div>
  );
}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div onClick={() => setTheme && setTheme(theme === 'dark' ? 'light' : 'dark')} style={{ width:36, height:20, borderRadius:999, background:theme==='dark'?C.ame400:C.ink200, cursor:'pointer', position:'relative', transition:'background 0.2s', flexShrink:0 }}>
      <div style={{ width:16, height:16, borderRadius:'50%', background:C.white, position:'absolute', top:2, left:theme==='dark'?18:2, transition:'left 0.2s' }}/>
    </div>
  );
}

export function Eyebrow({ children, style={} }) {
  return (
    <div style={{ fontFamily:SANS, fontSize:11, fontWeight:600, color:C.ink400, letterSpacing:'0.14em', textTransform:'uppercase', ...style }}>
      {children}
    </div>
  );
}

export function TermUnderline({ children, termKey }) {
  const [show, setShow] = useState(false);
  const ref = useRef(null);
  const { lang } = useLang();

  const key = termKey || TERM_MAP[String(children).toLowerCase()] || TERM_MAP[String(children).toLowerCase().replace(/[^a-z0-9 ]/g,'')];
  const def = key ? glossary[key] : null;
  const entry = def ? (def[lang] || def.en) : null;

  // close on outside click
  useEffect(() => {
    if (!show) return;
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setShow(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [show]);

  if (!entry) {
    return <span style={{ borderBottom:`1.5px dotted ${C.ame400}`, cursor:'pointer' }}>{children}</span>;
  }

  return (
    <span ref={ref} style={{ position:'relative', display:'inline' }}>
      <span
        style={{ borderBottom:`1.5px dotted ${C.ame400}`, cursor:'pointer' }}
        onClick={() => setShow(s => !s)}
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
      >
        {children}
      </span>
      {show && (
        <span style={{ position:'absolute', bottom:'calc(100% + 6px)', left:'50%', transform:'translateX(-50%)', zIndex:100, minWidth:220, maxWidth:280, background:C.white, border:`1px solid ${C.ink100}`, borderRadius:8, padding:'10px 14px', boxShadow:'0 4px 20px rgba(0,0,0,0.12)', display:'block' }}>
          <span style={{ fontFamily:SANS, fontSize:12, fontWeight:700, color:C.ink900, display:'block', marginBottom:4 }}>{entry.title}</span>
          <span style={{ fontFamily:SANS, fontSize:12, color:C.ink600, lineHeight:1.5, display:'block' }}>{entry.definition}</span>
        </span>
      )}
    </span>
  );
}

export function StatusPill({ status }) {
  const map = {
    pending:   { bg:C.goldBg,  color:C.gold,    dot:C.gold    },
    queued:    { bg:C.queuedBg, color:C.queuedColor, dot:C.queuedColor },
    filled:    { bg:C.aqua50,  color:C.aqua600, dot:C.aqua400 },
    cancelled: { bg:C.ink50,   color:C.ink500,  dot:C.ink400  },
    partial:   { bg:C.goldBg,  color:C.gold,    dot:C.goldLight },
  };
  const s = map[status?.toLowerCase()] || map.filled;
  const label = status ? status.charAt(0).toUpperCase() + status.slice(1).toLowerCase() : 'Filled';
  return (
    <div style={{ display:'inline-flex', alignItems:'center', gap:5, background:s.bg, color:s.color, borderRadius:999, padding:'3px 10px', fontFamily:SANS, fontSize:12, fontWeight:600 }}>
      <div style={{ width:5, height:5, borderRadius:'50%', background:s.dot }}/>
      {label}
    </div>
  );
}

export function HeroAvatar({ initials, color, size=36 }) {
  return (
    <div style={{ width:size, height:size, borderRadius:'50%', background:`${color}12`, border:`1.5px solid ${color}35`, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:SANS, fontWeight:700, fontSize:size*0.36, color, flexShrink:0 }}>
      {initials}
    </div>
  );
}

export function GuideAvatar({ size=36 }) {
  return (
    <div style={{ width:size, height:size, borderRadius:'50%', background:C.aqua50, border:`1.5px solid ${C.aqua400}40`, display:'flex', alignItems:'center', justifyContent:'center', color:C.aqua400, fontSize:size*0.44, flexShrink:0 }}>◇</div>
  );
}

export function ProgressDots({ step=1, total=8 }) {
  return (
    <div style={{ display:'flex', gap:4, alignItems:'center' }}>
      {Array.from({ length:total }, (_,i) => (
        <div key={i} style={{ width:i<step?20:5, height:5, borderRadius:3, background:i<step?C.ame400:C.ink100, transition:'width 0.3s' }}/>
      ))}
      <div style={{ fontFamily:SANS, fontSize:12, color:C.ink400, marginLeft:4 }}>{step} of {total}</div>
    </div>
  );
}

export function GoalCard({ label, selected, compact=false, onClick }) {
  return (
    <div onClick={onClick} style={{ display:'flex', alignItems:'center', gap:12, padding:compact?'10px 14px':'13px 16px', background:selected?C.ame50:C.white, border:`${selected?2:1}px solid ${selected?C.ame400:C.ink100}`, borderRadius:6, cursor:'pointer' }}>
      <div style={{ width:compact?16:18, height:compact?16:18, borderRadius:'50%', flexShrink:0, border:`2px solid ${selected?C.ame400:C.ink300}`, background:selected?C.ame400:'transparent', display:'flex', alignItems:'center', justifyContent:'center' }}>
        {selected && <div style={{ width:6, height:6, borderRadius:'50%', background:C.white }}/>}
      </div>
      <div style={{ fontFamily:SANS, fontSize:compact?14:15.5, fontWeight:selected?600:400, color:selected?C.ame600:C.ink700 }}>{label}</div>
    </div>
  );
}

export function MktStatus({ open=true }) {
  const color = open ? C.aqua400 : C.ink400;
  const bg    = open ? C.aqua50  : C.ink50;
  return (
    <div style={{ display:'inline-flex', alignItems:'center', gap:6, background:bg, borderRadius:999, padding:'4px 10px', fontFamily:SANS, fontSize:12, fontWeight:500, color }}>
      <div style={{ width:6, height:6, borderRadius:'50%', background:color }}/>
      {open ? 'Markets open' : 'Markets closed'}
    </div>
  );
}

export function ReceiptRow({ label, value, valueColor, bold, dotted }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom:`1px solid ${C.ink100}` }}>
      <div style={{ fontFamily:SANS, fontSize:14, color:C.ink500 }}>
        {dotted ? <TermUnderline>{label}</TermUnderline> : label}
      </div>
      <div style={{ fontFamily:SANS, fontSize:14, fontWeight:bold?700:500, color:valueColor||C.ink900 }}>{value}</div>
    </div>
  );
}
