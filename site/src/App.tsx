import { BrowserRouter, Routes, Route } from 'react-router-dom'
import PageLayout from './components/layout/PageLayout'
import ResidentLayout from './components/layout/ResidentLayout'
import AdminLayout from './components/layout/AdminLayout'
import HomePage from './pages/HomePage'
import AboutPage from './pages/AboutPage'
import NewsPage from './pages/NewsPage'
import DocumentsPage from './pages/DocumentsPage'
import ContactPage from './pages/ContactPage'
import LoginPage from './components/auth/LoginPage'
import ProtectedRoute from './components/auth/ProtectedRoute'
import AdminRoute from './components/auth/AdminRoute'
import DashboardPage from './pages/resident/DashboardPage'
import ResidentAnnouncementsPage from './pages/resident/AnnouncementsPage'
import ResidentDocumentsPage from './pages/resident/DocumentsPage'
import DatesPage from './pages/resident/DatesPage'
import FinancesPage from './pages/resident/FinancesPage'
import AdminDashboardPage from './pages/admin/DashboardPage'
import AdminResidentsPage from './pages/admin/ResidentsPage'
import AdminAnnouncementsPage from './pages/admin/AnnouncementsPage'
import AdminDocumentsPage from './pages/admin/DocumentsPage'
import AdminDatesPage from './pages/admin/DatesPage'
import AdminChargesPage from './pages/admin/ChargesPage'
import AdminApartmentsPage from './pages/admin/ApartmentsPage'
import AdminMessagesPage from './pages/admin/MessagesPage'
import AdminResolutionsPage from './pages/admin/ResolutionsPage'
import ResidentResolutionsPage from './pages/resident/ResolutionsPage'
import { AuthContext, useAuthProvider } from './hooks/useAuth'
import { ToastProvider } from './components/ui/Toast'
import { ConfirmProvider } from './components/ui/ConfirmDialog'

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
        <Route element={<ResidentLayout />}>
          <Route path="/panel" element={<DashboardPage />} />
          <Route path="/panel/ogloszenia" element={<ResidentAnnouncementsPage />} />
          <Route path="/panel/dokumenty" element={<ResidentDocumentsPage />} />
          <Route path="/panel/terminy" element={<DatesPage />} />
          <Route path="/panel/finanse" element={<FinancesPage />} />
          <Route path="/panel/glosowania" element={<ResidentResolutionsPage />} />
        </Route>
      </Route>

      {/* Panel admina — wymaga roli admin */}
      <Route element={<AdminRoute />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/admin/mieszkancy" element={<AdminResidentsPage />} />
          <Route path="/admin/lokale" element={<AdminApartmentsPage />} />
          <Route path="/admin/ogloszenia" element={<AdminAnnouncementsPage />} />
          <Route path="/admin/dokumenty" element={<AdminDocumentsPage />} />
          <Route path="/admin/terminy" element={<AdminDatesPage />} />
          <Route path="/admin/naliczenia" element={<AdminChargesPage />} />
          <Route path="/admin/wiadomosci" element={<AdminMessagesPage />} />
          <Route path="/admin/uchwaly" element={<AdminResolutionsPage />} />
        </Route>
      </Route>
    </Routes>
  )
}

export default function App() {
  const auth = useAuthProvider()

  return (
    <AuthContext.Provider value={auth}>
      <ToastProvider>
        <ConfirmProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </ConfirmProvider>
      </ToastProvider>
    </AuthContext.Provider>
  )
}
