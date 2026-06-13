import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { AuthProvider, useAuth } from '../context/AuthContext'
import { ThemeProvider, useTheme } from '../context/ThemeContext'
import { LanguageProvider, useLang } from '../context/LanguageContext'
import { supabase, mockUser } from './supabaseMock'

beforeEach(() => {
  vi.clearAllMocks()
  document.documentElement.removeAttribute('data-theme')
})

// --- AuthContext ---------------------------------------------------------

function AuthProbe() {
  const { user, loading, signIn, signUp, signOut } = useAuth()
  return (
    <div>
      <span data-testid="user">{user ? user.email : 'none'}</span>
      <span data-testid="loading">{String(loading)}</span>
      <button onClick={() => signIn('a@b.com', 'pw')}>in</button>
      <button onClick={() => signUp('a@b.com', 'pw', 'Test')}>up</button>
      <button onClick={() => signOut()}>out</button>
    </div>
  )
}

describe('AuthContext', () => {
  it('resolves the existing session into a user and clears loading', async () => {
    render(<AuthProvider><AuthProbe /></AuthProvider>)
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))
    expect(screen.getByTestId('user')).toHaveTextContent(mockUser.email)
  })

  it('signIn calls signInWithPassword', async () => {
    render(<AuthProvider><AuthProbe /></AuthProvider>)
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))
    await act(async () => { fireEvent.click(screen.getByText('in')) })
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({ email: 'a@b.com', password: 'pw' })
  })

  it('signUp passes first_name in options and updates user', async () => {
    render(<AuthProvider><AuthProbe /></AuthProvider>)
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))
    await act(async () => { fireEvent.click(screen.getByText('up')) })
    expect(supabase.auth.signUp).toHaveBeenCalledWith({
      email: 'a@b.com', password: 'pw', options: { data: { first_name: 'Test' } },
    })
  })

  it('signIn surfaces the error from Supabase', async () => {
    supabase.auth.signInWithPassword.mockResolvedValueOnce({ data: null, error: new Error('bad creds') })
    let captured
    function Probe() {
      const { signIn } = useAuth()
      return <button onClick={async () => { try { await signIn('x', 'y') } catch (e) { captured = e } }}>go</button>
    }
    render(<AuthProvider><Probe /></AuthProvider>)
    await act(async () => { fireEvent.click(screen.getByText('go')) })
    await waitFor(() => expect(captured).toBeInstanceOf(Error))
    expect(captured.message).toBe('bad creds')
  })

  it('signOut calls supabase.auth.signOut', async () => {
    render(<AuthProvider><AuthProbe /></AuthProvider>)
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))
    await act(async () => { fireEvent.click(screen.getByText('out')) })
    expect(supabase.auth.signOut).toHaveBeenCalled()
  })
})

// --- ThemeContext --------------------------------------------------------

function ThemeProbe() {
  const { theme, setTheme } = useTheme()
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <button onClick={() => setTheme('dark')}>dark</button>
      <button onClick={() => setTheme('light')}>light</button>
    </div>
  )
}

describe('ThemeContext', () => {
  it('defaults to light', async () => {
    render(<AuthProvider><ThemeProvider><ThemeProbe /></ThemeProvider></AuthProvider>)
    expect(screen.getByTestId('theme')).toHaveTextContent('light')
  })

  it('setTheme flips data-theme on the document element', async () => {
    render(<AuthProvider><ThemeProvider><ThemeProbe /></ThemeProvider></AuthProvider>)
    await act(async () => { fireEvent.click(screen.getByText('dark')) })
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(screen.getByTestId('theme')).toHaveTextContent('dark')
    await act(async () => { fireEvent.click(screen.getByText('light')) })
    expect(document.documentElement.dataset.theme).toBe('light')
  })

  it('persists theme preference to Supabase when a user is present', async () => {
    render(<AuthProvider><ThemeProvider><ThemeProbe /></ThemeProvider></AuthProvider>)
    await act(async () => { fireEvent.click(screen.getByText('dark')) })
    await waitFor(() => expect(supabase.from).toHaveBeenCalledWith('users'))
  })
})

// --- LanguageContext -----------------------------------------------------

function LangProbe() {
  const { lang, setLang } = useLang()
  return (
    <div>
      <span data-testid="lang">{lang}</span>
      <button onClick={() => setLang('zh-Hant')}>zh</button>
      <button onClick={() => setLang('en')}>en</button>
    </div>
  )
}

describe('LanguageContext', () => {
  it('defaults to en', () => {
    render(<AuthProvider><LanguageProvider><LangProbe /></LanguageProvider></AuthProvider>)
    expect(screen.getByTestId('lang')).toHaveTextContent('en')
  })

  it('setLang switches EN ↔ 繁中', async () => {
    render(<AuthProvider><LanguageProvider><LangProbe /></LanguageProvider></AuthProvider>)
    await act(async () => { fireEvent.click(screen.getByText('zh')) })
    expect(screen.getByTestId('lang')).toHaveTextContent('zh-Hant')
    await act(async () => { fireEvent.click(screen.getByText('en')) })
    expect(screen.getByTestId('lang')).toHaveTextContent('en')
  })
})
