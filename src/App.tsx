import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/context/AuthProvider'
import { RequireAuth } from '@/components/RequireAuth'
import { PublicLayout } from '@/components/layout/PublicLayout'
import { HomePage } from '@/pages/public/HomePage'
import { SearchPage } from '@/pages/public/SearchPage'
import { RouteFallback } from '@/components/ui/Skeleton'

const BusinessProfilePage = lazy(() =>
  import('@/pages/public/BusinessProfilePage').then((module) => ({
    default: module.BusinessProfilePage,
  })),
)
const WriteReviewPage = lazy(() =>
  import('@/pages/public/WriteReviewPage').then((module) => ({
    default: module.WriteReviewPage,
  })),
)
const ReviewSuccessPage = lazy(() =>
  import('@/pages/public/ReviewSuccessPage').then((module) => ({
    default: module.ReviewSuccessPage,
  })),
)
const LinkInBioPage = lazy(() =>
  import('@/pages/public/LinkInBioPage').then((module) => ({
    default: module.LinkInBioPage,
  })),
)
const SuggestPage = lazy(() =>
  import('@/pages/public/SuggestPage').then((module) => ({
    default: module.SuggestPage,
  })),
)
const LoginPage = lazy(() =>
  import('@/pages/auth/LoginPage').then((module) => ({ default: module.LoginPage })),
)
const FavoritesPage = lazy(() =>
  import('@/pages/resident/FavoritesPage').then((module) => ({
    default: module.FavoritesPage,
  })),
)
const MyReviewsPage = lazy(() =>
  import('@/pages/resident/MyReviewsPage').then((module) => ({
    default: module.MyReviewsPage,
  })),
)
const SuggestBusinessPage = lazy(() =>
  import('@/pages/resident/SuggestBusinessPage').then((module) => ({
    default: module.SuggestBusinessPage,
  })),
)
const AccountPage = lazy(() =>
  import('@/pages/resident/AccountPage').then((module) => ({
    default: module.AccountPage,
  })),
)
const AdminLayout = lazy(() =>
  import('@/components/layout/AdminLayout').then((module) => ({
    default: module.AdminLayout,
  })),
)
const AdminDashboardPage = lazy(() =>
  import('@/pages/admin/AdminDashboardPage').then((module) => ({
    default: module.AdminDashboardPage,
  })),
)
const AdminBusinessesPage = lazy(() =>
  import('@/pages/admin/AdminBusinessesPage').then((module) => ({
    default: module.AdminBusinessesPage,
  })),
)
const AdminSuggestionsPage = lazy(() =>
  import('@/pages/admin/AdminSuggestionsPage').then((module) => ({
    default: module.AdminSuggestionsPage,
  })),
)
const AdminModerationPage = lazy(() =>
  import('@/pages/admin/AdminModerationPage').then((module) => ({
    default: module.AdminModerationPage,
  })),
)
const AdminSearchesPage = lazy(() =>
  import('@/pages/admin/AdminSearchesPage').then((module) => ({
    default: module.AdminSearchesPage,
  })),
)
const AdminCategoriesPage = lazy(() =>
  import('@/pages/admin/AdminCategoriesPage').then((module) => ({
    default: module.AdminCategoriesPage,
  })),
)
const AdminUsersPage = lazy(() =>
  import('@/pages/admin/AdminUsersPage').then((module) => ({
    default: module.AdminUsersPage,
  })),
)
const AdminSettingsPage = lazy(() =>
  import('@/pages/admin/AdminSettingsPage').then((module) => ({
    default: module.AdminSettingsPage,
  })),
)
const BusinessLayout = lazy(() =>
  import('@/components/layout/BusinessLayout').then((module) => ({
    default: module.BusinessLayout,
  })),
)
const BusinessDashboardPage = lazy(() =>
  import('@/pages/business/BusinessDashboardPage').then((module) => ({
    default: module.BusinessDashboardPage,
  })),
)
const BusinessProfileEditPage = lazy(() =>
  import('@/pages/business/BusinessProfileEditPage').then((module) => ({
    default: module.BusinessProfileEditPage,
  })),
)
const BusinessServicesPage = lazy(() =>
  import('@/pages/business/BusinessServicesPage').then((module) => ({
    default: module.BusinessServicesPage,
  })),
)
const BusinessReviewsPage = lazy(() =>
  import('@/pages/business/BusinessReviewsPage').then((module) => ({
    default: module.BusinessReviewsPage,
  })),
)
const BusinessAvailabilityPage = lazy(() =>
  import('@/pages/business/BusinessAvailabilityPage').then((module) => ({
    default: module.BusinessAvailabilityPage,
  })),
)
const BusinessLinkInBioPage = lazy(() =>
  import('@/pages/business/BusinessLinkInBioPage').then((module) => ({
    default: module.BusinessLinkInBioPage,
  })),
)
const BusinessPromoPage = lazy(() =>
  import('@/pages/business/BusinessPromoPage').then((module) => ({
    default: module.BusinessPromoPage,
  })),
)
const BusinessSettingsPage = lazy(() =>
  import('@/pages/business/BusinessSettingsPage').then((module) => ({
    default: module.BusinessSettingsPage,
  })),
)
const ResidentShell = lazy(() =>
  import('@/components/layout/ResidentShell').then((module) => ({
    default: module.ResidentShell,
  })),
)

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter basename="/guia-local">
        <Routes>
          <Route
            path="/l/:slug"
            element={
              <Suspense fallback={<RouteFallback />}>
                <LinkInBioPage />
              </Suspense>
            }
          />
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
            <Route path="empresas/indicacoes" element={<AdminSuggestionsPage />} />
            <Route path="avaliacoes" element={<AdminModerationPage />} />
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
              <RequireAuth>
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
