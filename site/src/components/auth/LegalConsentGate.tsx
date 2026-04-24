import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { api } from '../../lib/api'
import { formatCaughtError } from '../../lib/userFacingErrors'
import { useToast } from '../ui/Toast'

export interface ProfileLegalFields {
  needs_legal_acceptance: boolean
  current_privacy_version: string
  current_terms_version: string
  privacy_accepted_at?: string | null
  terms_accepted_at?: string | null
  privacy_version?: string | null
  terms_version?: string | null
}

type Props = { children: ReactNode }

/** Ładuje profil i blokuje panel do czasu akceptacji polityki i regulaminu portalu. */
export default function LegalConsentGate({ children }: Props) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<ProfileLegalFields | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [acceptPrivacy, setAcceptPrivacy] = useState(false)
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const fetchProfile = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const data = await api.get<ProfileLegalFields>('/profile')
      setProfile(data)
    } catch (e: unknown) {
      setLoadError(formatCaughtError(e, 'Nie udało się załadować profilu'))
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!acceptPrivacy || !acceptTerms) {
      toast('Zaznacz oba pola, aby przejść dalej', 'error')
      return
    }
    setSubmitting(true)
    try {
      const updated = await api.post<ProfileLegalFields>('/profile/legal-consent', {
        accept_privacy: true,
        accept_terms: true,
      })
      setProfile(updated)
      setAcceptPrivacy(false)
      setAcceptTerms(false)
      toast('Dziękujemy — możesz korzystać z portalu', 'success')
    } catch (err: unknown) {
      toast(formatCaughtError(err, 'Błąd zapisu zgód'), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <p className="text-slate">Ładowanie...</p>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-cream px-6">
        <div className="max-w-md rounded-[var(--radius-card)] bg-white shadow-ambient p-8 text-center space-y-4">
          <p className="text-charcoal">{loadError}</p>
          <button
            type="button"
            onClick={() => fetchProfile()}
            className="px-4 py-2 bg-sage text-white text-sm font-medium rounded-[var(--radius-button)] hover:bg-sage-light"
          >
            Spróbuj ponownie
          </button>
        </div>
      </div>
    )
  }

  if (profile?.needs_legal_acceptance) {
    const pv = profile.current_privacy_version
    const tv = profile.current_terms_version
    return (
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-charcoal/40 p-4 overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="legal-consent-title"
      >
        <div className="w-full max-w-lg rounded-[var(--radius-card)] bg-cream shadow-ambient p-6 sm:p-8 my-8">
          <h1 id="legal-consent-title" className="text-xl font-bold text-charcoal mb-2">
            Dokumenty prawne
          </h1>
          <p className="text-sm text-slate mb-6">
            Aby korzystać z portalu, zaakceptuj obowiązującą wersję polityki prywatności (wersja{' '}
            <span className="font-medium text-charcoal">{pv}</span>) oraz regulaminu portalu WM GABI (wersja{' '}
            <span className="font-medium text-charcoal">{tv}</span>).
          </p>
          <ul className="text-sm text-slate space-y-2 mb-6">
            <li>
              <a
                href="/docs/polityka-prywatnosci-rodo.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sage font-medium hover:text-sage-light underline"
              >
                Otwórz politykę prywatności i RODO (PDF)
              </a>
            </li>
            <li>
              <a
                href="/docs/regulamin-portalu-wmgabi.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sage font-medium hover:text-sage-light underline"
              >
                Otwórz regulamin portalu WM GABI (PDF)
              </a>
            </li>
          </ul>
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="flex items-start gap-3 cursor-pointer text-sm text-charcoal">
              <input
                type="checkbox"
                checked={acceptPrivacy}
                onChange={(e) => setAcceptPrivacy(e.target.checked)}
                className="mt-1 rounded border-cream-medium text-sage focus:ring-sage/30"
              />
              <span>Oświadczam, że zapoznałem(-am) się z treścią polityki prywatności i ją akceptuję.</span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer text-sm text-charcoal">
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                className="mt-1 rounded border-cream-medium text-sage focus:ring-sage/30"
              />
              <span>Oświadczam, że zapoznałem(-am) się z treścią regulaminu portalu WM GABI i go akceptuję.</span>
            </label>
            <button
              type="submit"
              disabled={submitting || !acceptPrivacy || !acceptTerms}
              className="w-full sm:w-auto px-4 py-2.5 bg-sage text-white text-sm font-medium rounded-[var(--radius-button)] hover:bg-sage-light disabled:opacity-50"
            >
              {submitting ? 'Zapisywanie…' : 'Akceptuję i przechodzę dalej'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
