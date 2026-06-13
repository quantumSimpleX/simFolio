import { useRef, useEffect } from 'react'
import { cn } from '../lib/utils'
import { HeroMessage, UserMessage } from './HeroMessage'

const QUICK_PROMPTS = ['Review my picks', 'Too concentrated?', 'Am I diversified?']

// Quick-prompt chip row shared by the desktop sidebar and the mobile Ask tab.
export function QuickPrompts({ onPick, className }) {
  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {QUICK_PROMPTS.map(p => (
        <div key={p} onClick={() => onPick(p)} className="cursor-pointer rounded-pill border border-ink-100 bg-ink-50 px-2.5 py-1 font-sans text-sm text-ink-700">{p}</div>
      ))}
    </div>
  )
}

// Composer: text input + send button.
export function ChatComposer({ value, onChange, onSend, isPending }) {
  return (
    <div className="flex gap-2">
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && onSend()}
        placeholder="Ask your council…"
        className="h-11 flex-1 rounded-input border border-ink-200 bg-white px-3 font-sans text-base text-ink-900 outline-none"
      />
      <div onClick={onSend} className={cn('flex h-11 w-11 cursor-pointer items-center justify-center rounded-input bg-ink-900 text-lg text-white', isPending && 'opacity-50')}>→</div>
    </div>
  )
}

// Scrolling message list. Renders user/hero bubbles, a loading + empty state,
// and a "Thinking…" indicator while a reply is pending.
export function ChatMessages({ history, heroId, isPending, historyLoading = false, emptyText, className }) {
  const bottomRef = useRef(null)
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [history])

  return (
    <div className={cn('flex flex-col gap-2.5 overflow-auto', className)}>
      {historyLoading && (
        <div className="pt-4 text-center font-sans text-[17px] text-ink-400">Loading conversation…</div>
      )}
      {!historyLoading && emptyText && history?.length === 0 && (
        <div className="pt-4 text-center font-sans text-[17px] italic text-ink-400">{emptyText}</div>
      )}
      {(history ?? []).map((msg, i) => (
        msg.role === 'user'
          ? <UserMessage key={i} text={msg.content}/>
          : <HeroMessage key={i} hero={heroId} text={`"${msg.content}"`}/>
      ))}
      {isPending && <div className="font-sans text-[17px] italic text-ink-400">Thinking…</div>}
      <div ref={bottomRef}/>
    </div>
  )
}
