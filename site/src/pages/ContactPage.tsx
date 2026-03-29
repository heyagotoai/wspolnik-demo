import { useState } from 'react'
import { communityInfo, emergencyContacts, contactSubjects } from '../data/mockData'
import { MapPinIcon, MailIcon, PhoneIcon } from '../components/ui/Icons'
import { useToast } from '../components/ui/Toast'
import { parseApiError } from '../lib/api'
import { formatCaughtError } from '../lib/userFacingErrors'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    apartment_number: '',
    subject: contactSubjects[0],
    message: '',
  })
  const [sending, setSending] = useState(false)
  const { toast } = useToast()

  async function handleSubmit(e: React.FormEvent) {
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
      setFormData({ name: '', email: '', apartment_number: '', subject: contactSubjects[0], message: '' })
    } catch (err) {
      toast(formatCaughtError(err, 'Nie udało się wysłać wiadomości.'), 'error')
    } finally {
      setSending(false)
    }
  }

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
              <h2 className="text-xl font-semibold text-charcoal mb-6">
                Wyślij wiadomość
              </h2>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="contact-name" className="block text-sm font-medium text-charcoal mb-1.5">
                    Imię i nazwisko
                  </label>
                  <input
                    id="contact-name"
                    type="text"
                    required
                    maxLength={255}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 bg-cream rounded-[8px] text-sm text-charcoal border border-transparent focus:border-amber-container focus:outline-none transition-colors"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="contact-email" className="block text-sm font-medium text-charcoal mb-1.5">
                      Adres e-mail
                    </label>
                    <input
                      id="contact-email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-3 bg-cream rounded-[8px] text-sm text-charcoal border border-transparent focus:border-amber-container focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label htmlFor="contact-apartment" className="block text-sm font-medium text-charcoal mb-1.5">
                      Numer mieszkania <span className="text-slate font-normal">(opcjonalne)</span>
                    </label>
                    <input
                      id="contact-apartment"
                      type="text"
                      maxLength={20}
                      value={formData.apartment_number}
                      onChange={(e) => setFormData({ ...formData, apartment_number: e.target.value })}
                      className="w-full px-4 py-3 bg-cream rounded-[8px] text-sm text-charcoal border border-transparent focus:border-amber-container focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="contact-subject" className="block text-sm font-medium text-charcoal mb-1.5">
                    Temat
                  </label>
                  <select
                    id="contact-subject"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-4 py-3 bg-cream rounded-[8px] text-sm text-charcoal border border-transparent focus:border-amber-container focus:outline-none transition-colors appearance-none"
                  >
                    {contactSubjects.map((s) => (
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
                    className="w-full px-4 py-3 bg-cream rounded-[8px] text-sm text-charcoal border border-transparent focus:border-amber-container focus:outline-none transition-colors resize-none"
                  />
                </div>

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
