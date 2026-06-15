import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

const LanguageContext = createContext({ lang: 'en', setLang: () => {} })

const KEY = 'simfolio_language'

function storedLang() {
  try { return localStorage.getItem(KEY) || 'en' } catch { return 'en' }
}

export function LanguageProvider({ children }) {
  const { user } = useAuth()
  // Init from localStorage so a pre-login (sign-up) choice is honored immediately.
  const [lang, setLangState] = useState(storedLang)

  useEffect(() => {
    if (!user) return
    supabase
      .from('users')
      .select('language_preference')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        if (data?.language_preference) {
          // Profile wins: adopt it (and mirror locally).
          setLangState(data.language_preference)
          try { localStorage.setItem(KEY, data.language_preference) } catch { /* ignore */ }
        } else {
          // Fresh profile with no preference yet → push the local choice up, so the
          // sign-up selection survives the anonymous→new-user transition.
          supabase.from('users').update({ language_preference: lang }).eq('user_id', user.id)
        }
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  async function setLang(l) {
    setLangState(l)
    try { localStorage.setItem(KEY, l) } catch { /* ignore */ }
    if (user) {
      await supabase
        .from('users')
        .update({ language_preference: l })
        .eq('user_id', user.id)
    }
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang }}>
      {children}
    </LanguageContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useLang = () => useContext(LanguageContext)
