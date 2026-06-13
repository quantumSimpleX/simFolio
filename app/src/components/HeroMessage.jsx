import { C } from '../tokens';
import { cn } from '../lib/utils';
import { HeroAvatar, GuideAvatar } from './Primitives';

const HERO_MAP = {
  sage:   { initials:'◇',  name:'Sage',           color:C.aqua400 },
  warren: { initials:'WB', name:'Warren Buffett', color:C.ame400 },
  munger: { initials:'CM', name:'Charlie Munger', color:C.ame400 },
  lynch:  { initials:'PL', name:'Peter Lynch',    color:C.aqua400 },
  bogle:  { initials:'JB', name:'John Bogle',     color:C.gold },
  cathie: { initials:'CW', name:'Cathie Wood',    color:C.aqua400 },
  ray:    { initials:'RD', name:'Ray Dalio',      color:C.gold },
};

export function HeroMessage({ hero='warren', text, time, isNew=false }) {
  const h = HERO_MAP[hero] ?? HERO_MAP.warren;
  return (
    <div className="flex gap-2.5">
      <HeroAvatar initials={h.initials} color={h.color} size={30}/>
      <div className="flex-1">
        <div className="mb-1 flex items-center gap-2">
          <div className="font-sans text-[17px] font-semibold text-ink-700">{h.name}</div>
          {time && <div className="font-sans text-[13px] text-ink-300">{time}</div>}
          {isNew && <div className="ml-auto h-1.5 w-1.5 rounded-pill bg-ame-400"/>}
        </div>
        <div className="font-sans text-lg italic leading-relaxed text-ink-600">{text}</div>
      </div>
    </div>
  );
}

export function UserMessage({ text }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[80%] rounded-[8px_8px_4px_8px] bg-ink-900 px-3.5 py-2.5 font-sans text-lg leading-normal text-white">{text}</div>
    </div>
  );
}

export function SageMsg({ text, compact=false }) {
  return (
    <div className="flex gap-2.5">
      <GuideAvatar size={compact ? 28 : 36}/>
      <div className="flex-1">
        <div className="mb-1.5 font-sans text-[13px] font-semibold uppercase tracking-[0.14em] text-ink-400">Sage</div>
        <div className={cn('font-sans leading-relaxed text-ink-600', compact ? 'text-[15px]' : 'text-lg')}>{text}</div>
      </div>
    </div>
  );
}
