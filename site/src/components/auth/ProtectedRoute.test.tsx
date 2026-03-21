import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import ProtectedRoute from './ProtectedRoute'
import { AuthContext } from '../../hooks/useAuth'
import type { User, Session } from '@supabase/supabase-js'

// Helper do renderowania z kontekstem Auth
function renderWithAuth(
  user: User | null,
  loading: boolean = false,
  initialPath: string = '/panel',
) {
  const auth = {
    user,
    session: user ? ({ access_token: 'test' } as unknown as Session) : null,
    loading,
    signIn: vi.fn(),
    signOut: vi.fn(),
  }

  return render(
    <AuthContext.Provider value={auth}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route element={<ProtectedRoute />}>
            <Route path="/panel" element={<div>Panel mieszkańca</div>} />
          </Route>
          <Route path="/logowanie" element={<div>Strona logowania</div>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

const fakeUser = { id: 'u1', email: 'jan@gabi.pl' } as User

describe('ProtectedRoute', () => {
  it('pokazuje loader podczas ładowania sesji', () => {
    renderWithAuth(null, true)
    expect(screen.getByText('Ładowanie...')).toBeInTheDocument()
  })

  it('przekierowuje na /logowanie gdy brak użytkownika', () => {
    renderWithAuth(null, false)
    expect(screen.getByText('Strona logowania')).toBeInTheDocument()
  })

  it('renderuje zawartość panelu dla zalogowanego użytkownika', () => {
    renderWithAuth(fakeUser, false)
    expect(screen.getByText('Panel mieszkańca')).toBeInTheDocument()
  })
})
