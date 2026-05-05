import { Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Applayout from './components/layout/Applayout'
import HomePage from './pages/HomePage'
import AnalysisPage from './pages/AnalysisPage'
import HistoryPage from './pages/HistoryPage'
import LoginPage from './pages/LoginPage'
import SignInPage from './pages/SignInPage'
import SignUpPage from './pages/SignUpPage'
import PricingPage from './pages/PricingPage'
import AccountPage from './pages/AccountPage'
import SuggestionDetailsPage from './pages/SuggestionDetailsPage'
import WorkspacesPage from './pages/WorkspacesPage'
import WorkspaceDetailPage from './pages/WorkspaceDetailPage'
import BlogListPage from './pages/BlogListPage'
import BlogPostPage from './pages/BlogPostPage'
import AdminPage from './pages/AdminPage'

// PrivateRoute: Redirect to login if not authenticated
const PrivateRoute = () => {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <Outlet /> : <Navigate to="/signin" replace />
}

// PublicRoute: Redirect to home if already authenticated
const PublicRoute = () => {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <Navigate to="/home" replace /> : <Outlet />
}

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public blog (no auth required, accessible signed-in or out) */}
      <Route path="/blog" element={<BlogListPage />} />
      <Route path="/blog/:slug" element={<BlogPostPage />} />

      {/* Public Routes */}
      <Route element={<PublicRoute />}>
        {/* Default landing → SignIn (the original LoginPage is kept available
            at /login for backward compatibility) */}
        <Route path="/" element={<SignInPage />} />
        <Route path="/signin" element={<SignInPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/login" element={<LoginPage />} />
      </Route>

      {/* Private Routes (Wrapped in PrivateRoute and AppLayout) */}
      <Route element={<PrivateRoute />}>
        {/* Pricing is reachable both inside and outside the AppLayout —
            outside so newly-registered users without a plan see a clean page. */}
        <Route path="/pricing" element={<PricingPage />} />

        <Route element={<Applayout />}>
          <Route path="/suggestion/:id" element={<SuggestionDetailsPage />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/analysis/:id" element={<AnalysisPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/workspaces" element={<WorkspacesPage />} />
          <Route path="/workspaces/:id" element={<WorkspaceDetailPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route
            path="/connect-erp"
            element={
              <div className="max-w-xl mx-auto px-6 py-20 text-center text-white/40">
                ERP connection coming soon.
              </div>
            }
          />
          {/* Catch-all: Redirect to home or another page */}
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Route>
      </Route>
    </Routes>
  )
}
