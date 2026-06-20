import { Logo, NavToggles } from './Primitives';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePortfolio } from '../hooks/usePortfolio';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { cn } from '../lib/utils';

export function BottomNav({ active='portfolio' }) {
  const navigate = useNavigate();
  const tabs = [
    { id:'portfolio', label:'Portfolio', icon:'▤', path:'/portfolio' },
    { id:'markets',   label:'Markets',   icon:'◈', path:'/markets'   },
    { id:'orders',    label:'Orders',    icon:'≡', path:'/orders'    },
    { id:'ask',       label:'Ask',       icon:'◉', path:'/ask'       },
  ];
  return (
    <div className="flex h-[72px] flex-shrink-0 border-t border-ink-100 bg-white">
      {tabs.map(t => {
        const isActive = t.id === active;
        return (
          <div
            key={t.id}
            onClick={() => navigate(t.path)}
            className={cn('flex flex-1 cursor-pointer flex-col items-center justify-center gap-1', isActive ? 'text-ink-900' : 'text-ink-300')}
          >
            <div className="text-[22px]">{t.icon}</div>
            <div className={cn('font-sans text-[11px]', isActive ? 'font-semibold' : 'font-normal')}>{t.label}</div>
          </div>
        );
      })}
    </div>
  );
}

export function TopNav({ active='portfolio' }) {
  const navigate = useNavigate();
  const bp = useBreakpoint();
  const { user } = useAuth();
  const { cashBalance } = usePortfolio();

  const tabs = [
    { id:'portfolio', label:'Portfolio', path:'/portfolio' },
    { id:'markets',   label:'Markets',   path:'/markets'   },
    { id:'orders',    label:'Orders',    path:'/orders'    },
  ];

  const initials = user?.user_metadata?.first_name?.[0]?.toUpperCase() ?? 'U';
  const cashDisplay = cashBalance != null ? `$${cashBalance.toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 })}` : '—';

  // Mobile: compact bar — logo + toggles + avatar. Tabs live in BottomNav.
  if (bp === 'mobile') {
    return (
      <div className="flex h-[52px] flex-shrink-0 items-center gap-3 border-b border-ink-100 bg-white px-4">
        <div onClick={() => navigate('/')} className="cursor-pointer">
          <Logo size={18}/>
        </div>
        <div className="flex-1"/>
        <NavToggles/>
        <button type="button" onClick={() => navigate('/profile')} aria-label="Profile" title="Profile" className="flex h-[30px] w-[30px] cursor-pointer items-center justify-center rounded-pill bg-ink-900 font-sans text-[13px] font-bold text-white focus-visible:ring-2 focus-visible:ring-ame-400 focus-visible:ring-offset-2">{initials}</button>
      </div>
    );
  }

  const tablet = bp === 'tablet';
  return (
    <div className={cn('flex h-16 flex-shrink-0 items-center border-b border-ink-100 bg-white', tablet ? 'gap-5 px-5' : 'gap-10 px-12')}>
      <div onClick={() => navigate('/')} className="cursor-pointer">
        <Logo size={21}/>
      </div>
      <div className={cn('flex flex-1', tablet ? 'gap-4' : 'gap-7')}>
        {tabs.map(t => {
          const isActive = t.id === active;
          return (
            <div
              key={t.id}
              onClick={() => navigate(t.path)}
              className={cn('cursor-pointer whitespace-nowrap pb-0.5 font-sans text-sm', isActive ? 'border-b-2 border-ink-900 font-semibold text-ink-900' : 'border-b-2 border-transparent font-normal text-ink-400')}
            >
              {t.label}
            </div>
          );
        })}
      </div>
      <div className={cn('flex items-center', tablet ? 'gap-3' : 'gap-4')}>
        <NavToggles/>
        <div className="flex items-baseline gap-1.5 whitespace-nowrap font-sans text-ink-500"><span className="text-xs uppercase tracking-[0.12em]">Cash</span> <span className="text-xl font-bold text-ink-900">{cashDisplay}</span></div>
        <button type="button" onClick={() => navigate('/profile')} aria-label="Profile" title="Profile" className="flex h-[34px] w-[34px] cursor-pointer items-center justify-center rounded-pill bg-ink-900 font-sans text-sm font-bold text-white focus-visible:ring-2 focus-visible:ring-ame-400 focus-visible:ring-offset-2">{initials}</button>
      </div>
    </div>
  );
}

// Shared page-title row so the main tab pages look identical at every width.
export function PageHeader({ title, right }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <div className="font-sans text-2xl font-bold text-ink-900">{title}</div>
      {right}
    </div>
  );
}

export function BackHeader({ title, right, onBack }) {
  const navigate = useNavigate();
  return (
    <div className="flex flex-shrink-0 items-center gap-3.5 border-b border-ink-100 px-6 pb-3.5">
      <div onClick={onBack || (() => navigate(-1))} className="flex-shrink-0 cursor-pointer font-sans text-sm text-ame-400">← Back</div>
      <div className="flex-1 text-center font-sans text-[17px] font-bold text-ink-900">{title}</div>
      {right && <div className="flex-shrink-0">{right}</div>}
    </div>
  );
}
