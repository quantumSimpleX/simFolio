import * as React from 'react'
import * as TogglePrimitive from '@radix-ui/react-toggle'
import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const toggleVariants = cva(
  'inline-flex items-center justify-center rounded-input font-sans text-sm font-medium text-ink-400 transition-colors hover:bg-ink-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ame-400 disabled:pointer-events-none disabled:opacity-50 data-[state=on]:bg-ink-900 data-[state=on]:text-white',
  {
    variants: {
      size: {
        default: 'h-9 px-3',
        sm: 'h-8 px-2.5',
        lg: 'h-10 px-4',
      },
    },
    defaultVariants: { size: 'default' },
  },
)

const Toggle = React.forwardRef(({ className, size, ...props }, ref) => (
  <TogglePrimitive.Root ref={ref} className={cn(toggleVariants({ size }), className)} {...props} />
))
Toggle.displayName = TogglePrimitive.Root.displayName

export { Toggle, toggleVariants }
