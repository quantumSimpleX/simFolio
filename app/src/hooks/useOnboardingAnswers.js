import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const LS_KEY = 'simfolio_onboarding_answers'

function localAnswers() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || {} } catch { return {} }
}

// The onboarding answers used to rank heroes. Prefers the DB copy (users.onboarding_answers),
// falling back to the localStorage copy the onboarding flow always writes — so the find-a-mentor
// grid still ranks correctly even before the onboarding_answers column exists.
export function useOnboardingAnswers() {
  const { user } = useAuth()

  const { data, isLoading } = useQuery({
    queryKey: ['onboarding-answers', user?.id],
    queryFn: async () => {
      try {
        const { data } = await supabase
          .from('users')
          .select('onboarding_answers')
          .eq('user_id', user.id)
          .single()
        if (data?.onboarding_answers) return data.onboarding_answers
      } catch { /* column may not exist yet; fall back to localStorage */ }
      return localAnswers()
    },
    enabled: !!user,
  })

  return { answers: data ?? localAnswers(), isLoading }
}
