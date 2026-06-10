import { useState, useEffect } from 'react'

// Single source of truth for responsive breakpoints across the app.
export function useBreakpoint() {
  const get = () => (window.innerWidth < 768 ? 'mobile' : window.innerWidth < 1024 ? 'tablet' : 'desktop')
  const [bp, setBp] = useState(get)
  useEffect(() => {
    const handler = () => setBp(get())
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return bp
}

export function useIsMobile() {
  return useBreakpoint() === 'mobile'
}
