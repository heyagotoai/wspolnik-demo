import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import PageLayout from './components/layout/PageLayout'
import ResidentLayout from './components/layout/ResidentLayout'
import AdminLayout from './components/layout/AdminLayout'
import HomePage from './pages/HomePage'
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
import AdminAuditLogPage from './pages/admin/AuditLogPage'
import ResidentResolutionsPage from './pages/resident/ResolutionsPage'
import ProfilePage from './pages/resident/ProfilePage'
import NotFoundPage from './pages/NotFoundPage'
import {
  CommunityRulesPage,
  GdprClausePage,
  PrivacyPolicyPage,
} from './pages/legal/LegalDemoPages'
import { AuthContext, useAuthProvider } from './hooks/useAuth'
import { ToastProvider } from './components/ui/Toast'
import { ConfirmProvider } from './components/ui/ConfirmDialog'
import { DemoGate } from './demo/DemoGate'
import { DemoFaviconEffect } from './demo/DemoFaviconEffect'

function AppRoutes() {
  return (
    <Routes>
      <Route element={<PageLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/aktualnosci" element={<NewsPage />} />
        <Route path="/dokumenty" element={<DocumentsPage />} />
        <Route path="/kontakt" element={<ContactPage />} />
        <Route path="/polityka-prywatnosci" element={<PrivacyPolicyPage />} />
        <Route path="/klauzula-rodo" element={<GdprClausePage />} />
        <Route path="/regulamin-wspolnoty" element={<CommunityRulesPage />} />
      </Route>

      <Route path="/logowanie" element={<LoginPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<ResidentLayout />}>
          <Route path="/panel" element={<DashboardPage />} />
          <Route path="/panel/ogloszenia" element={<ResidentAnnouncementsPage />} />
          <Route path="/panel/dokumenty" element={<ResidentDocumentsPage />} />
          <Route path="/panel/terminy" element={<DatesPage />} />
          <Route path="/panel/finanse" element={<FinancesPage />} />
          <Route path="/panel/glosowania" element={<ResidentResolutionsPage />} />
          <Route path="/panel/profil" element={<ProfilePage />} />
        </Route>
      </Route>

      <Route element={<AdminRoute />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<AdminDashboardPage />} />
          <Route path="/admin/mieszkancy" element={<AdminResidentsPage />} />
          <Route path="/admin/lokale" element={<AdminApartmentsPage />} />
          <Route path="/admin/ogloszenia" element={<AdminAnnouncementsPage />} />
          <Route path="/admin/dokumenty" element={<AdminDocumentsPage />} />
          <Route path="/admin/terminy" element={<AdminDatesPage />} />
          <Route path="/admin/naliczenia" element={<AdminChargesPage />} />
          <Route
            path="/admin/grupy-rozliczeniowe"
            element={<Navigate to="/admin/naliczenia?tab=grupy" replace />}
          />
          <Route path="/admin/wiadomosci" element={<AdminMessagesPage />} />
          <Route path="/admin/uchwaly" element={<AdminResolutionsPage />} />
          <Route path="/admin/dziennik" element={<AdminAuditLogPage />} />
        </Route>
      </Route>

      {/* Tryb demo — te same strony pod /demo/... */}
      <Route path="/demo">
        <Route index element={<Navigate to="panel" replace />} />
        <Route path="logowanie" element={<Navigate to="panel" replace />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<ResidentLayout />}>
            <Route path="panel" element={<DashboardPage />} />
            <Route path="panel/ogloszenia" element={<ResidentAnnouncementsPage />} />
            <Route path="panel/dokumenty" element={<ResidentDocumentsPage />} />
            <Route path="panel/terminy" element={<DatesPage />} />
            <Route path="panel/finanse" element={<FinancesPage />} />
            <Route path="panel/glosowania" element={<ResidentResolutionsPage />} />
            <Route path="panel/profil" element={<ProfilePage />} />
          </Route>
        </Route>
        <Route element={<AdminRoute />}>
          <Route element={<AdminLayout />}>
            <Route path="admin" element={<AdminDashboardPage />} />
            <Route path="admin/mieszkancy" element={<AdminResidentsPage />} />
            <Route path="admin/lokale" element={<AdminApartmentsPage />} />
            <Route path="admin/ogloszenia" element={<AdminAnnouncementsPage />} />
            <Route path="admin/dokumenty" element={<AdminDocumentsPage />} />
            <Route path="admin/terminy" element={<AdminDatesPage />} />
            <Route path="admin/naliczenia" element={<AdminChargesPage />} />
            <Route
              path="admin/grupy-rozliczeniowe"
              element={<Navigate to="../naliczenia?tab=grupy" replace />}
            />
            <Route path="admin/wiadomosci" element={<AdminMessagesPage />} />
            <Route path="admin/uchwaly" element={<AdminResolutionsPage />} />
            <Route path="admin/dziennik" element={<AdminAuditLogPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}

function AppWithAuth() {
  const auth = useAuthProvider()
  return (
    <AuthContext.Provider value={auth}>
      <DemoGate>
        <AppRoutes />
      </DemoGate>
    </AuthContext.Provider>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <DemoFaviconEffect />
      <ToastProvider>
        <ConfirmProvider>
          <AppWithAuth />
        </ConfirmProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}
