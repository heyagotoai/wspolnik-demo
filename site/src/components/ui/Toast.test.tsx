import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { ToastProvider, useToast } from './Toast'

// Komponent testowy wywołujący toast
function ToastTrigger({ message, type }: { message: string; type?: 'success' | 'error' | 'info' }) {
  const { toast } = useToast()
  return <button onClick={() => toast(message, type)}>Pokaż toast</button>
}

function renderWithToast(message: string, type?: 'success' | 'error' | 'info') {
  return render(
    <ToastProvider>
      <ToastTrigger message={message} type={type} />
    </ToastProvider>,
  )
}

describe('ToastProvider', () => {
  it('wyświetla toast po wywołaniu', async () => {
    const user = userEvent.setup()
    renderWithToast('Zapisano pomyślnie', 'success')

    await user.click(screen.getByText('Pokaż toast'))
    expect(screen.getByText('Zapisano pomyślnie')).toBeInTheDocument()
  })

  it('ukrywa toast po kliknięciu przycisku zamknij', async () => {
    const user = userEvent.setup()
    renderWithToast('Test toast')

    await user.click(screen.getByText('Pokaż toast'))
    expect(screen.getByText('Test toast')).toBeInTheDocument()

    // Kliknij × żeby zamknąć
    await user.click(screen.getByText('×'))
    expect(screen.queryByText('Test toast')).not.toBeInTheDocument()
  })

  it('automatycznie znika po 4 sekundach', async () => {
    vi.useFakeTimers()

    renderWithToast('Znikający toast')

    // Użyj fireEvent zamiast userEvent (fake timers + userEvent = timeout)
    const { fireEvent: fe } = await import('@testing-library/react')
    fe.click(screen.getByText('Pokaż toast'))
    expect(screen.getByText('Znikający toast')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(4100)
    })

    expect(screen.queryByText('Znikający toast')).not.toBeInTheDocument()
    vi.useRealTimers()
  })

  it('rzuca błąd gdy useToast użyty poza providerem', () => {
    // Suppress console.error from React error boundary
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    function Broken() {
      useToast()
      return null
    }

    expect(() => render(<Broken />)).toThrow('useToast musi być używany wewnątrz ToastProvider')
    spy.mockRestore()
  })
})
