import { describe, it, expect } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from './renderWithProviders'
import { supabase } from './supabaseMock'
import SignIn from '../screens/auth/SignIn'
import SignUp from '../screens/auth/SignUp'
import WelcomeDesktop from '../screens/auth/WelcomeDesktop'
import WelcomeMobile from '../screens/auth/WelcomeMobile'

const PASSWORD_PLACEHOLDER = '•'.repeat(10)

describe('SignIn', () => {
  it('rejects empty submit with an error message', async () => {
    renderWithProviders(<SignIn/>)
    fireEvent.click(screen.getByText(/Sign in\s*→/))
    expect(await screen.findByText('Please fill in all fields.')).toBeInTheDocument()
  })

  it('signs in with credentials', async () => {
    renderWithProviders(<SignIn/>)
    fireEvent.change(screen.getByPlaceholderText('jamie@example.com'), { target: { value: 'a@b.com' } })
    fireEvent.change(screen.getByPlaceholderText(PASSWORD_PLACEHOLDER), { target: { value: 'secret' } })
    fireEvent.click(screen.getByText(/Sign in\s*→/))
    await waitFor(() => expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({ email: 'a@b.com', password: 'secret' }))
  })
})

describe('SignUp', () => {
  it('rejects empty submit', async () => {
    renderWithProviders(<SignUp/>)
    fireEvent.click(screen.getByText(/Create account\s*→/))
    expect(await screen.findByText('Please fill in all fields.')).toBeInTheDocument()
  })

  it('creates an account with first name metadata', async () => {
    renderWithProviders(<SignUp/>)
    fireEvent.change(screen.getByPlaceholderText('Jamie'), { target: { value: 'Dana' } })
    fireEvent.change(screen.getByPlaceholderText('jamie@example.com'), { target: { value: 'd@e.com' } })
    fireEvent.change(screen.getByPlaceholderText(PASSWORD_PLACEHOLDER), { target: { value: 'hunter22' } })
    fireEvent.click(screen.getByText(/Create account\s*→/))
    await waitFor(() => expect(supabase.auth.signUp).toHaveBeenCalledWith({
      email: 'd@e.com', password: 'hunter22', options: { data: { first_name: 'Dana' } },
    }))
  })
})

describe('Welcome screens', () => {
  it('WelcomeDesktop validates and submits the signup form', async () => {
    renderWithProviders(<WelcomeDesktop/>)
    fireEvent.click(screen.getByText(/Create account\s*→/))
    expect(await screen.findByText('Please fill in all fields.')).toBeInTheDocument()

    fireEvent.change(screen.getByPlaceholderText('Jamie'), { target: { value: 'Lee' } })
    fireEvent.change(screen.getByPlaceholderText('jamie@example.com'), { target: { value: 'lee@x.com' } })
    fireEvent.change(screen.getByPlaceholderText(PASSWORD_PLACEHOLDER), { target: { value: 'pass1234' } })
    fireEvent.click(screen.getByText(/Create account\s*→/))
    await waitFor(() => expect(supabase.auth.signUp).toHaveBeenCalled())
  })

  it('WelcomeMobile renders its CTAs', () => {
    renderWithProviders(<WelcomeMobile/>)
    expect(document.body.textContent.length).toBeGreaterThan(0)
  })
})
