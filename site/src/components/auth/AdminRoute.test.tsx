import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import AdminRoute from './AdminRoute'
import { AuthContext } from '../../hooks/useAuth'
import type { User, Session } from '@supabase/supabase-js'

const mockUseRole = vi.fn()
vi.mock('../../hooks/useRole', () => ({
  useRole: () => mockUseRole(),
}))

const mockUseDemoBasePath = vi.fn(() => '')
vi.mock('../../demo/useDemoBasePath', () => ({
  useDemoBasePath: () => mockUseDemoBasePath(),
}))

function renderWithAuth(
  user: User | null,
  role: { isAdmin?: boolean; isManager?: boolean; loading: boolean },
  initialPath: string = '/admin',
) {
  const isAdmin = role.isAdmin ?? false
  const isManager = role.isManager ?? false
  mockUseRole.mockReturnValue({
    role: isAdmin ? 'admin' : isManager ? 'manager' : 'resident',
    isAdmin,
    isManager,
    isAdminOrManager: isAdmin || isManager,
    isResident: !isAdmin && !isManager,
    loading: role.loading,
  })

  const auth = {
    user,
    session: user ? ({ access_token: 'test' } as unknown as Session) : null,
    loading: false,
    signIn: vi.fn(),
    signOut: vi.fn(),
  }

  return render(
    <AuthContext.Provider value={auth}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route element={<AdminRoute />}>
            <Route path="/admin" element={<div>Panel admina</div>} />
          </Route>
          <Route path="/logowanie" element={<div>Strona logowania</div>} />
          <Route path="/panel" element={<div>Panel mieszkańca</div>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

const fakeUser = { id: 'u1', email: 'admin@gabi.pl' } as User

describe('AdminRoute', () => {
  it('pokazuje loader podczas sprawdzania roli', () => {
    renderWithAuth(fakeUser, { isAdmin: false, loading: true })
    expect(screen.getByText('Ładowanie...')).toBeInTheDocument()
  })

  it('przekierowuje na /logowanie gdy brak użytkownika', () => {
    renderWithAuth(null, { isAdmin: false, loading: false })
    expect(screen.getByText('Strona logowania')).toBeInTheDocument()
  })

  it('przekierowuje na /panel gdy użytkownik nie jest adminem ani zarządcą', () => {
    renderWithAuth(fakeUser, { isAdmin: false, loading: false })
    expect(screen.getByText('Panel mieszkańca')).toBeInTheDocument()
  })

  it('renderuje panel admina dla administratora', () => {
    renderWithAuth(fakeUser, { isAdmin: true, loading: false })
    expect(screen.getByText('Panel admina')).toBeInTheDocument()
  })

  it('renderuje panel dla zarządcy', () => {
    renderWithAuth(fakeUser, { isManager: true, loading: false })
    expect(screen.getByText('Panel admina')).toBeInTheDocument()
  })
})
