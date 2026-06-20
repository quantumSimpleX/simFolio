import { useState, useRef, useEffect } from 'react';
import { cn } from '../lib/utils';

// Overflow menu whose trigger is the Sage diamond (◇) — a recognizable, conspicuous handle for
// mentor actions. `items` is [{ label, onSelect }]. Opens on click, closes on item select or any
// outside click. Menu is anchored to the trigger's right edge.
export function DotMenu({ items, className }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDown = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  return (
    <div ref={ref} className={cn('relative', className)}>
      <div
        onClick={() => setOpen(o => !o)}
        role="button"
        aria-label="More options"
        className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-[1.5px] border-aqua-400/40 bg-aqua-50 text-[22px] font-normal leading-none text-aqua-400 hover:bg-aqua-400/15"
      >◇</div>
      {open && (
        <div className="absolute right-0 top-full z-20 mt-1 min-w-[180px] overflow-hidden rounded-card border border-ink-200 bg-white py-1 shadow-lg dark:border-ink-300">
          {items.map(item => (
            <div
              key={item.label}
              onClick={() => { setOpen(false); item.onSelect(); }}
              className="cursor-pointer px-3.5 py-2 font-sans text-sm text-ink-900 hover:bg-ink-50"
            >{item.label}</div>
          ))}
        </div>
      )}
    </div>
  );
}
