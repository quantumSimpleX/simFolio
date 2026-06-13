import { StatusBar, CTA } from '../../components/Primitives';
import { useNavigate } from 'react-router-dom';
import { cn } from '../../lib/utils';

export default function ReturningUser() {
  const navigate = useNavigate();
  const rows = [
    { label:'Portfolio value', value:'$28,340' },
    { label:'Pending orders',  value:'2' },
    { label:'Last visited',    value:'3 days ago' },
  ];
  return (
    <div className="flex min-h-[680px] w-[390px] flex-col bg-paper">
      <StatusBar/>
      <div className="flex flex-col gap-6 px-7 py-7">
        <div className="flex flex-col gap-2">
          <div className="font-display text-[30px] font-bold tracking-[-0.02em] text-ink-900">Welcome back, Jamie.</div>
          <div className="font-sans text-base leading-snug text-ink-500">
            Your portfolio is up <span className="font-semibold text-aqua-600">+$1,120</span> since your last visit.
          </div>
        </div>

        <div className="rounded-card border border-ink-100 bg-white px-5">
          {rows.map(({ label, value }, i) => (
            <div key={label} className={cn('flex items-center justify-between py-3.5', i < rows.length - 1 && 'border-b border-ink-100')}>
              <div className="font-sans text-sm text-ink-500">{label}</div>
              <div className="font-sans text-sm font-semibold text-ink-900">{value}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-2.5 rounded-card border border-ame-100 bg-ame-50 px-4 py-3">
          <div className="flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-pill border-[1.5px] border-ame-400/35 bg-ame-400/[0.12] font-sans text-[11px] font-bold text-ame-400">WB</div>
          <div className="font-sans text-[13px] italic leading-normal text-ink-600">
            "The market is a device for transferring money from the impatient to the patient. How are you feeling about your TSLA position?"
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <div className="flex h-12 cursor-pointer items-center gap-3 rounded-input border border-ink-200 bg-white px-[18px]">
            <div className="h-5 w-5 flex-shrink-0 rounded-input bg-ink-100"/>
            <div className="font-sans text-sm font-medium text-ink-700">Sign in with Face ID</div>
          </div>
          <CTA label="Go to my portfolio  →" full onClick={() => navigate('/portfolio')}/>
          <div className="cursor-pointer text-center font-sans text-[13px] text-ink-400">Sign out</div>
        </div>
      </div>
    </div>
  );
}
