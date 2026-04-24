import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import ProtectedRoute from './ProtectedRoute'
import { AuthContext, type AuthState } from '../../hooks/useAuth'
import { ToastProvider } from '../ui/Toast'
import type { User, Session } from '@supabase/supabase-js'

const apiGet = vi.fn()
vi.mock('../../lib/api', () => ({
  api: { get: (...a: unknown[]) => apiGet(...a) },
}))

// Helper do renderowania z kontekstem Auth
function renderWithAuth(
  user: User | null,
  loading: boolean = false,
  initialPath: string = '/panel',
) {
  const auth: AuthState = {
    user,
    session: user ? ({ access_token: 'test' } as unknown as Session) : null,
    loading,
    signIn: vi.fn(async () => ({ error: null })),
    signOut: vi.fn(async () => {}),
  }

  return render(
    <ToastProvider>
      <AuthContext.Provider value={auth}>
        <MemoryRouter initialEntries={[initialPath]}>
          <Routes>
            <Route element={<ProtectedRoute />}>
              <Route path="/panel" element={<div>Panel mieszkańca</div>} />
            </Route>
            <Route path="/logowanie" element={<div>Strona logowania</div>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    </ToastProvider>,
  )
}

const fakeUser = { id: 'u1', email: 'jan@gabi.pl' } as User

describe('ProtectedRoute', () => {
  beforeEach(() => {
    apiGet.mockResolvedValue({ needs_legal_acceptance: false })
  })

  it('pokazuje loader podczas ładowania sesji', () => {
    renderWithAuth(null, true)
    expect(screen.getByText('Ładowanie...')).toBeInTheDocument()
  })

  it('przekierowuje na /logowanie gdy brak użytkownika', () => {
    renderWithAuth(null, false)
    expect(screen.getByText('Strona logowania')).toBeInTheDocument()
  })

  it('renderuje zawartość panelu dla zalogowanego użytkownika', async () => {
    renderWithAuth(fakeUser, false)
    expect(await screen.findByText('Panel mieszkańca')).toBeInTheDocument()
  })

  it('blokuje panel do czasu akceptacji dokumentów', async () => {
    apiGet.mockResolvedValue({
      needs_legal_acceptance: true,
      current_privacy_version: '2026-04-03',
      current_terms_version: '2026-04-03',
    })
    renderWithAuth(fakeUser, false)
    expect(await screen.findByRole('heading', { name: /Dokumenty prawne/i })).toBeInTheDocument()
    expect(screen.queryByText('Panel mieszkańca')).not.toBeInTheDocument()
  })
})
