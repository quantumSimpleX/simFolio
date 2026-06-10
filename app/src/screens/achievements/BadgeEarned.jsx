import { useNavigate, useLocation } from 'react-router-dom'
import { C, SANS, DISPLAY } from '../../tokens'
import { BadgeGlyphForIndex, MedalGlyph, TrophyGlyph } from '../../components/Badges'
import { ProgressRing } from '../../components/Charts'

const MOMENT_TYPES = {
  badge: {
    eyebrow: 'Badge earned',
    eyebrowColor: C.aqua400,
    title: 'First Trade',
    desc: "You made your first simulated trade. You're an investor now.",
    progressLabel: '1 of 10 toward your first medal',
    progressSub: 'Keep trading, exploring, and learning.',
    progressColor: C.ame400,
    progressVal: 1,
    heroeQuote: '"Every investor started exactly here — with one trade."',
    ctaLabel: 'Continue  →',
    ctaBg: C.white,
    ctaColor: C.ink900,
  },
  medal: {
    eyebrow: 'Medal earned',
    eyebrowColor: C.gold,
    title: 'Apprentice',
    desc: '10 badges collected. You\'re building real investing habits.',
    progressLabel: '1 of 10 toward your first trophy',
    progressSub: 'Earn 9 more medals to unlock a trophy.',
    progressColor: C.goldLight,
    progressVal: 1,
    heroeQuote: '"Patience compounds. So does knowledge."',
    ctaLabel: 'Continue  →',
    ctaBg: C.white,
    ctaColor: C.ink900,
  },
  trophy: {
    eyebrow: 'Trophy earned',
    eyebrowColor: C.goldLight,
    title: 'The Disciplined Investor',
    desc: '100 badges. 10 medals. You think like an investor — not a speculator.',
    progressLabel: '1 of 10 toward Master of Trading',
    progressSub: 'The rarest achievement in simFolio.',
    progressColor: C.goldLight,
    progressVal: 1,
    heroeQuote: '"Discipline is the bridge between goals and accomplishment."',
    ctaLabel: 'Continue  →',
    ctaBg: C.white,
    ctaColor: C.ink900,
  },
}

export default function BadgeEarned() {
  const navigate = useNavigate()
  const { state } = useLocation()
  const type = state?.type || 'badge'
  const m = MOMENT_TYPES[type] || MOMENT_TYPES.badge

  return (
    <div style={{ width:'100%', minHeight:'100dvh', background:C.ink900, display:'flex', flexDirection:'column' }}>
      <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:24, padding:'40px', width:'100%', maxWidth:480, margin:'0 auto', boxSizing:'border-box' }}>
        {/* Glyph */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center' }}>
          {type === 'badge'  && <BadgeGlyphForIndex index={0} size={96} earned/>}
          {type === 'medal'  && <MedalGlyph size={88} earned/>}
          {type === 'trophy' && <TrophyGlyph size={100} earned/>}
        </div>

        {/* Text */}
        <div style={{ textAlign:'center' }}>
          <div style={{ fontFamily:SANS, fontSize:11, fontWeight:600, color:m.eyebrowColor, letterSpacing:'0.16em', textTransform:'uppercase', marginBottom:10 }}>{m.eyebrow}</div>
          <div style={{ fontFamily:DISPLAY, fontWeight:700, fontSize:36, color:C.white, letterSpacing:'-0.02em', lineHeight:1 }}>{m.title}</div>
          <div style={{ fontFamily:SANS, fontSize:15, color:C.ink400, marginTop:8, lineHeight:1.5 }}>{m.desc}</div>
        </div>

        {/* Progress card */}
        <div style={{ width:'100%', background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:8, padding:'16px 20px', display:'flex', alignItems:'center', gap:16 }}>
          <ProgressRing value={m.progressVal} total={10} size={52} color={m.progressColor}/>
          <div>
            <div style={{ fontFamily:SANS, fontWeight:600, fontSize:15, color:C.white, marginBottom:3 }}>{m.progressLabel}</div>
            <div style={{ fontFamily:SANS, fontSize:13, color:C.ink400 }}>{m.progressSub}</div>
          </div>
        </div>

        {/* Hero quote */}
        <div style={{ display:'flex', gap:10, alignItems:'flex-start', padding:'12px 16px', background:'rgba(255,255,255,0.04)', borderRadius:8, width:'100%' }}>
          <div style={{ width:26, height:26, borderRadius:'50%', background:`${C.ame400}20`, border:`1.5px solid ${C.ame400}50`, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:SANS, fontWeight:700, fontSize:9, color:C.ame400, flexShrink:0 }}>WB</div>
          <div style={{ fontFamily:SANS, fontSize:13, color:C.ink400, fontStyle:'italic', lineHeight:1.5 }}>{m.heroeQuote}</div>
        </div>
      </div>

      <div style={{ padding:'0 24px 36px', flexShrink:0, width:'100%', maxWidth:480, margin:'0 auto', boxSizing:'border-box' }}>
        <div
          onClick={() => navigate('/portfolio')}
          style={{ height:48, background:m.ctaBg, color:m.ctaColor, borderRadius:4, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:SANS, fontSize:15, fontWeight:700, cursor:'pointer' }}
        >
          {m.ctaLabel}
        </div>
      </div>
    </div>
  )
}
