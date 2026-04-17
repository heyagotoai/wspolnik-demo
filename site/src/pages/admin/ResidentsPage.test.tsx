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
    apartment_number: '1A', role: 'resident', is_active: true,
    created_at: '2025-01-01T00:00:00',
  },
  {
    id: 'r2', email: 'anna@gabi.pl', full_name: 'Anna Nowak',
    apartment_number: '2B', role: 'admin', is_active: true,
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
    expect(screen.getByText('Email *')).toBeInTheDocument()
    expect(screen.getByText('Hasło *')).toBeInTheDocument()
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
      expect(screen.getByText('Imię i email są wymagane.')).toBeInTheDocument()
    })
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
