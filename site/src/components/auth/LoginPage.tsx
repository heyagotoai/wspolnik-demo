import { useState, useEffect } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { Navigate } from 'react-router-dom'
import { communityInfo } from '../../data/mockData'
import { logoAlt, logoSrc } from '../../demo/demoAssets'
import { useDemoBasePath } from '../../demo/useDemoBasePath'
import { MailIcon } from '../ui/Icons'
import { useToast } from '../ui/Toast'

export default function LoginPage() {
  const { user, loading, signIn } = useAuth()
  const prefix = useDemoBasePath()
  const panelHome = prefix ? `${prefix}/panel` : '/panel'
  const { toast } = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    if (sessionStorage.getItem('session_expired')) {
      sessionStorage.removeItem('session_expired')
      toast('Sesja wygasła — zaloguj się ponownie', 'error')
    }
  }, [toast])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream">
        <p className="text-slate">Ładowanie...</p>
      </div>
    )
  }

  if (user) {
    return <Navigate to={panelHome} replace />
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    const { error } = await signIn(email, password)

    if (error) {
      console.error('Supabase auth error:', error)
      setError(`${error.message} (${'status' in error ? error.status : 'brak statusu'})`)
    }

    setSubmitting(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream px-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-[var(--radius-card)] shadow-ambient p-8">
          <div className="text-center mb-8">
            <img src={logoSrc()} alt={logoAlt()} className="h-[120px] w-[120px] object-contain mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-charcoal mb-2">
              {communityInfo.name}
            </h1>
            <p className="text-slate text-sm">
              Panel mieszkańca — zaloguj się
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-charcoal mb-1">
                Email
              </label>
              <div className="relative">
                <MailIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-outline" />
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="twoj@email.pl"
                  className="w-full pl-10 pr-4 py-3 border border-outline-light rounded-[var(--radius-input)] bg-cream text-charcoal placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-sage focus:border-sage transition-colors"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-charcoal mb-1">
                Hasło
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 pr-12 border border-outline-light rounded-[var(--radius-input)] bg-cream text-charcoal placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-sage focus:border-sage transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-charcoal transition-colors text-sm"
                >
                  {showPassword ? 'Ukryj' : 'Pokaż'}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-error-container text-error text-sm px-4 py-3 rounded-[var(--radius-input)]">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 px-4 bg-sage text-white font-semibold rounded-[var(--radius-button)] hover:bg-sage-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Logowanie...' : 'Zaloguj się'}
            </button>
          </form>

          <p className="text-center text-xs text-outline mt-6">
            Dostęp tylko dla mieszkańców. Skontaktuj się z zarządcą, aby otrzymać zaproszenie.
          </p>
        </div>
      </div>
    </div>
  )
}
