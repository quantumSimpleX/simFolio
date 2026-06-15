import { useState, useRef, useEffect } from 'react';
import { C, SANS, DISPLAY } from '../tokens';
import { useLang } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import glossary from '../data/glossary.json';
import { cn } from '../lib/utils';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { ToggleGroup, ToggleGroupItem } from './ui/toggle-group';
import {
  Tooltip, TooltipTrigger, TooltipContent, TooltipProvider,
} from './ui/tooltip';
import { Sheet, SheetContent, SheetTrigger } from './ui/sheet';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { useIsMobile } from '../hooks/useBreakpoint';

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
    <Badge variant="sim" size="sim">
      <span className="h-[5px] w-[5px] rounded-full bg-ame-400"/>
      Simulation only — no real money
    </Badge>
  );
}

export function CTA({ label, full=false, ghost=false, danger=false, disabled=false, loading=false, style={}, onClick }) {
  const variant = danger ? 'danger' : ghost ? 'ghost' : 'primary';
  return (
    <Button
      variant={variant}
      size="cta"
      disabled={disabled}
      loading={loading}
      onClick={!disabled && !loading ? onClick : undefined}
      className={cn(full && 'w-full')}
      style={style}
    >
      {label}
    </Button>
  );
}

export function GhostCTA({ label, style={}, onClick }) {
  return (
    <Button variant="link" size="cta" onClick={onClick} className="font-medium text-ink-600" style={style}>
      {label}
    </Button>
  );
}

// Field supports both wireframe mode (no onChange) and live input mode
export function Field({ label, placeholder, type='text', value, onChange, filled=false, error=false, errorMsg }) {
  const isLive = !!onChange;
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
      <Label className={cn(error && 'text-red')}>{label}</Label>
      {isLive ? (
        <Input
          type={type}
          value={value ?? ''}
          onChange={onChange}
          placeholder={placeholder}
          className={cn(error && 'border-red focus-visible:border-red focus-visible:ring-red')}
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
    <div className="flex items-center gap-3">
      <div className="h-px flex-1 bg-ink-100"/>
      <div className="font-sans text-xs text-ink-400">{label}</div>
      <div className="h-px flex-1 bg-ink-100"/>
    </div>
  );
}

export function LangToggle() {
  const { lang, setLang } = useLang();
  const value = lang === 'zh-TW' ? 'zh-TW' : 'en';
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={v => v && setLang && setLang(v)}
      size="sm"
    >
      <ToggleGroupItem value="en">EN</ToggleGroupItem>
      <ToggleGroupItem value="zh-TW">繁中</ToggleGroupItem>
    </ToggleGroup>
  );
}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const dark = theme === 'dark';
  return (
    <button
      type="button"
      aria-label="Toggle theme"
      data-testid="theme-toggle"
      onClick={() => setTheme && setTheme(dark ? 'light' : 'dark')}
      className={cn(
        'relative h-5 w-9 flex-shrink-0 rounded-pill transition-colors',
        dark ? 'bg-ame-400' : 'bg-ink-200',
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 h-4 w-4 rounded-pill bg-white transition-all',
          dark ? 'left-[18px]' : 'left-0.5',
        )}
      />
    </button>
  );
}

export function Eyebrow({ children, style={} }) {
  return (
    <div style={{ fontFamily:SANS, fontSize:11, fontWeight:600, color:C.ink400, letterSpacing:'0.14em', textTransform:'uppercase', ...style }}>
      {children}
    </div>
  );
}

const TRIGGER_CLS = 'cursor-pointer border-b-[1.5px] border-dotted border-ame-400';

function GlossaryEntry({ entry }) {
  return (
    <>
      <span className="mb-1 block font-sans text-xs font-bold text-ink-900">{entry.title}</span>
      <span className="block font-sans text-xs leading-relaxed text-ink-600">{entry.definition}</span>
    </>
  );
}

