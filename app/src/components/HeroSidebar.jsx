import { useState } from 'react';
import { cn } from '../lib/utils';
import { HeroAvatar } from './Primitives';
import { ChatComposer, ChatMessages } from './HeroChatPanel';
import { usePortfolio } from '../hooks/usePortfolio';
import { useHeroSelections } from '../hooks/useHeroSelections';
import { useWatchlist } from '../hooks/useWatchlist';
import { buildHeroContext } from '../lib/heroContext';
import { useHeroChat, useHeroHistory } from '../hooks/useHeroChat';

// Self-contained hero chat card for the desktop/tablet right rail. Pulls its own
// portfolio + council context, so any page can drop it in. The council shares one
// chat window (chat runs against the first hero).
export function HeroSidebar({ className }) {
  const { positions, cashBalance } = usePortfolio();
  const { heroes } = useHeroSelections();
  const { watchlist } = useWatchlist();

  const primaryHero = heroes[0];
  const heroId = primaryHero?.id ?? 'sage';

  const portfolioContext = buildHeroContext(positions, cashBalance, watchlist);
  const assetTickers = [...positions.map(p => p.ticker), ...watchlist];

  const { data: history } = useHeroHistory(heroId);
  const { mutate: sendMessage, isPending, data: lastReply } = useHeroChat(heroId, portfolioContext);

  const [input, setInput] = useState('');
  const [activeTab, setActiveTab] = useState('Council');

  function handleSend(text) {
    const msg = (text || input).trim();
    if (!msg || isPending) return;
    setInput('');
    sendMessage(msg);
  }

  const councilNames = heroes.map(h => h.name.split(' ')[0]).join(' · ');

  return (
    <div className={cn('sticky top-7 flex w-[380px] flex-shrink-0 flex-col overflow-hidden rounded-card border border-ink-100 bg-white [height:calc(100dvh/var(--zoom)-132px)]', className)}>
      <div className="flex h-11 items-stretch border-b border-ink-100">
        {['Council', ...heroes.map(h => h.name.split(' ')[0])].slice(0,3).map(t => (
          <div key={t} onClick={() => setActiveTab(t)} className={cn('flex flex-1 cursor-pointer items-center justify-center border-b-2 font-sans text-[15px]', activeTab===t ? 'border-ink-900 font-semibold text-ink-900' : 'border-transparent font-normal text-ink-400')}>{t}</div>
        ))}
      </div>
      <div className="flex items-center gap-2.5 border-b border-ink-100 px-3 py-2">
        <div className="flex">
          {heroes.slice(0,3).map((h,i) => (
            <div key={h.id} style={{ marginLeft:i>0?-8:0 }}>
              <HeroAvatar id={h.id} initials={h.initials} color={h.color} size={30}/>
            </div>
          ))}
        </div>
        <div>
          <div className="font-sans text-[17px] font-semibold text-ink-900">{councilNames || 'Sage'}</div>
          <div className="font-sans text-sm text-ink-400">{heroes.length} of 3 council slots · watching your portfolio</div>
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
