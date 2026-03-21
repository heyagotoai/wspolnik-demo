import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { ConfirmProvider, useConfirm } from './ConfirmDialog'

// Komponent testowy wywołujący confirm dialog
function ConfirmTrigger({
  onResult,
  danger = false,
}: {
  onResult: (result: boolean) => void
  danger?: boolean
}) {
  const { confirm } = useConfirm()

  const handleClick = async () => {
    const result = await confirm({
      title: 'Potwierdzenie',
      message: 'Czy na pewno?',
      confirmLabel: 'Tak',
      cancelLabel: 'Nie',
      danger,
    })
    onResult(result)
  }

  return <button onClick={handleClick}>Otwórz dialog</button>
}

function renderWithConfirm(onResult: (r: boolean) => void, danger = false) {
  return render(
    <ConfirmProvider>
      <ConfirmTrigger onResult={onResult} danger={danger} />
    </ConfirmProvider>,
  )
}

describe('ConfirmProvider', () => {
  it('wyświetla dialog po wywołaniu confirm()', async () => {
    const user = userEvent.setup()
    renderWithConfirm(() => {})

    await user.click(screen.getByText('Otwórz dialog'))

    expect(screen.getByText('Potwierdzenie')).toBeInTheDocument()
    expect(screen.getByText('Czy na pewno?')).toBeInTheDocument()
    expect(screen.getByText('Tak')).toBeInTheDocument()
    expect(screen.getByText('Nie')).toBeInTheDocument()
  })

  it('zwraca true po kliknięciu Potwierdź', async () => {
    const user = userEvent.setup()
    const onResult = vi.fn()
    renderWithConfirm(onResult)

    await user.click(screen.getByText('Otwórz dialog'))
    await user.click(screen.getByText('Tak'))

    expect(onResult).toHaveBeenCalledWith(true)
    // Dialog powinien zniknąć
    expect(screen.queryByText('Czy na pewno?')).not.toBeInTheDocument()
  })

  it('zwraca false po kliknięciu Anuluj', async () => {
    const user = userEvent.setup()
    const onResult = vi.fn()
    renderWithConfirm(onResult)

    await user.click(screen.getByText('Otwórz dialog'))
    await user.click(screen.getByText('Nie'))

    expect(onResult).toHaveBeenCalledWith(false)
  })

  it('zwraca false po kliknięciu w overlay', async () => {
    const user = userEvent.setup()
    const onResult = vi.fn()
    renderWithConfirm(onResult)

    await user.click(screen.getByText('Otwórz dialog'))

    // Overlay to pierwszy div z absolute inset-0
    const overlay = document.querySelector('.absolute.inset-0')!
    await user.click(overlay)

    expect(onResult).toHaveBeenCalledWith(false)
  })

  it('rzuca błąd gdy useConfirm użyty poza providerem', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    function Broken() {
      useConfirm()
      return null
    }

    expect(() => render(<Broken />)).toThrow('useConfirm musi być używany wewnątrz ConfirmProvider')
    spy.mockRestore()
  })
})
