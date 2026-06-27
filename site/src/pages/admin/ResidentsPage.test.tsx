import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ToastProvider } from '../../components/ui/Toast'
import { ConfirmProvider } from '../../components/ui/ConfirmDialog'

// Mock supabase (już zamockowany w setup.ts, tu nadpisujemy szczegóły)
const mockSelect = vi.fn()
const mockOrder = vi.fn()
const mockFrom = vi.fn()

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

// Mock api client
vi.mock('../../lib/api', () => ({
  api: {
    post: vi.fn().mockResolvedValue({}),
    patch: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
  },
}))

// Mock useRole — konfigurowalny per test
const mockUseRole = vi.fn()
vi.mock('../../hooks/useRole', () => ({
  useRole: () => mockUseRole(),
}))

// Mock icons (nie potrzebujemy SVG w testach)
vi.mock('../../components/ui/Icons', () => ({
  PlusIcon: ({ className }: { className?: string }) => <span data-testid="plus-icon" className={className}>+</span>,
  EditIcon: ({ className }: { className?: string }) => <span data-testid="edit-icon" className={className}>✎</span>,
  TrashIcon: ({ className }: { className?: string }) => <span data-testid="trash-icon" className={className}>🗑</span>,
  XIcon: ({ className }: { className?: string }) => <span data-testid="x-icon" className={className}>×</span>,
  HomeIcon: ({ className }: { className?: string }) => <span data-testid="home-icon" className={className}>🏠</span>,
}))

import ResidentsPage from './ResidentsPage'

const mockResidents = [
  {
    id: 'r1', email: 'jan@gabi.pl', full_name: 'Jan Kowalski',
    apartment_number: '1A', role: 'resident', is_active: true, has_account: true,
    created_at: '2025-01-01T00:00:00',
  },
  {
    id: 'r2', email: 'anna@gabi.pl', full_name: 'Anna Nowak',
    apartment_number: '2B', role: 'admin', is_active: true, has_account: true,
    created_at: '2025-01-02T00:00:00',
  },
]

function renderPage() {
  return render(
    <ToastProvider>
      <ConfirmProvider>
        <ResidentsPage />
      </ConfirmProvider>
    </ToastProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()

  // Default: admin
  mockUseRole.mockReturnValue({
    role: 'admin', isAdmin: true, isManager: false, isAdminOrManager: true, isResident: false, loading: false,
  })

  // Default: supabase.from('residents').select().order() → returns mockResidents
  mockOrder.mockResolvedValue({ data: mockResidents, error: null })
  mockSelect.mockReturnValue({ order: mockOrder })
  mockFrom.mockReturnValue({
    select: mockSelect,
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    }),
  })
})