export function TermUnderline({ children, termKey }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const { lang } = useLang();
  const isMobile = useIsMobile();

  const key = termKey || TERM_MAP[String(children).toLowerCase()] || TERM_MAP[String(children).toLowerCase().replace(/[^a-z0-9 ]/g,'')];
  const def = key ? glossary[key] : null;

  // close on outside click (desktop tooltip)
  useEffect(() => {
    if (!open || isMobile) return;
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, isMobile]);

  if (!def) {
    return <span className={TRIGGER_CLS}>{children}</span>;
  }

  // Mobile: full-width bottom sheet with EN / 繁中 language tabs.
  if (isMobile) {
    return (
      <Sheet>
        <SheetTrigger asChild>
          <span className={TRIGGER_CLS}>{children}</span>
        </SheetTrigger>
        <SheetContent side="bottom">
          <Tabs defaultValue={lang === 'zh-TW' ? 'zh-TW' : 'en'} className="mt-4">
            <TabsList>
              <TabsTrigger value="en">EN</TabsTrigger>
              <TabsTrigger value="zh-TW">繁中</TabsTrigger>
            </TabsList>
            <TabsContent value="en" className="mt-3"><GlossaryEntry entry={def.en} /></TabsContent>
            <TabsContent value="zh-TW" className="mt-3"><GlossaryEntry entry={def['zh-TW'] || def.en} /></TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop: tooltip in the active language.
  const entry = def[lang] || def.en;
  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip open={open} onOpenChange={setOpen}>
        <TooltipTrigger asChild>
          <span
            ref={ref}
            className={TRIGGER_CLS}
            onMouseEnter={() => setOpen(true)}
            onMouseLeave={() => setOpen(false)}
          >
            {children}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <GlossaryEntry entry={entry} />
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function StatusPill({ status }) {
  const variant = { pending:'pending', queued:'queued', filled:'filled', cancelled:'cancelled', partial:'partial' }[status?.toLowerCase()] || 'filled';
  const dot = {
    pending:   C.gold,
    queued:    C.queuedColor,
    filled:    C.aqua400,
    cancelled: C.ink400,
    partial:   C.goldLight,
  }[status?.toLowerCase()] || C.aqua400;
  const label = status ? status.charAt(0).toUpperCase() + status.slice(1).toLowerCase() : 'Filled';
  return (
    <Badge variant={variant}>
      <span style={{ width:5, height:5, borderRadius:'50%', background:dot }}/>
      {label}
    </Badge>
  );
}

export function HeroAvatar({ id, initials, color, size=36 }) {
  // Real heroes have a grayscale portrait at /heroes/<id>.jpg; Sage (and any
  // missing photo) falls back to the colored initials chip.
  const hasPhoto = id && id !== 'sage';
  return (
    <Avatar
      style={{ width:size, height:size, background:`${color}12`, border:`1.5px solid ${color}35` }}
    >
      {hasPhoto && (
        <AvatarImage src={`/heroes/${id}.jpg`} alt={initials} className="object-cover" />
      )}
      <AvatarFallback style={{ background:'transparent', color, fontSize:size*0.36 }}>
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}

export function GuideAvatar({ size=36 }) {
  return (
    <Avatar style={{ width:size, height:size, background:C.aqua50, border:`1.5px solid ${C.aqua400}40` }}>
      <AvatarFallback style={{ background:'transparent', color:C.aqua400, fontSize:size*0.44, fontWeight:400 }}>◇</AvatarFallback>
    </Avatar>
  );
}

export function ProgressDots({ step=1, total=8 }) {
  return (
    <div style={{ display:'flex', gap:4, alignItems:'center' }}>
      {Array.from({ length:total }, (_,i) => (
        <div key={i} style={{ width:i<step?20:5, height:5, borderRadius:999, background:i<step?C.ame400:C.ink100, transition:'width 0.3s' }}/>
      ))}
      <div style={{ fontFamily:SANS, fontSize:12, color:C.ink400, marginLeft:4 }}>{step} of {total}</div>
    </div>
  );
}

export function GoalCard({ label, selected, compact=false, onClick }) {
  return (
    <div data-testid="goal-card" onClick={onClick} style={{ display:'flex', alignItems:'center', gap:12, padding:compact?'10px 14px':'13px 16px', background:selected?C.ame50:C.white, border:`${selected?2:1}px solid ${selected?C.ame400:C.ink100}`, borderRadius:8, cursor:'pointer' }}>
      <div style={{ width:compact?16:18, height:compact?16:18, borderRadius:'50%', flexShrink:0, border:`2px solid ${selected?C.ame400:C.ink300}`, background:selected?C.ame400:'transparent', display:'flex', alignItems:'center', justifyContent:'center' }}>
        {selected && <div style={{ width:6, height:6, borderRadius:'50%', background:C.white }}/>}
      </div>
      <div style={{ fontFamily:SANS, fontSize:compact?14:15.5, fontWeight:selected?600:400, color:selected?C.ame600:C.ink700 }}>{label}</div>
    </div>
  );
}

export function MktStatus({ open=true }) {
  return (
    <Badge variant={open ? 'filled' : 'cancelled'}>
      <span style={{ width:6, height:6, borderRadius:'50%', background:open ? C.aqua400 : C.ink400 }}/>
      {open ? 'Markets open' : 'Markets closed'}
    </Badge>
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
