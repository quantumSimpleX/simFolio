import * as React from 'react'
import { Slot } from '@radix-ui/react-slot'
import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap font-sans font-semibold tracking-[0.01em] select-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-45',
  {
    variants: {
      variant: {
        primary: 'bg-ink-900 text-white hover:opacity-90',
        danger: 'bg-red text-white hover:opacity-90',
        ghost: 'bg-transparent text-ink-700 border border-ink-200 hover:bg-ink-50',
        link: 'bg-transparent text-ink-600 underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 text-sm rounded-input',
        sm: 'h-8 px-3 text-sm rounded-input',
        cta: 'h-12 px-5 text-[15px] rounded-input',
        icon: 'h-10 w-10 rounded-input',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  },
)

const Button = React.forwardRef(
  ({ className, variant, size, asChild = false, loading = false, disabled, children, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button'
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <span className="inline-flex items-center gap-2">
            <span className="h-3.5 w-3.5 animate-spin rounded-pill border-2 border-current border-t-transparent" />
            Please wait…
          </span>
        ) : (
          children
        )}
      </Comp>
    )
  },
)
Button.displayName = 'Button'

export { Button, buttonVariants }
