// Centered empty-state copy used across Orders tabs (and other lists).
export default function EmptyState({ label, sub }) {
  return (
    <div className="flex flex-1 items-center justify-center pt-[60px]">
      <div className="text-center">
        <div className="font-sans text-[15px] text-ink-400">{label}</div>
        {sub && <div className="mt-1.5 font-sans text-[13px] text-ink-300">{sub}</div>}
      </div>
    </div>
  )
}
