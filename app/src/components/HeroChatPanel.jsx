import { useRef, useEffect } from 'react'
import { cn } from '../lib/utils'
import { HeroMessage, UserMessage } from './HeroMessage'
import { HERO_DATA } from '../data/heroes'

// Ultra-short, human-readable abbreviation for an OpenRouter model id, so the
// chat can show which model in the fallback chain answered without clutter.
// 'openai/gpt-oss-120b:free' -> 'GPT-OSS'; unknown ids fall back to the bare
// model name (provider prefix and ':free' suffix stripped).
export function modelLabel(model) {
  if (!model) return ''
  const id = String(model).toLowerCase()
  if (id.includes('gemma')) return 'Gemma'
  if (id.includes('gemini')) return 'Gemini'
  if (id.includes('nemotron')) return 'Nemotron'   // before llama: nvidia ids can contain both
  if (id.includes('gpt')) return 'GPT-OSS'
  if (id.includes('llama')) return 'Llama'
  if (id.includes('claude')) return 'Claude'
  return String(model).split('/').pop().replace(/:free$/, '')
}

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
// a "Calling {hero}…" indicator while a reply is pending, and a small label of
// which model answered the latest reply (the chat falls back across a chain of LLMs).
export function ChatMessages({ history, heroId, isPending, lastModel, historyLoading = false, emptyText, className }) {
  const containerRef = useRef(null)
  // Keep the latest message in view by scrolling the chat container itself —
  // never scrollIntoView (which also scrolls the whole page, landing it mid-screen on load).
  useEffect(() => {
    const el = containerRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [history, isPending])

  const heroName = HERO_DATA[heroId]?.name ?? 'your council'

  return (
    <div ref={containerRef} className={cn('flex flex-col overflow-auto', className)}>
      {/* mt-auto anchors messages to the bottom (like a messaging app): few messages
          sit just above the composer and new ones push up; the top stays scrollable. */}
      <div className="mt-auto flex flex-col gap-2.5">
        {historyLoading && (
          <div className="pt-4 text-center font-sans text-[17px] text-ink-400">Loading conversation…</div>
        )}
        {!historyLoading && emptyText && history?.length === 0 && (
          <div className="pt-4 text-center font-sans text-[17px] italic text-ink-400">{emptyText}</div>
        )}
        {(history ?? []).map((msg, i) => {
          if (msg.role === 'user') return <UserMessage key={i} text={msg.content}/>
          // Prefer the model persisted with the message; fall back to the live model
          // of the latest reply (covers the moment before it's persisted/refetched).
          const model = msg.model ?? (i === (history.length - 1) ? lastModel : null)
          return <HeroMessage key={i} hero={heroId} text={`"${msg.content}"`} modelTag={modelLabel(model)}/>
        })}
        {isPending && <div className="font-sans text-[17px] italic text-ink-400">Calling {heroName}…</div>}
      </div>
    </div>
  )
}
