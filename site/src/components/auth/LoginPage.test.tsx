import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import LoginPage from './LoginPage'
import { AuthContext } from '../../hooks/useAuth'
import { ToastProvider } from '../ui/Toast'
import { MemoryRouter } from 'react-router-dom'

const mockSignIn = vi.fn()
const mockSignOut = vi.fn()

function renderLoginPage(overrides = {}) {
  const auth = {
    user: null,
    session: null,
    loading: false,
    signIn: mockSignIn,
    signOut: mockSignOut,
    ...overrides,
  }
  return render(
    <AuthContext.Provider value={auth}>
      <ToastProvider>
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      </ToastProvider>
    </AuthContext.Provider>,
  )
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorage.clear()
  })

  afterEach(() => {
    sessionStorage.clear()
  })

  it('renderuje formularz logowania', () => {
    renderLoginPage()
    expect(screen.getByLabelText('Email')).toBeInTheDocument()
    expect(screen.getByLabelText('Hasło')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Zaloguj się' })).toBeInTheDocument()
  })

  it('pokazuje toast "Sesja wygasła" gdy flaga session_expired jest ustawiona', async () => {
    sessionStorage.setItem('session_expired', '1')
    renderLoginPage()

    await waitFor(() => {
      expect(screen.getByText('Sesja wygasła — zaloguj się ponownie')).toBeInTheDocument()
    })
    expect(sessionStorage.getItem('session_expired')).toBeNull()
  })

  it('nie pokazuje toasta gdy brak flagi session_expired', () => {
    renderLoginPage()
    expect(screen.queryByText('Sesja wygasła — zaloguj się ponownie')).not.toBeInTheDocument()
  })

  it('wywołuje signIn z email i hasłem', async () => {
    mockSignIn.mockResolvedValue({ error: null })
    renderLoginPage()

    await userEvent.type(screen.getByLabelText('Email'), 'test@example.com')
    await userEvent.type(screen.getByLabelText('Hasło'), 'password123')
    await userEvent.click(screen.getByRole('button', { name: 'Zaloguj się' }))

    expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123')
  })

  it('wyświetla błąd logowania', async () => {
    const error = Object.assign(new Error('Invalid login credentials'), { status: 400 })
    mockSignIn.mockResolvedValue({ error })
    renderLoginPage()

    await userEvent.type(screen.getByLabelText('Email'), 'bad@example.com')
    await userEvent.type(screen.getByLabelText('Hasło'), 'wrong')
    await userEvent.click(screen.getByRole('button', { name: 'Zaloguj się' }))

    await waitFor(() => {
      expect(screen.getByText(/Invalid login credentials/)).toBeInTheDocument()
    })
  })

  it('pokazuje loader gdy loading=true', () => {
    renderLoginPage({ loading: true })
    expect(screen.getByText('Ładowanie...')).toBeInTheDocument()
  })
})
