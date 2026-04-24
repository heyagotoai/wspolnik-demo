import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import AdminRoute from './AdminRoute'
import { AuthContext, type AuthState } from '../../hooks/useAuth'
import { ToastProvider } from '../ui/Toast'
import type { User, Session } from '@supabase/supabase-js'

const mockUseRole = vi.fn()
vi.mock('../../hooks/useRole', () => ({
  useRole: () => mockUseRole(),
}))

const mockUseDemoBasePath = vi.fn(() => '')
vi.mock('../../demo/useDemoBasePath', () => ({
  useDemoBasePath: () => mockUseDemoBasePath(),
}))

const apiGet = vi.fn()
vi.mock('../../lib/api', () => ({
  api: { get: (...a: unknown[]) => apiGet(...a) },
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

  const auth: AuthState = {
    user,
    session: user ? ({ access_token: 'test' } as unknown as Session) : null,
    loading: false,
    signIn: vi.fn(async () => ({ error: null })),
    signOut: vi.fn(async () => {}),
  }

  return render(
    <ToastProvider>
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
      </AuthContext.Provider>
    </ToastProvider>,
  )
}

const fakeUser = { id: 'u1', email: 'admin@gabi.pl' } as User

describe('AdminRoute', () => {
  beforeEach(() => {
    apiGet.mockResolvedValue({ needs_legal_acceptance: false })
  })

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

  it('renderuje panel admina dla administratora', async () => {
    renderWithAuth(fakeUser, { isAdmin: true, loading: false })
    expect(await screen.findByText('Panel admina')).toBeInTheDocument()
  })

  it('renderuje panel dla zarządcy', async () => {
    renderWithAuth(fakeUser, { isManager: true, loading: false })
    expect(await screen.findByText('Panel admina')).toBeInTheDocument()
  })
})
