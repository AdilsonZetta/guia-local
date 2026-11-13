import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthProvider'
import { RequireAuth } from '@/components/RequireAuth'
import { PublicLayout } from '@/components/layout/PublicLayout'
import { AdminLayout } from '@/components/layout/AdminLayout'
import { BusinessLayout } from '@/components/layout/BusinessLayout'
import { ResidentShell } from '@/components/layout/ResidentShell'
import { HomePage } from '@/pages/public/HomePage'
import { SearchPage } from '@/pages/public/SearchPage'
import { BusinessProfilePage } from '@/pages/public/BusinessProfilePage'
import { WriteReviewPage } from '@/pages/public/WriteReviewPage'
import { ReviewSuccessPage } from '@/pages/public/ReviewSuccessPage'
import { LinkInBioPage } from '@/pages/public/LinkInBioPage'
import { SuggestPage } from '@/pages/public/SuggestPage'
import { LoginPage } from '@/pages/auth/LoginPage'
import { FavoritesPage } from '@/pages/resident/FavoritesPage'
import { MyReviewsPage } from '@/pages/resident/MyReviewsPage'
import { SuggestBusinessPage } from '@/pages/resident/SuggestBusinessPage'
import { AccountPage } from '@/pages/resident/AccountPage'
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage'
import { AdminBusinessesPage } from '@/pages/admin/AdminBusinessesPage'
import { AdminSuggestionsPage } from '@/pages/admin/AdminSuggestionsPage'
import { AdminModerationPage } from '@/pages/admin/AdminModerationPage'
import { AdminSearchesPage } from '@/pages/admin/AdminSearchesPage'
import { AdminCategoriesPage } from '@/pages/admin/AdminCategoriesPage'
import { AdminUsersPage } from '@/pages/admin/AdminUsersPage'
import { AdminSettingsPage } from '@/pages/admin/AdminSettingsPage'
import { BusinessDashboardPage } from '@/pages/business/BusinessDashboardPage'
import { BusinessProfileEditPage } from '@/pages/business/BusinessProfileEditPage'
import { BusinessServicesPage } from '@/pages/business/BusinessServicesPage'
import { BusinessReviewsPage } from '@/pages/business/BusinessReviewsPage'
import { BusinessAvailabilityPage } from '@/pages/business/BusinessAvailabilityPage'
import { BusinessLinkInBioPage } from '@/pages/business/BusinessLinkInBioPage'
import { BusinessPromoPage } from '@/pages/business/BusinessPromoPage'
import { BusinessSettingsPage } from '@/pages/business/BusinessSettingsPage'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter basename="/guia-local">
        <Routes>
          <Route path="/l/:slug" element={<LinkInBioPage />} />
          <Route element={<PublicLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/busca" element={<SearchPage />} />
            <Route path="/empresa/:slug" element={<BusinessProfilePage />} />
            <Route path="/empresa/:slug/avaliar" element={<WriteReviewPage />} />
            <Route path="/empresa/:slug/avaliar/enviada" element={<ReviewSuccessPage />} />
            <Route path="/indicar" element={<SuggestPage />} />
            <Route path="/entrar" element={<LoginPage />} />
            <Route
              path="/morador"
              element={
                <RequireAuth>
                  <ResidentShell />
                </RequireAuth>
              }
            >
              <Route index element={<Navigate to="favoritos" replace />} />
              <Route path="favoritos" element={<FavoritesPage />} />
              <Route path="avaliacoes" element={<MyReviewsPage />} />
              <Route path="indicar" element={<SuggestBusinessPage />} />
              <Route path="conta" element={<AccountPage />} />
            </Route>
          </Route>
          <Route
            path="/admin"
            element={
              <RequireAuth role="admin">
                <AdminLayout />
              </RequireAuth>
            }
          >
            <Route index element={<AdminDashboardPage />} />
            <Route path="empresas" element={<AdminBusinessesPage />} />
            <Route path="indicacoes" element={<AdminSuggestionsPage />} />
            <Route path="moderacao" element={<AdminModerationPage />} />
            <Route path="buscas" element={<AdminSearchesPage />} />
            <Route path="categorias" element={<AdminCategoriesPage />} />
            <Route path="usuarios" element={<AdminUsersPage />} />
            <Route path="configuracoes" element={<AdminSettingsPage />} />
          </Route>
          <Route
            path="/empresa-area"
            element={
              <RequireAuth role="business">
                <BusinessLayout />
              </RequireAuth>
            }
          >
            <Route index element={<Navigate to="painel" replace />} />
            <Route path="painel" element={<BusinessDashboardPage />} />
            <Route path="perfil" element={<BusinessProfileEditPage />} />
            <Route path="servicos" element={<BusinessServicesPage />} />
            <Route path="avaliacoes" element={<BusinessReviewsPage />} />
            <Route path="disponibilidade" element={<BusinessAvailabilityPage />} />
            <Route path="link" element={<BusinessLinkInBioPage />} />
            <Route path="divulgacao" element={<BusinessPromoPage />} />
            <Route path="configuracoes" element={<BusinessSettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
