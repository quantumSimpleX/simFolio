import { render } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '../context/AuthContext'
import { ThemeProvider } from '../context/ThemeContext'
import { LanguageProvider } from '../context/LanguageContext'

// Mirrors the provider stack in main.jsx, with a MemoryRouter so screens
// using useParams/useNavigate work. Pass `path` for parameterised routes.
export function renderWithProviders(ui, { route = '/', path = '*', withRouter = true } = {}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  })
  const routed = withRouter ? (
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path={path} element={ui} />
      </Routes>
    </MemoryRouter>
  ) : ui // for components that bring their own router (App)
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <LanguageProvider>
            {routed}
          </LanguageProvider>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>,
  )
}
