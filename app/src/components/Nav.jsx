import { C, SANS } from '../tokens';
import { Logo, LangToggle, ThemeToggle } from './Primitives';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePortfolio } from '../hooks/usePortfolio';

export function BottomNav({ active='portfolio' }) {
  const navigate = useNavigate();
  const tabs = [
    { id:'portfolio',    label:'Portfolio',    icon:'▤', path:'/portfolio' },
    { id:'markets',      label:'Markets',      icon:'◈', path:'/markets'   },
    { id:'ask',          label:'Ask',          icon:'◉', path:'/ask'       },
    { id:'achievements', label:'Achievements', icon:'◆', path:'/achievements' },
  ];
  return (
    <div style={{ height:72, borderTop:`1px solid ${C.ink100}`, display:'flex', background:C.white, flexShrink:0 }}>
      {tabs.map(t => {
        const isActive = t.id === active;
        return (
          <div key={t.id} onClick={() => navigate(t.path)} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:4, cursor:'pointer', color:isActive?C.ink900:C.ink300 }}>
            <div style={{ fontSize:22 }}>{t.icon}</div>
            <div style={{ fontFamily:SANS, fontSize:11, fontWeight:isActive?600:400 }}>{t.label}</div>
          </div>
        );
      })}
    </div>
  );
}

export function TopNav({ active='portfolio' }) {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { cashBalance } = usePortfolio();

  const tabs = [
    { id:'portfolio',    label:'Portfolio',    path:'/portfolio'    },
    { id:'markets',      label:'Markets',      path:'/markets'      },
    { id:'orders',       label:'Orders',       path:'/orders'       },
    { id:'achievements', label:'Achievements', path:'/achievements' },
  ];

  const initials = user?.user_metadata?.first_name?.[0]?.toUpperCase() ?? 'U';
  const cashDisplay = cashBalance != null ? `$${cashBalance.toLocaleString('en-US', { minimumFractionDigits:2, maximumFractionDigits:2 })}` : '—';

  return (
    <div style={{ height:64, background:C.white, borderBottom:`1px solid ${C.ink100}`, display:'flex', alignItems:'center', padding:'0 48px', gap:40, flexShrink:0 }}>
      <div onClick={() => navigate('/')} style={{ cursor:'pointer' }}>
        <Logo size={21}/>
      </div>
      <div style={{ display:'flex', gap:28, flex:1 }}>
        {tabs.map(t => {
          const isActive = t.id === active;
          return (
            <div key={t.id} onClick={() => navigate(t.path)} style={{ fontFamily:SANS, fontSize:14, fontWeight:isActive?600:400, color:isActive?C.ink900:C.ink400, cursor:'pointer', paddingBottom:2, borderBottom:isActive?`2px solid ${C.ink900}`:'2px solid transparent' }}>
              {t.label}
            </div>
          );
        })}
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:16 }}>
        <LangToggle/>
        <ThemeToggle/>
        <div style={{ fontFamily:SANS, fontSize:14, color:C.ink500 }}>Cash <span style={{ color:C.ink900, fontWeight:600 }}>{cashDisplay}</span></div>
        <div onClick={signOut} title="Sign out" style={{ width:34, height:34, borderRadius:'50%', background:C.ink900, display:'flex', alignItems:'center', justifyContent:'center', color:C.white, fontFamily:SANS, fontSize:14, fontWeight:700, cursor:'pointer' }}>{initials}</div>
      </div>
    </div>
  );
}

export function BackHeader({ title, right, onBack }) {
  const navigate = useNavigate();
  return (
    <div style={{ padding:'0 24px 14px', display:'flex', alignItems:'center', gap:14, flexShrink:0, borderBottom:`1px solid ${C.ink100}` }}>
      <div onClick={onBack || (() => navigate(-1))} style={{ fontFamily:SANS, fontSize:14, color:C.ame400, cursor:'pointer', flexShrink:0 }}>← Back</div>
      <div style={{ flex:1, textAlign:'center', fontFamily:SANS, fontSize:17, fontWeight:700, color:C.ink900 }}>{title}</div>
      {right && <div style={{ flexShrink:0 }}>{right}</div>}
    </div>
  );
}
