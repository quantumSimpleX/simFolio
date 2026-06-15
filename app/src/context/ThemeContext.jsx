import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

const ThemeContext = createContext({ theme: 'light', setTheme: () => {} })

const KEY = 'simfolio_theme'

function storedTheme() {
  try { return localStorage.getItem(KEY) || 'light' } catch { return 'light' }
}

export function ThemeProvider({ children }) {
  const { user } = useAuth()
  const [theme, setThemeState] = useState(storedTheme)

  // Apply the initial (localStorage) theme on mount so it isn't a flash of light.
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!user) return
    supabase
      .from('users')
      .select('theme_preference')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        if (data?.theme_preference) {
          applyTheme(data.theme_preference)
        } else {
          // Fresh profile → push the local choice up.
          supabase.from('users').update({ theme_preference: theme }).eq('user_id', user.id)
        }
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  function applyTheme(t) {
    setThemeState(t)
    document.documentElement.dataset.theme = t
    try { localStorage.setItem(KEY, t) } catch { /* ignore */ }
  }

  async function setTheme(t) {
    applyTheme(t)
    if (user) {
      await supabase
        .from('users')
        .update({ theme_preference: t })
        .eq('user_id', user.id)
    }
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = () => useContext(ThemeContext)
