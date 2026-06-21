import { C } from '../tokens';

// a11y: when a `label` is supplied the glyph is exposed as an image with that
// accessible name; otherwise it is decorative (a sibling text node names it).
function a11y(label) {
  return label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': 'true' };
}

export function BadgeGlyph({ type='diamond', size=36, color=C.aqua400, earned=false, label }) {
  const op = earned ? 1 : 0.28;
  const s = size;
  const h = s/2;
  const ax = a11y(label);
  if (type === 'diamond') {
    return (
      <svg width={s} height={s} style={{ opacity:op }} {...ax}>
        <polygon points={`${h},2 ${s-2},${h} ${h},${s-2} 2,${h}`} fill={`${color}10`} stroke={color} strokeWidth={1.75}/>
        <polygon points={`${h},8 ${s-8},${h} ${h},${s-8} 8,${h}`} fill="none" stroke={color} strokeWidth={1}/>
      </svg>
    );
  }
  if (type === 'hex') {
    const pts = Array.from({length:6},(_,i)=>{const a=i*60-30;return `${h+h*0.85*Math.cos(a*Math.PI/180)},${h+h*0.85*Math.sin(a*Math.PI/180)}`;}).join(' ');
    return (
      <svg width={s} height={s} style={{ opacity:op }} {...ax}>
        <polygon points={pts} fill={`${color}10`} stroke={color} strokeWidth={1.75}/>
        <circle cx={h} cy={h} r={h*0.25} fill="none" stroke={color} strokeWidth={1.25}/>
      </svg>
    );
  }
  if (type === 'triangle') {
    return (
      <svg width={s} height={s} style={{ opacity:op }} {...ax}>
        <polygon points={`${h},3 ${s-3},${s-3} 3,${s-3}`} fill={`${color}10`} stroke={color} strokeWidth={1.75}/>
        <polygon points={`${h},10 ${s-10},${s-10} 10,${s-10}`} fill="none" stroke={color} strokeWidth={1}/>
      </svg>
    );
  }
  if (type === 'star') {
    const star = Array.from({length:10},(_,i)=>{const r=i%2===0?h*0.85:h*0.4;const a=i*36-90;return `${h+r*Math.cos(a*Math.PI/180)},${h+r*Math.sin(a*Math.PI/180)}`;}).join(' ');
    return (
      <svg width={s} height={s} style={{ opacity:op }} {...ax}>
        <polygon points={star} fill={`${color}10`} stroke={color} strokeWidth={1.75}/>
      </svg>
    );
  }
  return (
    <svg width={s} height={s} style={{ opacity:op }} {...ax}>
      <circle cx={h} cy={h} r={h-2} fill={`${color}10`} stroke={color} strokeWidth={1.75}/>
      <circle cx={h} cy={h} r={h*0.45} fill="none" stroke={color} strokeWidth={1.25}/>
    </svg>
  );
}

export function MedalGlyph({ size=36, earned=false, label }) {
  const op = earned ? 1 : 0.3;
  const s = size, h = s/2;
  return (
    <svg width={s} height={s} style={{ opacity:op }} {...a11y(label)}>
      <circle cx={h} cy={h} r={h-2} fill={`${C.gold}15`} stroke={C.gold} strokeWidth={2}/>
      <circle cx={h} cy={h} r={h*0.5} fill={`${C.gold}25`} stroke={C.gold} strokeWidth={1.25}/>
    </svg>
  );
}

export function TrophyGlyph({ size=44, earned=false, label }) {
  const op = earned ? 1 : 0.3;
  const s = size, h = s/2;
  const pts = `${h*0.35},${s*0.1} ${h*1.65},${s*0.1} ${h*1.65},${s*0.55} ${h*1.3},${s*0.7} ${h*1.2},${s*0.8} ${h*1.4},${s*0.9} ${h*0.6},${s*0.9} ${h*0.8},${s*0.8} ${h*0.7},${s*0.7} ${h*0.35},${s*0.55}`;
  return (
    <svg width={s} height={s} style={{ opacity:op }} {...a11y(label)}>
      <polygon points={pts} fill={`${C.gold}15`} stroke={C.gold} strokeWidth={1.75} strokeLinejoin="round"/>
    </svg>
  );
}

const GLYPH_TYPES = ['diamond','hex','triangle','circle','star','diamond','hex','triangle','circle','star','diamond','hex','triangle','circle'];
const GLYPH_COLORS = [C.aqua400,C.ame400,C.aqua400,C.ame400,C.gold,C.aqua400,C.ame400,C.aqua400,C.gold,C.ame400,C.aqua400,C.ame400,C.gold,C.aqua400];

export function BadgeGlyphForIndex({ index, size=36, earned=false, label }) {
  return <BadgeGlyph type={GLYPH_TYPES[index%GLYPH_TYPES.length]} size={size} color={GLYPH_COLORS[index%GLYPH_COLORS.length]} earned={earned} label={label}/>;
}
