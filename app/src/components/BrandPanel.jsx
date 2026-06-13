import { C } from '../tokens';
import { Logo, SimPill } from './Primitives';
import QSWordmark from './QSWordmark';

const HEROES = [
  { initials:'WB', name:'Warren Buffett',  style:'Value investing · long-term',  color:C.ame400, quote:'"Price is what you pay. Value is what you get."' },
  { initials:'CW', name:'Cathie Wood',      style:'Disruptive technology · growth', color:C.aqua400, quote:'"Innovation solves problems. Invest in the future."' },
  { initials:'RD', name:'Ray Dalio',        style:'Macro · diversification',        color:C.gold,    quote:'"Diversify well and you will do well."' },
];

// Dark branding panel shared by the desktop welcome and onboarding layouts
export default function BrandPanel() {
  return (
    <div className="box-border flex h-full flex-col bg-ink-900 px-[72px] py-16">
      <div className="flex flex-col gap-2">
        <Logo size={32} color={C.white}/>
        <div className="flex items-center gap-1.5 pl-[43px] opacity-30">
          <span className="font-sans text-[11px] text-white">by</span>
          <QSWordmark onDark={true} size={28}/>
        </div>
      </div>
      <div className="mb-10 mt-auto">
        <div className="mb-5 font-display text-[52px] font-bold leading-[1.05] tracking-[-0.025em] text-white">
          Learn investing<br/>by doing it.
        </div>
        <div className="max-w-[380px] font-sans text-lg leading-relaxed text-ink-400">
          With legendary investors as your guides. No real money involved.
        </div>
      </div>
      <div className="flex flex-col gap-3">
        {HEROES.map(h => (
          <div key={h.initials} className="flex gap-3.5 rounded-card border border-white/[0.08] bg-white/[0.04] px-[18px] py-3.5">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-pill font-sans text-[13px] font-bold" style={{ background:`${h.color}20`, border:`1.5px solid ${h.color}50`, color:h.color }}>{h.initials}</div>
            <div className="flex-1">
              <div className="font-sans text-[15px] font-semibold text-white">{h.name}</div>
              <div className="font-sans text-[13px]" style={{ color:h.color }}>{h.style}</div>
            </div>
            <div className="max-w-[160px] text-right font-sans text-xs italic leading-snug text-white/30">{h.quote}</div>
          </div>
        ))}
      </div>
      <div className="mt-1 text-center font-sans text-[13px] text-white/25">and 7 more in the library</div>
      <div className="mt-8"><SimPill/></div>
    </div>
  );
}
