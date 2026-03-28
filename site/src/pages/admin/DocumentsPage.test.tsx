import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ToastProvider } from '../../components/ui/Toast'
import { ConfirmProvider } from '../../components/ui/ConfirmDialog'

vi.mock('../../hooks/useRole', () => ({
  useRole: () => ({
    role: 'admin', isAdmin: true, isManager: false, isAdminOrManager: true, isResident: false, loading: false,
  }),
}))

const mockFrom = vi.fn()
const mockUpload = vi.fn()
const mockRemove = vi.fn()
const mockCreateSignedUrl = vi.fn()

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { user: { id: 'admin-1' } } },
      }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
    from: (...args: unknown[]) => mockFrom(...args),
    storage: {
      from: () => ({
        upload: mockUpload,
        remove: mockRemove,
        createSignedUrl: mockCreateSignedUrl,
      }),
    },
  },
}))

vi.mock('../../components/ui/Icons', () => ({
  UploadIcon: ({ className }: { className?: string }) => <span data-testid="upload-icon" className={className} />,
  TrashIcon: ({ className }: { className?: string }) => <span data-testid="trash-icon" className={className} />,
  FileIcon: ({ className }: { className?: string }) => <span data-testid="file-icon" className={className} />,
  DownloadIcon: ({ className }: { className?: string }) => <span data-testid="download-icon" className={className} />,
}))

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'admin-1' }, loading: false }),
}))

import AdminDocumentsPage from './DocumentsPage'

const mockDocuments = [
  {
    id: 'd1',
    name: 'Regulamin porządku domowego',
    category: 'regulamin',
    file_path: '1700000000_regulamin.pdf',
    file_size: '1.2 MB',
    is_public: true,
    created_at: '2025-06-01T10:00:00',
  },
  {
    id: 'd2',
    name: 'Protokół zebrania',
    category: 'protokol',
    file_path: '1700000001_protokol.pdf',
    file_size: '500 KB',
    is_public: false,
    created_at: '2025-05-15T10:00:00',
  },
]

function renderPage() {
  return render(
    <ToastProvider>
      <ConfirmProvider>
        <AdminDocumentsPage />
      </ConfirmProvider>
    </ToastProvider>,
  )
}

const mockOrder = vi.fn()
const mockSelect = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()

  mockOrder.mockResolvedValue({ data: mockDocuments, error: null })
  mockSelect.mockReturnValue({ order: mockOrder })
  mockFrom.mockReturnValue({
    select: mockSelect,
    insert: vi.fn().mockResolvedValue({ error: null }),
    update: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    }),
    delete: vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    }),
  })
  mockUpload.mockResolvedValue({ error: null })
  mockRemove.mockResolvedValue({ error: null })
  mockCreateSignedUrl.mockResolvedValue({
    data: { signedUrl: 'https://example.com/signed' },
    error: null,
  })
})

describe('AdminDocumentsPage', () => {
  it('wyświetla listę dokumentów po załadowaniu', async () => {
    renderPage()

    expect(screen.getByText('Ładowanie...')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('Regulamin porządku domowego')).toBeInTheDocument()
    })
    expect(screen.getByText('Protokół zebrania')).toBeInTheDocument()
  })

  it('wyświetla komunikat gdy brak dokumentów', async () => {
    mockOrder.mockResolvedValue({ data: [], error: null })
    renderPage()

    await waitFor(() => {
      expect(screen.getByText(/Brak dokumentów/)).toBeInTheDocument()
    })
  })

  it('otwiera formularz uploadu po kliknięciu Dodaj dokument', async () => {
    const user = userEvent.setup()
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Regulamin porządku domowego')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Dodaj dokument'))
    expect(screen.getByText('Nowy dokument')).toBeInTheDocument()
    expect(screen.getByText('Nazwa dokumentu *')).toBeInTheDocument()
    expect(screen.getByText('Plik PDF *')).toBeInTheDocument()
  })

  it('waliduje brak pliku przy próbie uploadu', async () => {
    const user = userEvent.setup()
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Regulamin porządku domowego')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Dodaj dokument'))
    await user.click(screen.getByText('Prześlij'))

    await waitFor(() => {
      expect(screen.getByText('Wybierz plik do przesłania.')).toBeInTheDocument()
    })
  })

  it('wyświetla badge publiczny/prywatny', async () => {
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Regulamin porządku domowego')).toBeInTheDocument()
    })

    expect(screen.getByText('Publiczny')).toBeInTheDocument()
    expect(screen.getByText('Prywatny')).toBeInTheDocument()
  })

  it('filtruje dokumenty po kategorii', async () => {
    const user = userEvent.setup()
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Regulamin porządku domowego')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Regulaminy' }))

    expect(screen.getByText('Regulamin porządku domowego')).toBeInTheDocument()
    expect(screen.queryByText('Protokół zebrania')).not.toBeInTheDocument()
  })

  it('zamyka formularz po kliknięciu Anuluj', async () => {
    const user = userEvent.setup()
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Regulamin porządku domowego')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Dodaj dokument'))
    expect(screen.getByText('Nowy dokument')).toBeInTheDocument()

    await user.click(screen.getByText('Anuluj'))
    expect(screen.queryByText('Nowy dokument')).not.toBeInTheDocument()
  })
})
