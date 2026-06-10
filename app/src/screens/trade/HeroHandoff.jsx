import { useNavigate } from 'react-router-dom'
import { C, SANS } from '../../tokens'
import { CTA, GhostCTA } from '../../components/Primitives'
import { AppShell } from '../../components/AppShell'
import { SageMsg } from '../../components/HeroMessage'

export default function HeroHandoff() {
  const navigate = useNavigate()

  return (
    <AppShell active="portfolio">
      <div style={{ maxWidth:560, margin:'0 auto', display:'flex', flexDirection:'column', gap:20 }}>
        <SageMsg text="You just bought your first stock. You're officially an investor."/>
        <SageMsg text="Before you continue — there's someone I think you should meet. Warren has been following what you've shared, and has a thought about Apple."/>

        {/* Warren intro card */}
        <div style={{ background:C.white, border:`1.5px solid ${C.ame400}30`, borderRadius:8, padding:'18px 20px', display:'flex', gap:16, alignItems:'flex-start' }}>
          <div style={{ width:48, height:48, borderRadius:'50%', background:`${C.ame400}12`, border:`1.5px solid ${C.ame400}35`, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:SANS, fontWeight:700, fontSize:16, color:C.ame400, flexShrink:0 }}>WB</div>
          <div style={{ flex:1 }}>
            <div style={{ fontFamily:SANS, fontWeight:700, fontSize:17, color:C.ink900, marginBottom:2 }}>Warren Buffett</div>
            <div style={{ fontFamily:SANS, fontSize:13, color:C.ame400, marginBottom:10 }}>Value investor · Your first advisor</div>
            <div style={{ fontFamily:SANS, fontSize:14, color:C.ink600, lineHeight:1.55, fontStyle:'italic' }}>
              "The best time to buy a wonderful company at a fair price is better than a wonderful price at a fair company. Apple qualifies on both counts."
            </div>
          </div>
        </div>

        {/* Match signal */}
        <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background:C.ame50, borderRadius:4, border:`1px solid ${C.ame100}` }}>
          <div style={{ width:6, height:6, borderRadius:'50%', background:C.ame400, flexShrink:0 }}/>
          <div style={{ fontFamily:SANS, fontSize:13, color:C.ame600, lineHeight:1.4 }}>
            Matched based on your long-term goal and interest in quality businesses.
          </div>
        </div>

        <div style={{ fontFamily:SANS, fontSize:14, color:C.ink500, lineHeight:1.55 }}>
          From here, Warren will be your guide. He can discuss any trade, question your thinking, and suggest things worth reading. The Sage steps back.
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:10, marginTop:4 }}>
          <CTA label="Talk to Warren  →" full onClick={() => navigate('/ask')}/>
          <GhostCTA label="Continue buying first" onClick={() => navigate('/markets')}/>
        </div>
      </div>
    </AppShell>
  )
}
