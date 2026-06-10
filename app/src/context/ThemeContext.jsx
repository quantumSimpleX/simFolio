import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

const ThemeContext = createContext({ theme: 'light', setTheme: () => {} })

export function ThemeProvider({ children }) {
  const { user } = useAuth()
  const [theme, setThemeState] = useState('light')

  useEffect(() => {
    if (user) {
      supabase
        .from('users')
        .select('theme_preference')
        .eq('user_id', user.id)
        .single()
        .then(({ data }) => {
          if (data?.theme_preference) applyTheme(data.theme_preference)
        })
    }
  }, [user])

  function applyTheme(t) {
    setThemeState(t)
    document.documentElement.dataset.theme = t
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
