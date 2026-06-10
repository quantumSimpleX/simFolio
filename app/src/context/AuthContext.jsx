import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Ensures a new (anonymous) user has the rows the app needs. Onboarding will
    // overwrite these if the user goes through it; this is the skip-onboarding floor.
    async function ensureUserRows(userId) {
      const { data } = await supabase
        .from('user_balances').select('user_id').eq('user_id', userId).maybeSingle()
      if (data) return
      const STARTING_CAPITAL = 5000
      await supabase.from('users').upsert({ user_id: userId, onboarding_done: false })
      await supabase.from('user_balances').upsert({
        user_id: userId, cash_balance: STARTING_CAPITAL, starting_capital: STARTING_CAPITAL,
      })
    }

    async function init() {
      let { data: { session } } = await supabase.auth.getSession()

      // Skip login: if there's no session, create an anonymous one so the app
      // works immediately and edge functions/RLS get a valid user JWT.
      if (!session) {
        const { data, error } = await supabase.auth.signInAnonymously()
        if (error) console.error('Anonymous sign-in failed:', error.message)
        session = data?.session ?? null
      }

      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) await ensureUserRows(session.user.id)
      setLoading(false)
    }
    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signUp(email, password, firstName) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { first_name: firstName } },
    })
    if (error) throw error
    if (data.session) {
      setSession(data.session)
      setUser(data.user)
    }
    return data
  }

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext)