describe('ResidentsPage', () => {
  it('wyświetla listę mieszkańców po załadowaniu', async () => {
    renderPage()

    // Najpierw loading
    expect(screen.getByText('Ładowanie...')).toBeInTheDocument()

    // Po załadowaniu — mieszkańcy
    await waitFor(() => {
      expect(screen.getByText('Jan Kowalski')).toBeInTheDocument()
    })
    expect(screen.getByText('Anna Nowak')).toBeInTheDocument()
    expect(screen.getByText('jan@gabi.pl')).toBeInTheDocument()
    expect(screen.getByText('1A')).toBeInTheDocument()
  })

  it('wyświetla komunikat gdy brak mieszkańców', async () => {
    mockOrder.mockResolvedValue({ data: [], error: null })
    renderPage()

    await waitFor(() => {
      expect(screen.getByText(/Brak mieszkańców/)).toBeInTheDocument()
    })
  })

  it('otwiera formularz po kliknięciu Dodaj', async () => {
    const user = userEvent.setup()
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Jan Kowalski')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Dodaj'))
    expect(screen.getByText('Nowy mieszkaniec')).toBeInTheDocument()
    expect(screen.getByText('Imię i nazwisko *')).toBeInTheDocument()
    // Email jest opcjonalny — można dodać mieszkańca „bez konta" (np. do głosów z zebrania)
    expect(screen.getByText('Email (opcjonalnie)')).toBeInTheDocument()
    expect(screen.getByText(/Hasło \(wymagane gdy podany email\)/)).toBeInTheDocument()
    // Hint: pozostaw puste = bez konta
    expect(screen.getByText(/bez zakładania konta logowania/)).toBeInTheDocument()
  })

  it('waliduje wymagane pola przy zapisie', async () => {
    const user = userEvent.setup()
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Jan Kowalski')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Dodaj'))
    await user.click(screen.getByText('Zapisz'))

    await waitFor(() => {
      expect(screen.getByText('Imię i nazwisko jest wymagane.')).toBeInTheDocument()
    })
  })

  it('pozwala dodać mieszkańca „bez konta" (bez email/hasła)', async () => {
    const user = userEvent.setup()
    const { api } = await import('../../lib/api')
    const postSpy = vi.mocked(api.post)

    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Jan Kowalski')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Dodaj'))
    // Inputy nie są powiązane z labelami przez htmlFor/id — wybieramy po roli + kolejności w formularzu
    const textboxes = screen.getAllByRole('textbox')
    // [0] full_name, [1] email, [2] apartment_number
    await user.type(textboxes[0], 'Adam Bez-Konta')
    // Celowo nie wypełniamy email ani hasła
    await user.click(screen.getByText('Zapisz'))

    await waitFor(() => {
      expect(postSpy).toHaveBeenCalled()
    })
    const [path, payload] = postSpy.mock.calls[0]
    expect(path).toBe('/residents')
    expect((payload as Record<string, unknown>).full_name).toBe('Adam Bez-Konta')
    expect((payload as Record<string, unknown>).email).toBeUndefined()
    expect((payload as Record<string, unknown>).password).toBeUndefined()
  })

  it('pokazuje badge „bez konta" dla mieszkańca bez email', async () => {
    mockOrder.mockResolvedValue({
      data: [
        { id: 'r3', email: null, full_name: 'Piotr Bez-Konta', apartment_number: '3C', role: 'resident', is_active: true, has_account: false, created_at: '2026-04-01T00:00:00' },
      ],
      error: null,
    })
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Piotr Bez-Konta')).toBeInTheDocument()
    })
    expect(screen.getByText('bez konta')).toBeInTheDocument()
  })

  it('zamyka formularz po kliknięciu Anuluj', async () => {
    const user = userEvent.setup()
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Jan Kowalski')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Dodaj'))
    expect(screen.getByText('Nowy mieszkaniec')).toBeInTheDocument()

    await user.click(screen.getByText('Anuluj'))
    expect(screen.queryByText('Nowy mieszkaniec')).not.toBeInTheDocument()
  })

  it('wyświetla poprawne badge ról', async () => {
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Jan Kowalski')).toBeInTheDocument()
    })

    expect(screen.getByText('Mieszkaniec')).toBeInTheDocument()
    expect(screen.getByText('Admin')).toBeInTheDocument()
  })

  it('admin zmienia email mieszkańca z kontem (PATCH /residents/:id/email)', async () => {
    const user = userEvent.setup()
    const { api } = await import('../../lib/api')
    const patchSpy = vi.mocked(api.patch)

    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Jan Kowalski')).toBeInTheDocument()
    })

    // Otwórz edycję pierwszego mieszkańca (Jan Kowalski)
    const editIcons = screen.getAllByTestId('edit-icon')
    await user.click(editIcons[0])

    expect(screen.getByText('Edytuj mieszkańca')).toBeInTheDocument()
    // Przycisk „Zmień email" jest zablokowany dopóki email nie zostanie zmieniony
    const changeEmailBtn = screen.getByText('Zmień email')
    expect(changeEmailBtn).toBeDisabled()

    // Zmień email — input email to drugi textbox (po full_name)
    const textboxes = screen.getAllByRole('textbox')
    await user.clear(textboxes[1])
    await user.type(textboxes[1], 'jan.nowy@gabi.pl')

    expect(changeEmailBtn).not.toBeDisabled()
    await user.click(changeEmailBtn)

    // Potwierdź dialog
    await user.click(await screen.findByRole('button', { name: 'Zmień adres' }))

    await waitFor(() => {
      expect(patchSpy).toHaveBeenCalledWith('/residents/r1/email', { email: 'jan.nowy@gabi.pl' })
    })
  })

  it('admin generuje nowe hasło — modal pokazuje hasło i pozwala skopiować', async () => {
    const user = userEvent.setup()
    const { api } = await import('../../lib/api')
    const postSpy = vi.mocked(api.post)
    postSpy.mockResolvedValueOnce({ password: 'TestHaslo123' })

    const writeTextMock = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      writable: true,
      configurable: true,
    })

    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Jan Kowalski')).toBeInTheDocument()
    })

    const editIcons = screen.getAllByTestId('edit-icon')
    await user.click(editIcons[0])

    await user.click(screen.getByText('Wygeneruj nowe hasło'))

    // Potwierdź dialog
    await user.click(await screen.findByRole('button', { name: 'Wygeneruj' }))

    await waitFor(() => {
      expect(postSpy).toHaveBeenCalledWith('/residents/r1/reset-password', {})
    })

    // Modal z hasłem
    await waitFor(() => {
      expect(screen.getByText('Nowe hasło')).toBeInTheDocument()
    })
    expect(screen.getByDisplayValue('TestHaslo123')).toBeInTheDocument()

    await user.click(screen.getByText('Kopiuj'))
    await waitFor(() => {
      expect(writeTextMock).toHaveBeenCalledWith('TestHaslo123')
    })
  })

  it('mieszkaniec bez konta nie widzi przycisku „Wygeneruj nowe hasło"', async () => {
    mockOrder.mockResolvedValue({
      data: [
        { id: 'r3', email: null, full_name: 'Piotr Bez-Konta', apartment_number: '3C', role: 'resident', is_active: true, has_account: false, created_at: '2026-04-01T00:00:00' },
      ],
      error: null,
    })
    const user = userEvent.setup()
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Piotr Bez-Konta')).toBeInTheDocument()
    })

    const editIcons = screen.getAllByTestId('edit-icon')
    await user.click(editIcons[0])

    expect(screen.getByText('Edytuj mieszkańca')).toBeInTheDocument()
    expect(screen.queryByText('Wygeneruj nowe hasło')).not.toBeInTheDocument()
    expect(screen.queryByText('Zmień email')).not.toBeInTheDocument()
    // Pole hasła „nadaj konto" jest widoczne
    expect(screen.getByText(/Hasło \(nadaj konto\)/)).toBeInTheDocument()
  })

  it('zarządca widzi listę ale nie widzi akcji', async () => {
    mockUseRole.mockReturnValue({
      role: 'manager', isAdmin: false, isManager: true, isAdminOrManager: true, isResident: false, loading: false,
    })

    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Jan Kowalski')).toBeInTheDocument()
    })

    // Widzi dane
    expect(screen.getByText('jan@gabi.pl')).toBeInTheDocument()
    expect(screen.getByText('1A')).toBeInTheDocument()

    // Nie widzi przycisków akcji
    expect(screen.queryByText('Dodaj')).not.toBeInTheDocument()
    expect(screen.queryByText('Dezaktywuj')).not.toBeInTheDocument()
    expect(screen.queryByText('Akcje')).not.toBeInTheDocument()
  })
})
