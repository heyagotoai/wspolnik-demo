import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ToastProvider } from '../../components/ui/Toast'
import { ConfirmProvider } from '../../components/ui/ConfirmDialog'

// Mock api client
const mockGet = vi.fn()
const mockPost = vi.fn()
const mockPatch = vi.fn()
const mockDelete = vi.fn()

vi.mock('../../lib/api', () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
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
  PlusIcon: ({ className }: { className?: string }) => <span data-testid="plus-icon" className={className}>+</span>,
  EditIcon: ({ className }: { className?: string }) => <span data-testid="edit-icon" className={className}>✎</span>,
  TrashIcon: ({ className }: { className?: string }) => <span data-testid="trash-icon" className={className}>🗑</span>,
  XIcon: ({ className }: { className?: string }) => <span data-testid="x-icon" className={className}>×</span>,
}))

import AdminResolutionsPage from './ResolutionsPage'

const mockResolutions = [
  {
    id: 'res-1',
    title: 'Wymiana windy',
    description: 'Głosowanie nad wymianą windy',
    document_id: null,
    voting_start: '2026-04-01',
    voting_end: '2026-04-15',
    status: 'voting',
    created_at: '2026-03-20T10:00:00',
  },
  {
    id: 'res-2',
    title: 'Remont klatki',
    description: null,
    document_id: null,
    voting_start: null,
    voting_end: null,
    status: 'draft',
    created_at: '2026-03-19T10:00:00',
  },
]

function renderPage() {
  return render(
    <ToastProvider>
      <ConfirmProvider>
        <AdminResolutionsPage />
      </ConfirmProvider>
    </ToastProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()

  // Default: api.get returns resolutions list, results return empty
  mockGet.mockImplementation((path: string) => {
    if (path === '/resolutions') return Promise.resolve(mockResolutions)
    if (path.includes('/results')) return Promise.resolve({ za: 1, przeciw: 0, wstrzymuje: 0, total: 1 })
    return Promise.resolve(null)
  })
})

describe('AdminResolutionsPage', () => {
  it('wyświetla listę uchwał', async () => {
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Wymiana windy')).toBeInTheDocument()
    })
    expect(screen.getByText('Remont klatki')).toBeInTheDocument()
  })

  it('wyświetla status badge', async () => {
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Głosowanie')).toBeInTheDocument()
    })
    expect(screen.getByText('Szkic')).toBeInTheDocument()
  })

  it('wyświetla komunikat gdy brak uchwał', async () => {
    mockGet.mockResolvedValue([])

    renderPage()

    await waitFor(() => {
      expect(screen.getByText(/Brak uchwał/)).toBeInTheDocument()
    })
  })

  it('otwiera formularz dodawania', async () => {
    renderPage()
    const user = userEvent.setup()

    await waitFor(() => {
      expect(screen.getByText('Wymiana windy')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Dodaj uchwałę'))

    expect(screen.getByText('Nowa uchwała')).toBeInTheDocument()
    expect(screen.getByText(/Tytuł/)).toBeInTheDocument()
  })

  it('waliduje wymagane pole tytuł', async () => {
    renderPage()
    const user = userEvent.setup()

    await waitFor(() => {
      expect(screen.getByText('Wymiana windy')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Dodaj uchwałę'))
    await user.click(screen.getByText('Utwórz'))

    expect(screen.getByText('Tytuł jest wymagany.')).toBeInTheDocument()
  })

  it('wyświetla wyniki głosowania', async () => {
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Za: 1')).toBeInTheDocument()
    })
  })
})
