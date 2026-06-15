import { C } from '../tokens';
import { cn } from '../lib/utils';
import { HeroAvatar, GuideAvatar } from './Primitives';
import { AssetText } from './AssetText';

const HERO_MAP = {
  sage:   { initials:'◇',  name:'Sage',           color:C.aqua400 },
  warren: { initials:'WB', name:'Warren Buffett', color:C.ame400 },
  munger: { initials:'CM', name:'Charlie Munger', color:C.ame400 },
  lynch:  { initials:'PL', name:'Peter Lynch',    color:C.aqua400 },
  bogle:  { initials:'JB', name:'John Bogle',     color:C.gold },
  cathie: { initials:'CW', name:'Cathie Wood',    color:C.aqua400 },
  ray:    { initials:'RD', name:'Ray Dalio',      color:C.gold },
  graham: { initials:'BG', name:'Benjamin Graham',         color:C.ink400 },
  soros:  { initials:'GS', name:'George Soros',            color:C.ame600 },
  templeton:     { initials:'JT', name:'Sir John Templeton',    color:C.aqua600 },
  tudorjones:    { initials:'PT', name:'Paul Tudor Jones',      color:C.gold },
  druckenmiller: { initials:'SD', name:'Stanley Druckenmiller', color:C.ame600 },
  tepper: { initials:'DT', name:'David Tepper',            color:C.ink600 },
  icahn:  { initials:'CI', name:'Carl Icahn',              color:C.ame500 },
  ackman: { initials:'BA', name:'Bill Ackman',             color:C.ame400 },
  loeb:   { initials:'DL', name:'Daniel Loeb',             color:C.ink400 },
  chamath:{ initials:'CP', name:'Chamath Palihapitiya',    color:C.aqua400 },
  simons: { initials:'JS', name:'Jim Simons',              color:C.ink600 },
  griffin:{ initials:'KG', name:'Kenneth C. Griffin',      color:C.ame600 },
  livermore:     { initials:'JL', name:'Jesse Livermore',       color:C.gold },
  burry:  { initials:'MB', name:'Michael Burry',           color:C.ink400 },
};

export function HeroMessage({ hero='warren', text, time, isNew=false, modelTag, assetTickers }) {
  const h = HERO_MAP[hero] ?? HERO_MAP.warren;
  return (
    <div className="flex gap-2.5">
      <HeroAvatar id={hero} initials={h.initials} color={h.color} size={30}/>
      <div className="flex-1">
        <div className="mb-1 flex items-center gap-2">
          <div className="font-sans text-[17px] font-semibold text-ink-700">{h.name}</div>
          {time && <div className="font-sans text-[13px] text-ink-300">{time}</div>}
          {modelTag && <div className="ml-auto font-mono text-[9px] uppercase tracking-wide text-ink-300">{modelTag}</div>}
          {isNew && <div className={cn('h-1.5 w-1.5 rounded-pill bg-ame-400', !modelTag && 'ml-auto')}/>}
        </div>
        <div className="font-sans text-lg italic leading-relaxed text-ink-600"><AssetText text={text} extraTickers={assetTickers}/></div>
      </div>
    </div>
  );
}

export function UserMessage({ text, assetTickers }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[80%] rounded-[8px_8px_4px_8px] bg-ink-900 px-3.5 py-2.5 font-sans text-lg leading-normal text-white"><AssetText text={text} extraTickers={assetTickers}/></div>
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
