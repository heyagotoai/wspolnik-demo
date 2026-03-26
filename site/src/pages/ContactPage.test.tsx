import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '../components/ui/Toast'
import ContactPage from './ContactPage'

vi.mock('../components/ui/Icons', () => ({
  MapPinIcon: () => <span data-testid="icon-map" />,
  MailIcon: () => <span data-testid="icon-mail" />,
  PhoneIcon: () => <span data-testid="icon-phone" />,
}))

function renderPage() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <ContactPage />
      </ToastProvider>
    </MemoryRouter>,
  )
}

function mockFetch(ok: boolean, body: object) {
  global.fetch = vi.fn().mockResolvedValue({
    ok,
    json: () => Promise.resolve(body),
  } as Response)
}

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('ContactPage', () => {
  it('renderuje formularz kontaktowy', () => {
    renderPage()

    expect(screen.getByRole('heading', { name: 'Wyślij wiadomość' })).toBeInTheDocument()
    expect(screen.getByText('Imię i nazwisko')).toBeInTheDocument()
    expect(screen.getByText('Adres e-mail')).toBeInTheDocument()
    expect(screen.getByText('Wiadomość')).toBeInTheDocument()
  })

  it('pole numer mieszkania ma oznaczenie opcjonalne', () => {
    renderPage()

    expect(screen.getByText('(opcjonalne)')).toBeInTheDocument()
  })

  it('renderuje dane kontaktowe i numery alarmowe', () => {
    renderPage()

    expect(screen.getByText('Dane kontaktowe')).toBeInTheDocument()
    expect(screen.getByText('Numery alarmowe')).toBeInTheDocument()
  })

  it('wysyła formularz i pokazuje toast sukcesu', async () => {
    mockFetch(true, { detail: 'Wiadomość wysłana' })
    renderPage()
    const user = userEvent.setup()

    await user.type(screen.getByRole('textbox', { name: /imię i nazwisko/i }), 'Jan Kowalski')
    await user.type(screen.getByRole('textbox', { name: /adres e-mail/i }), 'jan@example.com')
    await user.type(screen.getByRole('textbox', { name: /wiadomość/i }), 'Treść wiadomości testowej')
    await user.click(screen.getByRole('button', { name: /wyślij wiadomość/i }))

    await waitFor(() => {
      expect(screen.getByText('Wiadomość została wysłana. Dziękujemy!')).toBeInTheDocument()
    })
  })

  it('wyczyścia formularz po udanym wysłaniu', async () => {
    mockFetch(true, { detail: 'Wiadomość wysłana' })
    renderPage()
    const user = userEvent.setup()

    const nameInput = screen.getByRole('textbox', { name: /imię i nazwisko/i })
    await user.type(nameInput, 'Jan Kowalski')
    await user.type(screen.getByRole('textbox', { name: /adres e-mail/i }), 'jan@example.com')
    await user.type(screen.getByRole('textbox', { name: /wiadomość/i }), 'Treść wiadomości testowej')
    await user.click(screen.getByRole('button', { name: /wyślij wiadomość/i }))

    await waitFor(() => {
      expect(nameInput).toHaveValue('')
    })
  })

  it('pokazuje toast błędu gdy serwer zwraca błąd (string detail)', async () => {
    mockFetch(false, { detail: 'Zbyt wiele wiadomości' })
    renderPage()
    const user = userEvent.setup()

    await user.type(screen.getByRole('textbox', { name: /imię i nazwisko/i }), 'Jan Kowalski')
    await user.type(screen.getByRole('textbox', { name: /adres e-mail/i }), 'jan@example.com')
    await user.type(screen.getByRole('textbox', { name: /wiadomość/i }), 'Treść wiadomości testowej')
    await user.click(screen.getByRole('button', { name: /wyślij wiadomość/i }))

    await waitFor(() => {
      expect(screen.getByText('Zbyt wiele wiadomości')).toBeInTheDocument()
    })
  })

  it('pokazuje czytelny komunikat przy błędzie walidacji Pydantic (422)', async () => {
    mockFetch(false, {
      detail: [
        {
          type: 'value_error',
          loc: ['body', 'email'],
          msg: 'value is not a valid email address: The part after the @-sign is not valid.',
          input: 'heya@wp',
        },
      ],
    })
    renderPage()
    const user = userEvent.setup()

    await user.type(screen.getByRole('textbox', { name: /imię i nazwisko/i }), 'Jan Kowalski')
    await user.type(screen.getByRole('textbox', { name: /adres e-mail/i }), 'jan@example.com')
    await user.type(screen.getByRole('textbox', { name: /wiadomość/i }), 'Treść wiadomości testowej')
    await user.click(screen.getByRole('button', { name: /wyślij wiadomość/i }))

    await waitFor(() => {
      expect(screen.getByText('Podaj prawidłowy adres e-mail.')).toBeInTheDocument()
    })
  })

  it('przycisk wysyłania jest zablokowany podczas wysyłania', async () => {
    let resolveFetch!: (value: unknown) => void
    global.fetch = vi.fn().mockReturnValue(
      new Promise((resolve) => { resolveFetch = resolve }),
    )
    renderPage()
    const user = userEvent.setup()

    await user.type(screen.getByRole('textbox', { name: /imię i nazwisko/i }), 'Jan Kowalski')
    await user.type(screen.getByRole('textbox', { name: /adres e-mail/i }), 'jan@example.com')
    await user.type(screen.getByRole('textbox', { name: /wiadomość/i }), 'Treść wiadomości testowej')
    await user.click(screen.getByRole('button', { name: /wyślij wiadomość/i }))

    expect(screen.getByRole('button', { name: /wysyłanie/i })).toBeDisabled()

    resolveFetch({ ok: true, json: () => Promise.resolve({}) })
  })

  it('uwzględnia numer mieszkania w wysyłanym żądaniu', async () => {
    mockFetch(true, { detail: 'ok' })
    renderPage()
    const user = userEvent.setup()

    await user.type(screen.getByRole('textbox', { name: /imię i nazwisko/i }), 'Anna Nowak')
    await user.type(screen.getByRole('textbox', { name: /adres e-mail/i }), 'anna@example.com')
    await user.type(screen.getByRole('textbox', { name: /numer mieszkania/i }), '12A')
    await user.type(screen.getByRole('textbox', { name: /wiadomość/i }), 'Treść wiadomości testowej')
    await user.click(screen.getByRole('button', { name: /wyślij wiadomość/i }))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/contact'),
        expect.objectContaining({
          body: expect.stringContaining('"apartment_number":"12A"'),
        }),
      )
    })
  })
})
