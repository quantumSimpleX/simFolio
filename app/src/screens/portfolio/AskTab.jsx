import { useState } from 'react';
import { BottomNav, TopNav } from '../../components/Nav';
import { QuickPrompts, ChatComposer, ChatMessages } from '../../components/HeroChatPanel';
import { useHeroChat, useHeroHistory } from '../../hooks/useHeroChat';
import { useHeroSelections } from '../../hooks/useHeroSelections';
import { usePortfolio } from '../../hooks/usePortfolio';

export default function AskTab() {
  const { heroes } = useHeroSelections();
  const { positions, cashBalance } = usePortfolio();
  const [input, setInput] = useState('');

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

  const councilNames = heroes.map(h => h.name.split(' ')[0]).join(' · ');

  return (
    <div className="flex h-[100dvh] w-full flex-col overflow-hidden bg-paper">
      <TopNav active="portfolio"/>
      <div className="flex flex-shrink-0 items-center gap-2.5 px-3 py-2">
        <div className="flex">
          {heroes.slice(0,3).map((h, i) => (
            <div key={h.id} className="flex h-[34px] w-[34px] items-center justify-center rounded-pill font-sans text-xs font-bold" style={{ background:`${h.color}12`, border:`1.5px solid ${h.color}35`, color:h.color, marginLeft:i>0?-8:0 }}>{h.initials}</div>
          ))}
        </div>
        <div>
          <div className="font-sans text-lg font-semibold text-ink-900">Your Council</div>
          <div className="font-sans text-sm text-ink-400">{councilNames || 'Sage'}</div>
        </div>
        <div className="ml-auto h-[7px] w-[7px] rounded-pill bg-aqua-400"/>
      </div>

      <QuickPrompts onPick={handleSend} className="flex-shrink-0 border-b border-ink-100 px-3 py-1.5"/>

      <ChatMessages
        className="flex-1 px-3 py-2.5"
        history={history}
        heroId={heroId}
        isPending={isPending}
        historyLoading={historyLoading}
        emptyText="Ask your council anything about your portfolio or investing."
      />

      <div className="flex-shrink-0 border-t border-ink-100 px-3 pb-3.5 pt-2">
        <ChatComposer value={input} onChange={setInput} onSend={() => handleSend()} isPending={isPending}/>
      </div>
      <BottomNav active="ask"/>
    </div>
  );
}
