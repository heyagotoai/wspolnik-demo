import { BrowserRouter, Routes, Route } from 'react-router-dom'
import PageLayout from './components/layout/PageLayout'
import HomePage from './pages/HomePage'
import AboutPage from './pages/AboutPage'
import NewsPage from './pages/NewsPage'
import DocumentsPage from './pages/DocumentsPage'
import ContactPage from './pages/ContactPage'
import LoginPage from './components/auth/LoginPage'
import ProtectedRoute from './components/auth/ProtectedRoute'
import AdminRoute from './components/auth/AdminRoute'
import { AuthContext, useAuthProvider } from './hooks/useAuth'

function AppRoutes() {
  return (
    <Routes>
      {/* Strony publiczne z layoutem */}
      <Route element={<PageLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/o-nas" element={<AboutPage />} />
        <Route path="/aktualnosci" element={<NewsPage />} />
        <Route path="/dokumenty" element={<DocumentsPage />} />
        <Route path="/kontakt" element={<ContactPage />} />
      </Route>

      {/* Logowanie — bez layoutu */}
      <Route path="/logowanie" element={<LoginPage />} />

      {/* Panel mieszkańca — wymaga zalogowania */}
      <Route element={<ProtectedRoute />}>
        <Route path="/panel" element={<ResidentDashboard />} />
      </Route>

      {/* Panel admina — wymaga roli admin */}
      <Route element={<AdminRoute />}>
        <Route path="/admin" element={<AdminDashboard />} />
      </Route>
    </Routes>
  )
}

// Tymczasowe placeholdery — zostaną zastąpione właściwymi stronami w Fazie 3-4
function ResidentDashboard() {
  return (
    <div className="min-h-screen bg-cream p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-charcoal mb-4">Panel mieszkańca</h1>
        <p className="text-slate">Strona w budowie. Wkrótce znajdziesz tu swoje naliczenia, wpłaty i dokumenty.</p>
      </div>
    </div>
  )
}

function AdminDashboard() {
  return (
    <div className="min-h-screen bg-cream p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-charcoal mb-4">Panel administratora</h1>
        <p className="text-slate">Strona w budowie. Wkrótce znajdziesz tu zarządzanie mieszkańcami, naliczeniami i dokumentami.</p>
      </div>
    </div>
  )
}

export default function App() {
  const auth = useAuthProvider()

  return (
    <AuthContext.Provider value={auth}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthContext.Provider>
  )
}
