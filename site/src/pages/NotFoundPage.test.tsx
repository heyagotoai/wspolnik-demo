import { render, screen, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import NotFoundPage from './NotFoundPage'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

describe('NotFoundPage', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    mockNavigate.mockClear()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders 404 message', () => {
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>
    )
    expect(screen.getByText('404')).toBeInTheDocument()
    expect(screen.getByText('Strona nie została znaleziona')).toBeInTheDocument()
  })

  it('shows links to home and login', () => {
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>
    )
    expect(screen.getByText('Strona główna')).toBeInTheDocument()
    expect(screen.getByText('Zaloguj się')).toBeInTheDocument()
  })

  it('redirects to home after countdown', () => {
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>
    )

    act(() => {
      vi.advanceTimersByTime(5000)
    })

    expect(mockNavigate).toHaveBeenCalledWith('/')
  })
})
