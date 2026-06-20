import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

// Pluralise "share" so qty=1 reads "1 share", not "1 shares".
export function shares(qty) {
  return `${qty} ${Number(qty) === 1 ? 'share' : 'shares'}`
}
