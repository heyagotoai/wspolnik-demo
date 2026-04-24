import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ToastProvider } from '../../components/ui/Toast'
import { ConfirmProvider } from '../../components/ui/ConfirmDialog'

const mockPost = vi.fn()

vi.mock('../../lib/api', () => ({
  api: {
    post: (...args: unknown[]) => mockPost(...args),
  },
}))

const mockSupabaseData = { data: [] as unknown[], error: null }

function makeChainable(table: string) {
  const chainable = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    then: undefined as unknown,
  }
  Object.defineProperty(chainable, 'then', {
    get() {
      const data = table === 'resolutions' ? mockResolutionsRows : mockSupabaseData.data
      const error = mockSupabaseData.error
      return (resolve: (v: unknown) => void) => resolve({ data, error })
    },
  })
  return chainable
}

const mockResolutionsRows: { id: string; title: string }[] = []

vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn((table: string) => makeChainable(table)),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
  },
}))

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'admin-1', email: 'admin@gabi.pl' } }),
}))

vi.mock('../../hooks/useRole', () => ({
  useRole: () => ({
    role: 'admin', isAdmin: true, isManager: false, isAdminOrManager: true, isResident: false, loading: false,
  }),
}))

vi.mock('../../components/ui/Icons', () => ({
  PlusIcon: () => <span data-testid="plus-icon">+</span>,
  EditIcon: () => <span data-testid="edit-icon" />,
  TrashIcon: () => <span data-testid="trash-icon" />,
  XIcon: () => <span data-testid="x-icon" />,
  MailIcon: () => <span data-testid="mail-icon" />,
}))

import AdminAnnouncementsPage from './AnnouncementsPage'

const mockAnnouncements = [
  {
    id: 'ann-1',
    title: 'Wymiana rur',
    content: 'W dniach 10-12 marca wymiana rur w piwnicy.',
    excerpt: null,
    is_pinned: false,
    is_public: true,
    email_sent_at: null,
    created_at: '2026-03-01T10:00:00Z',
  },
  {
    id: 'ann-2',
    title: 'Zebranie wspólnoty',
    content: 'Zapraszamy na zebranie.',
    excerpt: null,
    is_pinned: true,
    is_public: true,
    email_sent_at: '2026-03-05T10:00:00Z',
    created_at: '2026-02-20T10:00:00Z',
  },
]

function renderPage() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <ConfirmProvider>
          <AdminAnnouncementsPage />
        </ConfirmProvider>
      </ToastProvider>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mockSupabaseData.data = mockAnnouncements
  mockSupabaseData.error = null
  mockResolutionsRows.length = 0
})

describe('AdminAnnouncementsPage — mailing', () => {
  it('wyświetla badge "Wysłano" dla ogłoszenia z email_sent_at', async () => {
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Zebranie wspólnoty')).toBeInTheDocument()
    })
    expect(screen.getByText('Wysłano')).toBeInTheDocument()
  })

  it('wyświetla przycisk email dla ogłoszenia bez email_sent_at', async () => {
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Wymiana rur')).toBeInTheDocument()
    })
    // Mail icon button exists for unsent announcement
    expect(screen.getByTitle('Wyślij emailem do mieszkańców')).toBeInTheDocument()
  })

  it('wysyła email po potwierdzeniu', async () => {
    mockPost.mockResolvedValue({ detail: 'Wysłano email do 5 mieszkańców' })
    renderPage()
    const user = userEvent.setup()

    await waitFor(() => {
      expect(screen.getByTitle('Wyślij emailem do mieszkańców')).toBeInTheDocument()
    })

    await user.click(screen.getByTitle('Wyślij emailem do mieszkańców'))

    // Confirm dialog should appear
    await waitFor(() => {
      expect(screen.getByText('Wyślij ogłoszenie emailem')).toBeInTheDocument()
    })
    await user.click(screen.getByText('Wyślij'))

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/announcements/ann-1/send-email', {})
    })
  })

  it('wyświetla listę ogłoszeń', async () => {
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Wymiana rur')).toBeInTheDocument()
    })
    expect(screen.getByText('Zebranie wspólnoty')).toBeInTheDocument()
  })

  it('wyświetla pustą listę', async () => {
    mockSupabaseData.data = []
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Brak ogłoszeń. Dodaj pierwsze ogłoszenie.')).toBeInTheDocument()
    })
  })

  it('tytuł auto-ogłoszenia o głosowaniu linkuje do uchwały w panelu', async () => {
    mockSupabaseData.data = [
      {
        id: 'ann-vote',
        title: 'Nowe głosowanie: Wymiana windy',
        content: 'Otwarto głosowanie.',
        excerpt: null,
        is_pinned: false,
        is_public: false,
        email_sent_at: null,
        created_at: '2026-03-10T10:00:00Z',
      },
    ]
    mockResolutionsRows.push({ id: 'res-1', title: 'Wymiana windy' })
    renderPage()

    await waitFor(() => {
      const link = screen.getByRole('link', { name: 'Nowe głosowanie: Wymiana windy' })
      expect(link).toHaveAttribute('href', '/admin/uchwaly#resolution-res-1')
    })
  })
})
