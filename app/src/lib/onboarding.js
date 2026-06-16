import { supabase } from './supabase'

const REQUIRED_KEYS = ['goal', 'capital', 'horizon', 'frequency', 'experience', 'heroMention', 'stocks']

export async function isOnboardingComplete(userId) {
  const { data } = await supabase
    .from('users')
    .select('onboarding_done, onboarding_answers')
    .eq('user_id', userId)
    .maybeSingle()
  if (!data?.onboarding_done) return false
  if (!data.onboarding_answers) return false
  return REQUIRED_KEYS.every(k => k in data.onboarding_answers)
}
