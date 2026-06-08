import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

const LanguageContext = createContext(null)

export function LanguageProvider({ children }) {
  const { user } = useAuth()
  const [lang, setLangState] = useState('en')

  useEffect(() => {
    if (user) {
      supabase
        .from('users')
        .select('language_preference')
        .eq('user_id', user.id)
        .single()
        .then(({ data }) => {
          if (data?.language_preference) setLangState(data.language_preference)
        })
    }
  }, [user])

  async function setLang(l) {
    setLangState(l)
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

export const useLang = () => useContext(LanguageContext)
