import * as React from 'react'
import { cn } from '@/lib/utils'

const Input = React.forwardRef(({ className, type = 'text', ...props }, ref) => (
  <input
    type={type}
    ref={ref}
    className={cn(
      'flex h-12 w-full rounded-input border border-ink-200 bg-white px-3.5 font-sans text-[15px] text-ink-900 placeholder:text-ink-300 focus-visible:outline-none focus-visible:border-ame-400 focus-visible:ring-1 focus-visible:ring-ame-400 disabled:cursor-not-allowed disabled:opacity-50',
      className,
    )}
    {...props}
  />
))
Input.displayName = 'Input'

export { Input }
