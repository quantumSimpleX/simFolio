import { cn } from '../../lib/utils'

export default function StatCard({ label, value, valueColor = 'text-ink-900', mobile = false }) {
  return (
    <div className="rounded-card border border-ink-100 bg-white px-4 py-3">
      <div className="mb-1 font-sans text-xs text-ink-400">{label}</div>
      <div className={cn('font-sans font-bold', mobile ? 'text-[17px]' : 'text-xl', valueColor)}>{value}</div>
    </div>
  )
}
