import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ToastProvider } from '../../components/ui/Toast'

const mockFrom = vi.fn()
const mockCreateSignedUrl = vi.fn()

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { user: { id: 'user-1' } } },
      }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
    from: (...args: unknown[]) => mockFrom(...args),
    storage: {
      from: () => ({
        createSignedUrl: mockCreateSignedUrl,
      }),
    },
  },
}))

vi.mock('../../components/ui/Icons', () => ({
  FileIcon: ({ className }: { className?: string }) => <span data-testid="file-icon" className={className} />,
  DownloadIcon: ({ className }: { className?: string }) => <span data-testid="download-icon" className={className} />,
}))

import DocumentsPage from './DocumentsPage'

const mockDocuments = [
  {
    id: 'd1',
    name: 'Regulamin portalu WM GABI',
    category: 'regulamin',
    file_path: '1700000000_regulamin.pdf',
    file_size: '2.1 MB',
    is_public: true,
    created_at: '2025-06-01T10:00:00',
  },
  {
    id: 'd2',
    name: 'Formularz zgłoszenia',
    category: 'formularz',
    file_path: '1700000001_formularz.pdf',
    file_size: '300 KB',
    is_public: false,
    created_at: '2025-05-20T10:00:00',
  },
]

function renderPage() {
  return render(
    <ToastProvider>
      <DocumentsPage />
    </ToastProvider>,
  )
}

const mockOrder = vi.fn()
const mockSelect = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()

  mockOrder.mockResolvedValue({ data: mockDocuments, error: null })
  mockSelect.mockReturnValue({ order: mockOrder })
  mockFrom.mockReturnValue({ select: mockSelect })
  mockCreateSignedUrl.mockResolvedValue({
    data: { signedUrl: 'https://example.com/signed' },
    error: null,
  })
})

describe('Resident DocumentsPage', () => {
  it('wyświetla listę dokumentów po załadowaniu', async () => {
    renderPage()

    expect(screen.getByText('Ładowanie...')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('Regulamin portalu WM GABI')).toBeInTheDocument()
    })
    expect(screen.getByText('Formularz zgłoszenia')).toBeInTheDocument()
  })

  it('wyświetla komunikat gdy brak dokumentów', async () => {
    mockOrder.mockResolvedValue({ data: [], error: null })
    renderPage()

    await waitFor(() => {
      expect(screen.getByText(/Brak dokumentów/)).toBeInTheDocument()
    })
  })

  it('filtruje po kategorii', async () => {
    const user = userEvent.setup()
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Regulamin portalu WM GABI')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Regulaminy' }))

    expect(screen.getByText('Regulamin portalu WM GABI')).toBeInTheDocument()
    expect(screen.queryByText('Formularz zgłoszenia')).not.toBeInTheDocument()
  })

  it('pobiera dokument przez signed URL', async () => {
    const user = userEvent.setup()
    const windowOpen = vi.spyOn(window, 'open').mockImplementation(() => null)
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Regulamin portalu WM GABI')).toBeInTheDocument()
    })

    const downloadButtons = screen.getAllByTitle('Pobierz')
    await user.click(downloadButtons[0])

    await waitFor(() => {
      expect(mockCreateSignedUrl).toHaveBeenCalledWith('1700000000_regulamin.pdf', 60)
    })
    expect(windowOpen).toHaveBeenCalledWith('https://example.com/signed', '_blank')

    windowOpen.mockRestore()
  })

  it('pokazuje toast przy błędzie pobierania', async () => {
    const user = userEvent.setup()
    mockCreateSignedUrl.mockResolvedValue({ data: null, error: { message: 'fail' } })
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Regulamin portalu WM GABI')).toBeInTheDocument()
    })

    const downloadButtons = screen.getAllByTitle('Pobierz')
    await user.click(downloadButtons[0])

    await waitFor(() => {
      expect(screen.getByText('Nie udało się pobrać pliku.')).toBeInTheDocument()
    })
  })

  it('wyświetla rozmiar pliku', async () => {
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('2.1 MB')).toBeInTheDocument()
    })
    expect(screen.getByText('300 KB')).toBeInTheDocument()
  })
})
