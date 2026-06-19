import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomNav, TopNav } from '../../components/Nav';
import { DotMenu } from '../../components/DotMenu';
import { ChatComposer, ChatMessages } from '../../components/HeroChatPanel';
import { useHeroChat, useHeroHistory } from '../../hooks/useHeroChat';
import { useHeroSelections } from '../../hooks/useHeroSelections';
import { usePortfolio } from '../../hooks/usePortfolio';
import { useWatchlist } from '../../hooks/useWatchlist';
import { buildHeroContext } from '../../lib/heroContext';
import { HeroAvatar } from '../../components/Primitives';

export default function AskTab() {
  const navigate = useNavigate();
  const { heroes } = useHeroSelections();
  const { positions, cashBalance } = usePortfolio();
  const { watchlist } = useWatchlist();
  const [input, setInput] = useState('');

  // Use first hero in council for chat (council shares one window)
  const primaryHero = heroes[0];
  const heroId = primaryHero?.id ?? 'sage';

  const portfolioContext = buildHeroContext(positions, cashBalance, watchlist);
  const assetTickers = [...positions.map(p => p.ticker), ...watchlist];

  const { data: history, isLoading: historyLoading } = useHeroHistory(heroId);
  const { mutate: sendMessage, isPending, data: lastReply } = useHeroChat(heroId, portfolioContext);

  function handleSend(text) {
    const msg = (text || input).trim();
    if (!msg || isPending) return;
    setInput('');
    sendMessage(msg);
  }

  const councilNames = heroes.map(h => h.name).join(' · ');

  return (
    <div className="flex h-[100dvh] w-full flex-col overflow-hidden bg-paper">
      <TopNav active="portfolio"/>
      <div className="flex flex-shrink-0 items-center gap-2.5 px-3 py-2">
        <div className="flex">
          {heroes.slice(0,3).map((h, i) => (
            <div key={h.id} style={{ marginLeft:i>0?-8:0 }}>
              <HeroAvatar id={h.id} initials={h.initials} color={h.color} size={34}/>
            </div>
          ))}
        </div>
        <div>
          <div className="font-sans text-lg font-semibold text-ink-900">Your Council</div>
          <div className="font-sans text-sm text-ink-400">{councilNames || 'Sage'}</div>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="h-[7px] w-[7px] rounded-pill bg-aqua-400"/>
          <DotMenu items={[{ label: 'Find a new mentor', onSelect: () => navigate('/find-mentor') }]}/>
        </div>
      </div>

      <ChatMessages
        className="flex-1 px-3 py-2.5"
        history={history}
        heroId={heroId}
        isPending={isPending}
        lastModel={lastReply?.model}
        historyLoading={historyLoading}
        emptyText="Ask your council anything about your portfolio or investing."
        assetTickers={assetTickers}
      />

      <div className="flex-shrink-0 border-t border-ink-100 px-3 pb-3.5 pt-2">
        <ChatComposer value={input} onChange={setInput} onSend={() => handleSend()} isPending={isPending}/>
      </div>
      <BottomNav active="ask"/>
    </div>
  );
}
