import { cn } from '../../lib/utils'

export default function DetailRow({ label, value, bold = false }) {
  return (
    <div className="flex items-center justify-between border-b border-ink-50 py-[7px]">
      <div className="font-sans text-[13px] text-ink-400">{label}</div>
      <div className={cn('font-sans text-[13px] text-ink-900', bold ? 'font-bold' : 'font-medium')}>{value}</div>
    </div>
  )
}
