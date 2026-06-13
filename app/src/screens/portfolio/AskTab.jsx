import { useState, useRef, useEffect } from 'react';
import { C, SANS } from '../../tokens';
import { BottomNav, TopNav } from '../../components/Nav';
import { HeroMessage, UserMessage } from '../../components/HeroMessage';
import { useHeroChat, useHeroHistory } from '../../hooks/useHeroChat';
import { useHeroSelections } from '../../hooks/useHeroSelections';
import { usePortfolio } from '../../hooks/usePortfolio';

const QUICK_PROMPTS = ['Review my picks', 'Too concentrated?', 'Am I diversified?'];

export default function AskTab() {
  const { heroes } = useHeroSelections();
  const { positions, cashBalance } = usePortfolio();
  const [input, setInput] = useState('');
  const bottomRef = useRef(null);

  // Use first hero in council for chat (council shares one window)
  const primaryHero = heroes[0];
  const heroId = primaryHero?.id ?? 'sage';

  const portfolioContext = positions.length
    ? `Cash: $${cashBalance?.toFixed(2) ?? 0}. Holdings: ${positions.map(p => `${p.ticker} (${parseFloat(p.total_qty)} shares @ avg $${parseFloat(p.average_cost_basis).toFixed(2)}, current $${p.price?.toFixed(2) ?? '?'})`).join(', ')}.`
    : 'No positions yet.';

  const { data: history, isLoading: historyLoading } = useHeroHistory(heroId);
  const { mutate: sendMessage, isPending } = useHeroChat(heroId, portfolioContext);

  function handleSend(text) {
    const msg = (text || input).trim();
    if (!msg || isPending) return;
    setInput('');
    sendMessage(msg);
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:'smooth' });
  }, [history]);

  const councilNames = heroes.map(h => h.name.split(' ')[0]).join(' · ');

  return (
    <div style={{ width:'100%', height:'100dvh', background:C.paper, display:'flex', flexDirection:'column', overflow:'hidden' }}>
      <TopNav active="portfolio"/>
      <div style={{ padding:'8px 12px', display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
        <div style={{ display:'flex' }}>
          {heroes.slice(0,3).map((h, i) => (
            <div key={h.id} style={{ width:34, height:34, borderRadius:'50%', background:`${h.color}12`, border:`1.5px solid ${h.color}35`, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:SANS, fontWeight:700, fontSize:12, color:h.color, marginLeft:i>0?-8:0 }}>{h.initials}</div>
          ))}
        </div>
        <div>
          <div style={{ fontFamily:SANS, fontSize:18, fontWeight:600, color:C.ink900 }}>Your Council</div>
          <div style={{ fontFamily:SANS, fontSize:14, color:C.ink400 }}>{councilNames || 'Sage'}</div>
        </div>
        <div style={{ width:7, height:7, borderRadius:'50%', background:C.aqua400, marginLeft:'auto' }}/>
      </div>

      <div style={{ padding:'6px 12px', borderBottom:`1px solid ${C.ink100}`, display:'flex', flexWrap:'wrap', gap:5, flexShrink:0 }}>
        {QUICK_PROMPTS.map(p => (
          <div key={p} onClick={() => handleSend(p)} style={{ padding:'4px 10px', background:C.ink50, border:`1px solid ${C.ink100}`, borderRadius:999, fontFamily:SANS, fontSize:14, color:C.ink700, cursor:'pointer' }}>{p}</div>
        ))}
      </div>

      <div style={{ flex:1, padding:'10px 12px', display:'flex', flexDirection:'column', gap:10, overflow:'auto' }}>
        {historyLoading && (
          <div style={{ fontFamily:SANS, fontSize:17, color:C.ink400, textAlign:'center', paddingTop:16 }}>Loading conversation…</div>
        )}
        {!historyLoading && history?.length === 0 && (
          <div style={{ fontFamily:SANS, fontSize:17, color:C.ink400, fontStyle:'italic', textAlign:'center', paddingTop:16 }}>
            Ask your council anything about your portfolio or investing.
          </div>
        )}
        {(history ?? []).map((msg, i) => (
          msg.role === 'user'
            ? <UserMessage key={i} text={msg.content}/>
            : <HeroMessage key={i} hero={heroId} text={`"${msg.content}"`}/>
        ))}
        {isPending && <div style={{ fontFamily:SANS, fontSize:17, color:C.ink400, fontStyle:'italic' }}>Thinking…</div>}
        <div ref={bottomRef}/>
      </div>

      <div style={{ padding:'8px 12px 14px', borderTop:`1px solid ${C.ink100}`, flexShrink:0 }}>
        <div style={{ display:'flex', gap:8 }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key==='Enter' && handleSend()}
            placeholder="Ask your council…"
            style={{ flex:1, height:44, border:`1px solid ${C.ink200}`, borderRadius:4, padding:'0 12px', fontFamily:SANS, fontSize:16, color:C.ink900, background:C.white, outline:'none' }}
          />
          <div onClick={() => handleSend()} style={{ width:44, height:44, background:C.ink900, borderRadius:4, display:'flex', alignItems:'center', justifyContent:'center', color:C.white, cursor:'pointer', fontSize:18, opacity:isPending?0.5:1 }}>→</div>
        </div>
      </div>
      <BottomNav active="ask"/>
    </div>
  );
}
