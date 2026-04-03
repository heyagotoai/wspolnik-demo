import { useEffect, useState } from 'react'
import { communityInfo, emergencyContacts, contactSubjectsResident, contactSubjectsPublic } from '../data/mockData'
import { MapPinIcon, MailIcon, PhoneIcon } from '../components/ui/Icons'
import { useToast } from '../components/ui/Toast'
import { parseApiError } from '../lib/api'
import { api } from '../lib/api'
import { formatCaughtError } from '../lib/userFacingErrors'
import { useAuth } from '../hooks/useAuth'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

interface ResidentProfile {
  full_name: string
  email: string
  apartment_number: string | null
}

export default function ContactPage() {
  const { user } = useAuth()
  const isLoggedIn = !!user

  const subjects = isLoggedIn ? contactSubjectsResident : contactSubjectsPublic

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    apartment_number: '',
    subject: subjects[0],
    message: '',
  })
  const [profileLoaded, setProfileLoaded] = useState(false)
  const [sending, setSending] = useState(false)
  const { toast } = useToast()

  // Prefill danych z profilu dla zalogowanego mieszkańca
  useEffect(() => {
    if (!user) return
    api.get<ResidentProfile>('/profile')
      .then((profile) => {
        setFormData((prev) => ({
          ...prev,
          name: profile.full_name,
          email: profile.email,
          apartment_number: profile.apartment_number || '',
          subject: contactSubjectsResident[0],
        }))
        setProfileLoaded(true)
      })
      .catch(() => {
        // formularz działa też bez prefilla
        setProfileLoaded(true)
      })
  }, [user])

  // Resetuj temat przy zmianie trybu (zalogowany ↔ gość)
  useEffect(() => {
    setFormData((prev) => ({ ...prev, subject: subjects[0] }))
  }, [isLoggedIn])

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault()
    setSending(true)

    try {
      const res = await fetch(`${API_BASE}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(parseApiError(body, res.status))
      }

      toast('Wiadomość została wysłana. Dziękujemy!', 'success')
      setFormData({ name: '', email: '', apartment_number: '', subject: subjects[0], message: '' })
      setProfileLoaded(false)
    } catch (err) {
      toast(formatCaughtError(err, 'Nie udało się wysłać wiadomości.'), 'error')
    } finally {
      setSending(false)
    }
  }

  const inputClass = 'w-full px-4 py-3 bg-cream rounded-[8px] text-sm text-charcoal border border-transparent focus:border-amber-container focus:outline-none transition-colors'
  const readonlyClass = 'w-full px-4 py-3 bg-cream-dark rounded-[8px] text-sm text-slate border border-transparent cursor-default select-none'

  return (
    <>
      {/* Page hero */}
      <section className="bg-cream-dark">
        <div className="mx-auto max-w-[1280px] px-6 py-20">
          <h1 className="text-4xl md:text-5xl font-semibold text-charcoal tracking-tight mb-4">
            Kontakt
          </h1>
          <p className="text-lg text-slate max-w-xl">
            Skontaktuj się z nami — jesteśmy do Twojej dyspozycji.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-[1280px] px-6 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
          {/* Contact form */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-[24px] p-8 shadow-[0_12px_32px_rgba(45,52,54,0.05)]">
              <h2 className="text-xl font-semibold text-charcoal mb-1">
                Wyślij wiadomość
              </h2>
              {isLoggedIn ? (
                <p className="text-sm text-slate mb-6">Formularz dla mieszkańców — dane pobrane z profilu.</p>
              ) : (
                <p className="text-sm text-slate mb-6">Formularz ogólny — dla osób spoza wspólnoty.</p>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="contact-name" className="block text-sm font-medium text-charcoal mb-1.5">
                    Imię i nazwisko
                  </label>
                  {isLoggedIn && profileLoaded ? (
                    <input
                      id="contact-name"
                      type="text"
                      readOnly
                      value={formData.name}
                      className={readonlyClass}
                      title="Dane z profilu — zmień w ustawieniach profilu"
                    />
                  ) : (
                    <input
                      id="contact-name"
                      type="text"
                      required
                      maxLength={255}
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className={inputClass}
                    />
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="contact-email" className="block text-sm font-medium text-charcoal mb-1.5">
                      Adres e-mail
                    </label>
                    {isLoggedIn && profileLoaded ? (
                      <input
                        id="contact-email"
                        type="email"
                        readOnly
                        value={formData.email}
                        className={readonlyClass}
                        title="Dane z profilu"
                      />
                    ) : (
                      <input
                        id="contact-email"
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className={inputClass}
                      />
                    )}
                  </div>

                  {/* Numer lokalu — tylko dla zalogowanych */}
                  {isLoggedIn && (
                    <div>
                      <label htmlFor="contact-apartment" className="block text-sm font-medium text-charcoal mb-1.5">
                        Numer lokalu
                      </label>
                      <input
                        id="contact-apartment"
                        type="text"
                        readOnly
                        value={formData.apartment_number}
                        className={readonlyClass}
                        title="Dane z profilu"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label htmlFor="contact-subject" className="block text-sm font-medium text-charcoal mb-1.5">
                    Temat
                  </label>
                  <select
                    id="contact-subject"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className={`${inputClass} appearance-none`}
                  >
                    {subjects.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="contact-message" className="block text-sm font-medium text-charcoal mb-1.5">
                    Wiadomość
                  </label>
                  <textarea
                    id="contact-message"
                    required
                    rows={5}
                    maxLength={5000}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className={`${inputClass} resize-none`}
                  />
                </div>

                <p className="text-xs text-slate leading-relaxed">
                  Administratorem Twoich danych osobowych jest Wspólnota Mieszkaniowa „Gabi", ul. Gdańska 58, 89-604 Chojnice. Dane podane w formularzu (imię, adres e-mail, treść wiadomości) będą przetwarzane wyłącznie w celu obsługi zgłoszenia, na podstawie art. 6 ust. 1 lit. f RODO (prawnie uzasadniony interes Administratora). Masz prawo dostępu do danych, ich sprostowania, usunięcia oraz wniesienia skargi do UODO (ul. Stawki 2, Warszawa). Szczegóły: <a href="/docs/polityka-prywatnosci-rodo.pdf" className="underline hover:text-charcoal">Polityka Prywatności i RODO</a>.
                </p>

                <button
                  type="submit"
                  disabled={sending}
                  className="w-full py-3.5 bg-sage text-white rounded-[10px] font-medium text-sm hover:bg-sage-light transition-colors disabled:opacity-50"
                >
                  {sending ? 'Wysyłanie...' : 'Wyślij wiadomość'}
                </button>
              </form>
            </div>
          </div>

          {/* Contact info */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white rounded-[24px] p-7 shadow-[0_12px_32px_rgba(45,52,54,0.05)]">
              <h3 className="text-lg font-semibold text-charcoal mb-5">
                Dane kontaktowe
              </h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <MapPinIcon className="w-5 h-5 text-sage mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-charcoal">Adres</p>
                    <p className="text-sm text-slate">{communityInfo.address}</p>
                    <p className="text-sm text-slate">{communityInfo.city}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <MailIcon className="w-5 h-5 text-sage mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-charcoal">Email</p>
                    <a
                      href={`mailto:${communityInfo.email}`}
                      className="text-sm text-sage hover:text-sage-light"
                    >
                      {communityInfo.email}
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Emergency contacts */}
            <div className="bg-white rounded-[24px] p-7 shadow-[0_12px_32px_rgba(45,52,54,0.05)]">
              <h3 className="text-lg font-semibold text-charcoal mb-5 flex items-center gap-2">
                <PhoneIcon className="w-5 h-5 text-error" />
                Numery alarmowe
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {emergencyContacts.map((contact) => (
                  <div
                    key={contact.number}
                    className="bg-error-container/30 rounded-[12px] p-4 text-center"
                  >
                    <p className="text-lg font-bold text-charcoal">
                      {contact.number}
                    </p>
                    <p className="text-xs text-slate mt-1">{contact.name}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
