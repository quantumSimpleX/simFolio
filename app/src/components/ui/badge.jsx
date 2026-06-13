import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-pill font-sans font-semibold',
  {
    variants: {
      variant: {
        pending:   'bg-goldBg text-gold',
        queued:    'bg-queuedBg text-queuedColor',
        filled:    'bg-aqua-50 text-aqua-600',
        cancelled: 'bg-ink-50 text-ink-500',
        partial:   'bg-goldBg text-gold',
        sim:       'bg-ame-50 text-ame-600 border border-ame-100',
      },
      size: {
        default: 'px-2.5 py-[3px] text-xs',
        sim:     'px-3 py-1 text-xs font-medium',
      },
    },
    defaultVariants: {
      variant: 'filled',
      size: 'default',
    },
  },
)

function Badge({ className, variant, size, ...props }) {
  return <span className={cn(badgeVariants({ variant, size }), className)} {...props} />
}

export { Badge, badgeVariants }
