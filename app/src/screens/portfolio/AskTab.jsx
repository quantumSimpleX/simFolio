import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BottomNav, TopNav } from '../../components/Nav';
import { DotMenu } from '../../components/DotMenu';
import { ChatComposer, ChatMessages } from '../../components/HeroChatPanel';
import { useHeroChat, useConversationHistory } from '../../hooks/useHeroChat';
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

  const primaryHero = heroes[0];
  const heroId = primaryHero?.id ?? 'sage';

  const portfolioContext = buildHeroContext(positions, cashBalance, watchlist);
  const assetTickers = [...positions.map(p => p.ticker), ...watchlist];

  // Cross-hero timeline: chat shows the unified conversation across all heroes,
  // while outgoing messages (below) still target the active mentor (heroes[0]).
  const { data: history, isLoading: historyLoading } = useConversationHistory();
  const { mutate: sendMessage, isPending, data: lastReply } = useHeroChat(heroId, portfolioContext);

  function handleSend(text) {
    const msg = (text || input).trim();
    if (!msg || isPending) return;
    setInput('');
    sendMessage(msg);
  }

  const mentorName = primaryHero?.name ?? 'Sage';

  return (
    <div className="flex h-[100dvh] w-full flex-col overflow-hidden bg-paper">
      <TopNav active="portfolio"/>
      <div className="flex flex-shrink-0 items-center gap-2.5 px-3 py-2">
        <div className="flex">
          {primaryHero && (
            <HeroAvatar id={primaryHero.id} initials={primaryHero.initials} color={primaryHero.color} size={34}/>
          )}
        </div>
        <div>
          <div className="font-sans text-lg font-semibold text-ink-900">{mentorName}</div>
          <div className="font-sans text-sm text-ink-400">Your mentor · watching your portfolio</div>
        </div>
        <div className="ml-auto flex items-center">
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
        emptyText="Ask your mentor anything about your portfolio or investing."
        assetTickers={assetTickers}
      />

      <div className="flex-shrink-0 border-t border-ink-100 px-3 pb-3.5 pt-2">
        <ChatComposer value={input} onChange={setInput} onSend={() => handleSend()} isPending={isPending}/>
      </div>
      <BottomNav active="ask"/>
    </div>
  );
}
