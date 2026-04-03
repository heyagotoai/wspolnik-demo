import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '../../components/ui/Toast'
import { ConfirmProvider } from '../../components/ui/ConfirmDialog'

const mockGet = vi.fn()
const mockPatch = vi.fn()
const mockPost = vi.fn()

vi.mock('../../lib/api', () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
    post: (...args: unknown[]) => mockPost(...args),
  },
}))

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
  },
}))

vi.mock('../../components/ui/Icons', () => ({
  UserIcon: () => <span data-testid="user-icon" />,
}))

import ProfilePage from './ProfilePage'

const mockProfile = {
  id: 'res-1',
  email: 'jan@gabi.pl',
  full_name: 'Jan Kowalski',
  apartment_number: '12A',
  role: 'resident',
  is_active: true,
  created_at: '2026-01-15T10:00:00Z',
  needs_legal_acceptance: false,
  current_privacy_version: '2026-04-03',
  current_terms_version: '2026-04-03',
  privacy_accepted_at: '2026-01-20T10:00:00Z',
  terms_accepted_at: '2026-01-20T10:00:00Z',
  privacy_version: '2026-04-03',
  terms_version: '2026-04-03',
}

function renderPage() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <ConfirmProvider>
          <ProfilePage />
        </ConfirmProvider>
      </ToastProvider>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mockGet.mockResolvedValue(mockProfile)
})

describe('ProfilePage', () => {
  it('wyświetla dane profilu', async () => {
    renderPage()

    await waitFor(() => {
      expect(screen.getAllByText('Jan Kowalski')).toHaveLength(2) // avatar header + name field
    })
    expect(screen.getAllByText('jan@gabi.pl')).toHaveLength(2) // avatar + email field
    expect(screen.getByText('12A')).toBeInTheDocument()
    expect(screen.getByText('Mieszkaniec')).toBeInTheDocument()
  })

  it('wyświetla badge admina', async () => {
    mockGet.mockResolvedValue({ ...mockProfile, role: 'admin' })
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Administrator')).toBeInTheDocument()
    })
  })

  it('umożliwia edycję imienia', async () => {
    const updated = { ...mockProfile, full_name: 'Jan Nowak' }
    mockPatch.mockResolvedValue(updated)

    renderPage()
    const user = userEvent.setup()

    await waitFor(() => {
      expect(screen.getByText('Edytuj')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Edytuj'))

    const input = screen.getByDisplayValue('Jan Kowalski')
    await user.clear(input)
    await user.type(input, 'Jan Nowak')
    await user.click(screen.getByText('Zapisz'))

    await waitFor(() => {
      expect(mockPatch).toHaveBeenCalledWith('/profile', { full_name: 'Jan Nowak' })
    })
  })

  it('anuluje edycję imienia', async () => {
    renderPage()
    const user = userEvent.setup()

    await waitFor(() => {
      expect(screen.getByText('Edytuj')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Edytuj'))
    await user.click(screen.getByText('Anuluj'))

    expect(screen.getByText('Edytuj')).toBeInTheDocument()
  })

  it('wyświetla formularz zmiany hasła', async () => {
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Zmiana hasła')).toBeInTheDocument()
    })
    expect(screen.getByText('Obecne hasło')).toBeInTheDocument()
    expect(screen.getByText('Nowe hasło')).toBeInTheDocument()
    expect(screen.getByText('Powtórz nowe hasło')).toBeInTheDocument()
  })

  it('wysyła żądanie zmiany hasła', async () => {
    mockPost.mockResolvedValue({ detail: 'Hasło zostało zmienione' })

    renderPage()
    const user = userEvent.setup()

    await waitFor(() => {
      expect(screen.getByText('Zmiana hasła')).toBeInTheDocument()
    })

    const inputs = screen.getAllByDisplayValue('')
    // password inputs: current, new, confirm
    const passwordInputs = inputs.filter((el) => el.tagName === 'INPUT')
    await user.type(passwordInputs[0], 'stare123')
    await user.type(passwordInputs[1], 'nowe123')
    await user.type(passwordInputs[2], 'nowe123')

    await user.click(screen.getByText('Zmień hasło'))

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/profile/change-password', {
        current_password: 'stare123',
        new_password: 'nowe123',
      })
    })
  })

  it('wyświetla brak lokalu gdy nie przypisano', async () => {
    mockGet.mockResolvedValue({ ...mockProfile, apartment_number: null })
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Nie przypisano')).toBeInTheDocument()
    })
  })
})
