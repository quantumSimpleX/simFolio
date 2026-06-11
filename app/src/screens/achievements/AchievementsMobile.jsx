import { useNavigate } from 'react-router-dom'
import { C, SANS, DISPLAY } from '../../tokens'
import { Eyebrow } from '../../components/Primitives'
import { AppShell } from '../../components/AppShell'
import { PageHeader } from '../../components/Nav'
import { useIsMobile } from '../../hooks/useBreakpoint'
import { BadgeGlyphForIndex, MedalGlyph, TrophyGlyph } from '../../components/Badges'
import { useAchievements } from '../../hooks/useAchievements'

export default function AchievementsMobile() {
  const navigate = useNavigate()
  const mobile = useIsMobile()
  const { badges, earnedCount, medalCount, trophyCount, isLoading } = useAchievements()

  const toNextMedal = 10 - (earnedCount % 10)

  return (
    <AppShell active="achievements" maxWidth={860}>
      <PageHeader title="Achievements"/>

      <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
        {/* Progress summary */}
        <div style={{ background:C.white, border:`1px solid ${C.ink100}`, borderRadius:8, padding:'18px 20px', display:'flex', gap:20, alignItems:'center' }}>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:DISPLAY, fontWeight:700, fontSize:28, color:C.ink900, letterSpacing:'-0.02em', lineHeight:1 }}>
              {isLoading ? '…' : `${earnedCount} badge${earnedCount !== 1 ? 's' : ''}`}
            </div>
            <div style={{ fontFamily:SANS, fontSize:13, color:C.ink400, marginTop:4 }}>
              {toNextMedal === 10 && medalCount === 0 ? '10 badges → first medal' : `${toNextMedal} more → next medal`}
            </div>
            <div style={{ marginTop:10, height:5, background:C.ink100, borderRadius:3 }}>
              <div style={{ width:`${((earnedCount % 10) / 10) * 100}%`, height:'100%', background:C.ame400, borderRadius:3 }}/>
            </div>
            <div style={{ fontFamily:SANS, fontSize:11, color:C.ink400, marginTop:4 }}>{earnedCount % 10} of 10 badges toward next medal</div>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:10, alignItems:'center' }}>
            <div style={{ display:'flex', gap:8, alignItems:'flex-end' }}>
              <div style={{ textAlign:'center' }}>
                <MedalGlyph size={36} earned={medalCount > 0}/>
                <div style={{ fontFamily:SANS, fontSize:10, color:C.ink400, marginTop:4 }}>{medalCount} medal{medalCount !== 1 ? 's' : ''}</div>
              </div>
              <div style={{ textAlign:'center' }}>
                <TrophyGlyph size={44} earned={trophyCount > 0}/>
                <div style={{ fontFamily:SANS, fontSize:10, color:C.ink400, marginTop:4 }}>{trophyCount} trophies</div>
              </div>
            </div>
          </div>
        </div>

        {/* Badge grid */}
        <div>
          <div style={{ marginBottom:12 }}><Eyebrow>Badges · {earnedCount} earned of {badges.length}</Eyebrow></div>
          <div style={{ display:'grid', gridTemplateColumns:mobile?'1fr 1fr 1fr':'repeat(5, 1fr)', gap:10 }}>
            {badges.map((b, i) => (
              <div
                key={b.id}
                onClick={() => b.earned && navigate('/badge-earned', { state: { badge: b } })}
                style={{ background:C.white, border:`1px solid ${b.earned?C.ink100:C.ink50}`, borderRadius:8, padding:'14px 10px', display:'flex', flexDirection:'column', alignItems:'center', gap:6, opacity:b.earned?1:0.5, cursor:b.earned?'pointer':'default' }}
              >
                <BadgeGlyphForIndex index={i} size={36} earned={b.earned}/>
                <div style={{ fontFamily:SANS, fontWeight:600, fontSize:12, color:b.earned?C.ink900:C.ink400, textAlign:'center', lineHeight:1.2 }}>{b.name}</div>
                {!b.earned && <div style={{ fontFamily:SANS, fontSize:10, color:C.ink300, textAlign:'center', lineHeight:1.3 }}>{b.desc}</div>}
              </div>
            ))}
          </div>
        </div>

        {/* Medal progress */}
        {medalCount > 0 && (
          <div>
            <div style={{ marginBottom:12 }}><Eyebrow>Medals · {medalCount} earned</Eyebrow></div>
            <div style={{ display:'flex', gap:10 }}>
              {Array.from({ length: medalCount }, (_, i) => (
                <div key={i} style={{ flex:1, maxWidth:140, background:C.white, border:`1px solid ${C.ink100}`, borderRadius:8, padding:'14px', display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
                  <MedalGlyph size={40} earned/>
                  <div style={{ fontFamily:SANS, fontWeight:600, fontSize:12, color:C.gold, textAlign:'center' }}>Medal {i + 1}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
