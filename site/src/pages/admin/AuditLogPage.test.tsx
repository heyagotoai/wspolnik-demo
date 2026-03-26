import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ToastProvider } from '../../components/ui/Toast'

const mockGet = vi.fn()

vi.mock('../../lib/api', () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
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

import AuditLogPage from './AuditLogPage'

const MOCK_RESPONSE = {
  data: [
    {
      id: 'a1',
      user_id: 'admin-1',
      user_name: 'Administrator',
      action: 'create',
      table_name: 'charges',
      record_id: 'c1',
      old_data: null,
      new_data: { amount: '150.00' },
      created_at: '2026-03-25T14:00:00',
    },
    {
      id: 'a2',
      user_id: 'admin-1',
      user_name: 'Administrator',
      action: 'votes_reset',
      table_name: 'votes',
      record_id: 'r1',
      old_data: { votes: [{ vote: 'za' }], reason: 'manual_reset' },
      new_data: null,
      created_at: '2026-03-25T15:00:00',
    },
  ],
  total: 2,
  page: 1,
  per_page: 50,
}

function renderPage() {
  return render(
    <ToastProvider>
      <AuditLogPage />
    </ToastProvider>,
  )
}

describe('AuditLogPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGet.mockResolvedValue(MOCK_RESPONSE)
  })

  it('wyświetla tytuł strony', async () => {
    renderPage()
    expect(screen.getByText('Dziennik operacji')).toBeInTheDocument()
  })

  it('ładuje i wyświetla wpisy audit log', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Znaleziono 2 wpisów')).toBeInTheDocument()
    })
    expect(screen.getAllByText('Administrator')).toHaveLength(2)
    // 'Utworzenie' appears in filter option + table badge
    expect(screen.getAllByText('Utworzenie').length).toBeGreaterThanOrEqual(1)
    // 'Reset głosów' appears in filter option + table badge
    expect(screen.getAllByText('Reset głosów').length).toBeGreaterThanOrEqual(1)
  })

  it('wyświetla filtry', () => {
    renderPage()
    expect(screen.getByText('Filtry')).toBeInTheDocument()
    expect(screen.getByLabelText('Tabela')).toBeInTheDocument()
    expect(screen.getByLabelText('Akcja')).toBeInTheDocument()
    expect(screen.getByLabelText('Od daty')).toBeInTheDocument()
    expect(screen.getByLabelText('Do daty')).toBeInTheDocument()
  })

  it('wywołuje API z filtrami po zmianie tabeli', async () => {
    renderPage()
    await waitFor(() => {
      expect(mockGet).toHaveBeenCalled()
    })

    const select = screen.getByLabelText('Tabela')
    await userEvent.selectOptions(select, 'votes')

    await waitFor(() => {
      const calls = mockGet.mock.calls
      const lastCall = calls[calls.length - 1][0] as string
      expect(lastCall).toContain('table_name=votes')
    })
  })

  it('wyświetla czytelny opis dla reset głosów', async () => {
    renderPage()
    await waitFor(() => {
      expect(screen.getByText(/Usunięto 1 głosów/)).toBeInTheDocument()
    })
  })

  it('obsługuje błąd ładowania', async () => {
    mockGet.mockRejectedValue(new Error('fail'))
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Brak wpisów dla wybranych filtrów.')).toBeInTheDocument()
    })
  })

  it('zapobiega XSS w danych JSON', async () => {
    mockGet.mockResolvedValue({
      ...MOCK_RESPONSE,
      total: 1,
      data: [{
        ...MOCK_RESPONSE.data[0],
        new_data: { name: '<script>alert("xss")</script>' },
      }],
    })
    renderPage()
    await waitFor(() => {
      expect(screen.getByText('Znaleziono 1 wpisów')).toBeInTheDocument()
    })
    // JSON.stringify escapes angle brackets, and React doesn't render raw HTML in textContent
    expect(document.querySelector('script')).toBeNull()
  })
})
