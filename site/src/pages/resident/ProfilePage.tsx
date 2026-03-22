import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { useToast } from '../../components/ui/Toast'
import { UserIcon } from '../../components/ui/Icons'

interface Profile {
  id: string
  email: string
  full_name: string
  apartment_number: string | null
  role: string
  is_active: boolean
  created_at: string
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  // Edit name
  const [editingName, setEditingName] = useState(false)
  const [newName, setNewName] = useState('')
  const [savingName, setSavingName] = useState(false)

  // Change password
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)
  const [showCurrentPw, setShowCurrentPw] = useState(false)
  const [showNewPw, setShowNewPw] = useState(false)

  const { toast } = useToast()

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await api.get<Profile>('/profile')
        setProfile(data)
        setNewName(data.full_name)
      } catch {
        toast('Błąd ładowania profilu', 'error')
      } finally {
        setLoading(false)
      }
    }
    fetchProfile()
  }, [])

  const handleSaveName = async () => {
    if (!newName.trim()) {
      toast('Imię i nazwisko nie może być puste', 'error')
      return
    }
    setSavingName(true)
    try {
      const updated = await api.patch<Profile>('/profile', { full_name: newName.trim() })
      setProfile(updated)
      setEditingName(false)
      toast('Dane zostały zaktualizowane', 'success')
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : 'Błąd zapisu', 'error')
    } finally {
      setSavingName(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (newPassword.length < 6) {
      toast('Nowe hasło musi mieć minimum 6 znaków', 'error')
      return
    }
    if (newPassword !== confirmPassword) {
      toast('Hasła nie są identyczne', 'error')
      return
    }

    setSavingPassword(true)
    try {
      await api.post('/profile/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
      })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      toast('Hasło zostało zmienione', 'success')
    } catch (e: unknown) {
      toast(e instanceof Error ? e.message : 'Błąd zmiany hasła', 'error')
    } finally {
      setSavingPassword(false)
    }
  }

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('pl-PL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })

  const roleLabel = (role: string) =>
    role === 'admin' ? 'Administrator' : 'Mieszkaniec'

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-slate">Ładowanie...</p>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-[var(--radius-card)] shadow-ambient p-8 text-center">
          <p className="text-slate">Nie znaleziono profilu.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-charcoal">Mój profil</h1>

      {/* Profile info card */}
      <div className="bg-white rounded-[var(--radius-card)] shadow-ambient p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-full bg-sage-pale/40 flex items-center justify-center">
            <UserIcon className="w-7 h-7 text-sage" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-charcoal">{profile.full_name}</h2>
            <p className="text-sm text-slate">{profile.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Name */}
          <div>
            <label className="block text-xs text-outline uppercase tracking-wider mb-1">
              Imię i nazwisko
            </label>
            {editingName ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="flex-1 px-3 py-2 border border-cream-medium rounded-[var(--radius-input)] text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage"
                  autoFocus
                />
                <button
                  onClick={handleSaveName}
                  disabled={savingName}
                  className="px-3 py-2 bg-sage text-white text-sm font-medium rounded-[var(--radius-button)] hover:bg-sage-light disabled:opacity-50"
                >
                  {savingName ? '...' : 'Zapisz'}
                </button>
                <button
                  onClick={() => {
                    setEditingName(false)
                    setNewName(profile.full_name)
                  }}
                  className="px-3 py-2 bg-cream text-slate text-sm font-medium rounded-[var(--radius-button)] hover:bg-cream-deep"
                >
                  Anuluj
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <p className="text-sm text-charcoal font-medium">{profile.full_name}</p>
                <button
                  onClick={() => setEditingName(true)}
                  className="text-xs text-sage hover:text-sage-light font-medium"
                >
                  Edytuj
                </button>
              </div>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs text-outline uppercase tracking-wider mb-1">
              Adres e-mail
            </label>
            <p className="text-sm text-charcoal font-medium">{profile.email}</p>
          </div>

          {/* Apartment */}
          <div>
            <label className="block text-xs text-outline uppercase tracking-wider mb-1">
              Numer lokalu
            </label>
            <p className="text-sm text-charcoal font-medium">
              {profile.apartment_number || <span className="text-slate italic">Nie przypisano</span>}
            </p>
          </div>

          {/* Role */}
          <div>
            <label className="block text-xs text-outline uppercase tracking-wider mb-1">
              Rola
            </label>
            <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${
              profile.role === 'admin'
                ? 'bg-amber-light/30 text-amber'
                : 'bg-sage-pale/40 text-sage'
            }`}>
              {roleLabel(profile.role)}
            </span>
          </div>

          {/* Member since */}
          <div>
            <label className="block text-xs text-outline uppercase tracking-wider mb-1">
              Konto od
            </label>
            <p className="text-sm text-charcoal font-medium">{formatDate(profile.created_at)}</p>
          </div>
        </div>
      </div>

      {/* Change password card */}
      <div className="bg-white rounded-[var(--radius-card)] shadow-ambient p-6">
        <h2 className="text-base font-semibold text-charcoal mb-4">Zmiana hasła</h2>

        <form onSubmit={handleChangePassword} className="space-y-4 max-w-sm">
          {/* Current password */}
          <div>
            <label className="block text-sm text-slate mb-1">Obecne hasło</label>
            <div className="relative">
              <input
                type={showCurrentPw ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="w-full px-3 py-2 border border-cream-medium rounded-[var(--radius-input)] text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage pr-10"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPw(!showCurrentPw)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-outline hover:text-slate text-xs"
              >
                {showCurrentPw ? 'Ukryj' : 'Pokaż'}
              </button>
            </div>
          </div>

          {/* New password */}
          <div>
            <label className="block text-sm text-slate mb-1">Nowe hasło</label>
            <div className="relative">
              <input
                type={showNewPw ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-3 py-2 border border-cream-medium rounded-[var(--radius-input)] text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNewPw(!showNewPw)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-outline hover:text-slate text-xs"
              >
                {showNewPw ? 'Ukryj' : 'Pokaż'}
              </button>
            </div>
            <p className="text-xs text-outline mt-1">Minimum 6 znaków</p>
          </div>

          {/* Confirm password */}
          <div>
            <label className="block text-sm text-slate mb-1">Powtórz nowe hasło</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-3 py-2 border border-cream-medium rounded-[var(--radius-input)] text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-sage/30 focus:border-sage"
            />
          </div>

          <button
            type="submit"
            disabled={savingPassword || !currentPassword || !newPassword || !confirmPassword}
            className="px-4 py-2 bg-sage text-white text-sm font-medium rounded-[var(--radius-button)] hover:bg-sage-light disabled:opacity-50 transition-colors"
          >
            {savingPassword ? 'Zmieniam...' : 'Zmień hasło'}
          </button>
        </form>
      </div>
    </div>
  )
}
