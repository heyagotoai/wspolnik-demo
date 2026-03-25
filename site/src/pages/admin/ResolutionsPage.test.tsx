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
  DownloadIcon: ({ className }: { className?: string }) => <span data-testid="download-icon" className={className}>⬇</span>,
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

  // Default: api.get returns resolutions list, results and votes return mock data
  mockGet.mockImplementation((path: string) => {
    if (path === '/resolutions') return Promise.resolve(mockResolutions)
    if (path.includes('/results')) return Promise.resolve({ za: 1, przeciw: 0, wstrzymuje: 0, total: 1 })
    if (path.includes('/votes')) return Promise.resolve([
      { resident_id: 'r1', full_name: 'Jan Kowalski', apartment_number: '12', vote: 'za', voted_at: '2026-03-21T12:00:00' },
    ])
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

  it('pokazuje przycisk eksportu PDF dla uchwały w głosowaniu', async () => {
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Wymiana windy')).toBeInTheDocument()
    })

    const exportButtons = screen.getAllByTitle('Eksportuj wyniki głosowania (PDF)')
    expect(exportButtons).toHaveLength(1) // tylko uchwała "voting", nie "draft"
  })

  it('nie pokazuje przycisku eksportu PDF dla szkicu', async () => {
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Remont klatki')).toBeInTheDocument()
    })

    // "Remont klatki" ma status draft — brak przycisku eksportu
    const exportButtons = screen.queryAllByTitle('Eksportuj wyniki głosowania (PDF)')
    expect(exportButtons).toHaveLength(1) // tylko dla "voting"
  })

  it('wywołuje window.open przy eksporcie PDF i zawiera dane mieszkańca', async () => {
    const mockWin = {
      document: { write: vi.fn(), close: vi.fn() },
      focus: vi.fn(),
      print: vi.fn(),
    }
    const mockOpen = vi.fn().mockReturnValue(mockWin)
    vi.stubGlobal('open', mockOpen)

    renderPage()
    const user = userEvent.setup()

    await waitFor(() => {
      expect(screen.getByText('Wymiana windy')).toBeInTheDocument()
    })

    const exportBtn = screen.getByTitle('Eksportuj wyniki głosowania (PDF)')
    await user.click(exportBtn)

    await waitFor(() => {
      expect(mockOpen).toHaveBeenCalledWith('', '_blank', expect.any(String))
    })

    // PDF zawiera dane mieszkańca z listy głosów
    const writtenHtml: string = mockWin.document.write.mock.calls[0][0]
    expect(writtenHtml).toContain('Jan Kowalski')
    expect(writtenHtml).toContain('Lista głosów mieszkańców')

    vi.unstubAllGlobals()
  })

  it('escapeuje HTML w danych przy eksporcie PDF (ochrona XSS)', async () => {
    const xssTitle = '<script>alert("xss")</script>'
    const xssName = '<img src=x onerror="alert(1)">'
    mockGet.mockImplementation((path: string) => {
      if (path === '/resolutions') return Promise.resolve([{
        ...mockResolutions[0],
        title: xssTitle,
        description: 'Test <b>bold</b> injection',
      }])
      if (path.includes('/results')) return Promise.resolve({ za: 1, przeciw: 0, wstrzymuje: 0, total: 1 })
      if (path.includes('/votes')) return Promise.resolve([
        { resident_id: 'r1', full_name: xssName, apartment_number: '<a>', vote: 'za', voted_at: '2026-03-21T12:00:00' },
      ])
      return Promise.resolve(null)
    })

    const mockWin = {
      document: { write: vi.fn(), close: vi.fn() },
      focus: vi.fn(),
      print: vi.fn(),
    }
    vi.stubGlobal('open', vi.fn().mockReturnValue(mockWin))

    renderPage()
    const user = userEvent.setup()

    await waitFor(() => {
      expect(screen.getByText(xssTitle)).toBeInTheDocument()
    })

    const exportBtn = screen.getByTitle('Eksportuj wyniki głosowania (PDF)')
    await user.click(exportBtn)

    await waitFor(() => {
      expect(mockWin.document.write).toHaveBeenCalled()
    })

    const html: string = mockWin.document.write.mock.calls[0][0]

    // Tytuł musi być escape'owany — nie może zawierać surowego <script>
    expect(html).toContain('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;')
    expect(html).not.toContain('<script>alert')

    // Opis — <b> musi być escape'owany
    expect(html).toContain('Test &lt;b&gt;bold&lt;/b&gt; injection')

    // Imię mieszkańca — musi być escape'owane
    expect(html).toContain('&lt;img src=x onerror=&quot;alert(1)&quot;&gt;')
    expect(html).not.toContain('<img src=x')

    // Numer lokalu — escape'owany
    expect(html).toContain('&lt;a&gt;')
    expect(html).not.toMatch(/<a>/)

    vi.unstubAllGlobals()
  })
})
