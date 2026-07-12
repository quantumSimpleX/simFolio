import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { HeroAvatar } from './Primitives';
import { DotMenu } from './DotMenu';
import { ChatComposer, ChatMessages } from './HeroChatPanel';
import { usePortfolio } from '../hooks/usePortfolio';
import { useHeroSelections } from '../hooks/useHeroSelections';
import { useWatchlist } from '../hooks/useWatchlist';
import { buildHeroContext } from '../lib/heroContext';
import { useHeroChat, useConversationHistory } from '../hooks/useHeroChat';

// Self-contained hero chat card for the desktop/tablet right rail. Pulls its own
// portfolio + mentor context, so any page can drop it in. Chat runs against the
// user's single active mentor (heroes[0]).
export function HeroSidebar({ className }) {
  const navigate = useNavigate();
  const { positions, cashBalance } = usePortfolio();
  const { heroes } = useHeroSelections();
  const { watchlist } = useWatchlist();

  const primaryHero = heroes[0];
  const heroId = primaryHero?.id ?? 'sage';

  const portfolioContext = buildHeroContext(positions, cashBalance, watchlist);
  const assetTickers = [...positions.map(p => p.ticker), ...watchlist];

  // Cross-hero timeline: chat shows the unified conversation across all heroes,
  // while outgoing messages (below) still target the active mentor (heroes[0]).
  const { data: history } = useConversationHistory();
  const { mutate: sendMessage, isPending, data: lastReply } = useHeroChat(heroId, portfolioContext);

  const [input, setInput] = useState('');

  function handleSend(text) {
    const msg = (text || input).trim();
    if (!msg || isPending) return;
    setInput('');
    sendMessage(msg);
  }

  const mentorName = primaryHero?.name ?? 'Sage';

  return (
    <div className={cn('sticky top-7 flex w-[380px] flex-shrink-0 flex-col overflow-hidden rounded-card border border-ink-100 bg-white [height:calc(100dvh/var(--zoom)-132px)]', className)}>
      <div className="flex h-11 items-center justify-between border-b border-ink-100 pl-4 pr-1.5">
        <div className="font-sans text-[15px] font-semibold text-ink-900">{primaryHero?.name ?? 'Sage'}</div>
        <DotMenu items={[{ label: 'Find a new mentor', onSelect: () => navigate('/find-mentor') }]}/>
      </div>
      <div className="flex items-center gap-2.5 border-b border-ink-100 px-3 py-2">
        {primaryHero && (
          <HeroAvatar id={primaryHero.id} initials={primaryHero.initials} color={primaryHero.color} size={30}/>
        )}
        <div>
          <div className="font-sans text-[17px] font-semibold text-ink-900">{mentorName}</div>
          <div className="font-sans text-sm text-ink-400">Your mentor · watching your portfolio</div>
        </div>
      </div>
      <ChatMessages
        className="flex-1 px-3 py-2.5"
        history={history}
        heroId={heroId}
        isPending={isPending}
        lastModel={lastReply?.model}
        assetTickers={assetTickers}
      />
      <div className="border-t border-ink-100 px-3 pb-3 pt-2">
        <ChatComposer value={input} onChange={setInput} onSend={() => handleSend()} isPending={isPending}/>
      </div>
    </div>
  );
}
