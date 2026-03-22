import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ToastProvider } from '../../components/ui/Toast'
import { ConfirmProvider } from '../../components/ui/ConfirmDialog'

const mockGet = vi.fn()
const mockPost = vi.fn()

vi.mock('../../lib/api', () => ({
  api: {
    get: (...args: unknown[]) => mockGet(...args),
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

vi.mock('../../components/ui/Icons', () => ({}))

import ResidentResolutionsPage from './ResolutionsPage'

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
    title: 'Zamknięta uchwała',
    description: null,
    document_id: null,
    voting_start: null,
    voting_end: null,
    status: 'closed',
    created_at: '2026-03-15T10:00:00',
  },
]

function renderPage() {
  return render(
    <ToastProvider>
      <ConfirmProvider>
        <ResidentResolutionsPage />
      </ConfirmProvider>
    </ToastProvider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()

  mockGet.mockImplementation((path: string) => {
    if (path === '/resolutions') return Promise.resolve(mockResolutions)
    if (path.includes('/results')) return Promise.resolve({ za: 2, przeciw: 1, wstrzymuje: 0, total: 3 })
    if (path.includes('/my-vote')) return Promise.resolve(null)
    return Promise.resolve(null)
  })
})

describe('ResidentResolutionsPage', () => {
  it('wyświetla listę uchwał (bez szkiców)', async () => {
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Wymiana windy')).toBeInTheDocument()
    })
    expect(screen.getByText('Zamknięta uchwała')).toBeInTheDocument()
  })

  it('wyświetla przyciski głosowania dla aktywnej uchwały', async () => {
    renderPage()

    await waitFor(() => {
      expect(screen.getByText('Za')).toBeInTheDocument()
    })
    expect(screen.getByText('Przeciw')).toBeInTheDocument()
    expect(screen.getByText('Wstrzymuję się')).toBeInTheDocument()
  })

  it('wyświetla wyniki głosowania', async () => {
    renderPage()

    await waitFor(() => {
      expect(screen.getAllByText('Za: 2').length).toBeGreaterThan(0)
    })
  })

  it('wyświetla komunikat gdy brak głosowań', async () => {
    // Return only draft resolutions (filtered out by component)
    mockGet.mockImplementation((path: string) => {
      if (path === '/resolutions') return Promise.resolve([{
        ...mockResolutions[0],
        status: 'draft',
      }])
      return Promise.resolve(null)
    })

    renderPage()

    await waitFor(() => {
      expect(screen.getByText(/Brak aktywnych głosowań/)).toBeInTheDocument()
    })
  })

  it('oddaje głos po kliknięciu', async () => {
    mockPost.mockResolvedValue({
      id: 'vote-1', resolution_id: 'res-1', resident_id: 'res-1',
      vote: 'za', voted_at: '2026-03-21T12:00:00',
    })

    renderPage()
    const user = userEvent.setup()

    await waitFor(() => {
      expect(screen.getByText('Za')).toBeInTheDocument()
    })

    await user.click(screen.getByText('Za'))

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/resolutions/res-1/vote', { vote: 'za' })
    })
  })

  it('pokazuje oddany głos', async () => {
    mockGet.mockImplementation((path: string) => {
      if (path === '/resolutions') return Promise.resolve(mockResolutions)
      if (path.includes('/results')) return Promise.resolve({ za: 2, przeciw: 1, wstrzymuje: 0, total: 3 })
      if (path === '/resolutions/res-1/my-vote') return Promise.resolve({
        id: 'vote-1', vote: 'za', voted_at: '2026-03-21T12:00:00',
      })
      if (path.includes('/my-vote')) return Promise.resolve(null)
      return Promise.resolve(null)
    })

    renderPage()

    await waitFor(() => {
      expect(screen.getByText(/Twój głos:/)).toBeInTheDocument()
    })
  })
})
