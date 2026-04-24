import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { ToastProvider } from '../components/ui/Toast'
import { AuthContext } from '../hooks/useAuth'
import type { User, Session } from '@supabase/supabase-js'
import ContactPage from './ContactPage'
import { isDemoApp } from '../demo/isDemoApp'

vi.mock('../demo/isDemoApp', () => ({
  isDemoApp: vi.fn(() => false),
}))

vi.mock('../components/ui/Icons', () => ({
  MapPinIcon: () => <span data-testid="icon-map" />,
  MailIcon: () => <span data-testid="icon-mail" />,
  PhoneIcon: () => <span data-testid="icon-phone" />,
}))

const guestAuthValue = {
  user: null,
  session: null,
  loading: false,
  signIn: vi.fn(),
  signOut: vi.fn(),
}

const residentAuthValue = {
  user: { id: 'test-user-id', email: 'jan@example.com' } as User,
  session: {} as Session,
  loading: false,
  signIn: vi.fn(),
  signOut: vi.fn(),
}

function renderPage(authValue = guestAuthValue) {
  return render(
    <AuthContext.Provider value={authValue}>
      <MemoryRouter>
        <ToastProvider>
          <ContactPage />
        </ToastProvider>
      </MemoryRouter>
    </AuthContext.Provider>,
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
  vi.mocked(isDemoApp).mockReturnValue(false)
})

describe('ContactPage', () => {
  it('w trybie demo pokazuje ramkę informacyjną i nie wywołuje fetch przy wysyłce', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch')
    vi.mocked(isDemoApp).mockReturnValue(true)
    renderPage()
    const user = userEvent.setup()

    expect(screen.getByRole('status')).toHaveTextContent('Tryb demonstracyjny')
    expect(screen.getByRole('status')).toHaveTextContent('Prawdziwa strona wspólnoty')

    await user.type(screen.getByRole('textbox', { name: /imię i nazwisko/i }), 'Jan Kowalski')
    await user.type(screen.getByRole('textbox', { name: /adres e-mail/i }), 'jan@example.com')
    await user.type(screen.getByRole('textbox', { name: /wiadomość/i }), 'Treść wiadomości testowej')
    await user.click(screen.getByRole('button', { name: /wyślij wiadomość/i }))

    await waitFor(() => {
      expect(
        screen.getByText(/W trybie demo wiadomość nie jest wysyłana\. Szczegóły znajdziesz w ramce informacyjnej/),
      ).toBeInTheDocument()
    })
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('renderuje formularz kontaktowy dla gościa', () => {
    renderPage()

    expect(screen.getByRole('heading', { name: 'Wyślij wiadomość' })).toBeInTheDocument()
    expect(screen.getByText('Imię i nazwisko')).toBeInTheDocument()
    expect(screen.getByText('Adres e-mail')).toBeInTheDocument()
    expect(screen.getByText('Wiadomość')).toBeInTheDocument()
  })

  it('gość nie widzi pola numeru lokalu', () => {
    renderPage()

    expect(screen.queryByText('Numer lokalu')).not.toBeInTheDocument()
  })

  it('zalogowany widzi pole numeru lokalu (readonly z profilu)', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ full_name: 'Jan Kowalski', email: 'jan@example.com', apartment_number: '5' }),
    } as Response)

    renderPage(residentAuthValue)

    await waitFor(() => {
      expect(screen.getByText('Numer lokalu')).toBeInTheDocument()
    })
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

  it('czyści formularz po udanym wysłaniu', async () => {
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
})
