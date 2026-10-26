import { lazy } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { RoleProtectedRoute } from './components/RoleProtectedRoute'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { ResetPasswordPage } from './pages/ResetPasswordPage'
import { DashboardRedirectPage } from './pages/DashboardRedirectPage'
import { PromptPage } from './pages/PromptPage'
import { HistoryPage } from './pages/HistoryPage'
import { ReviewQueuePage } from './pages/ReviewQueuePage'
import { AdminPage } from './pages/AdminPage'
import { PolicyManagementPage } from './pages/PolicyManagementPage'
import { ModelConfigPage } from './pages/ModelConfigPage'
import { NotFoundPage } from './pages/NotFoundPage'
import { PublicLayout } from './components/site/PublicLayout'
import { RouteTitle } from './components/RouteTitle'

// The seven public pages load on demand, so the sign-in pages and the app never download them.
const HomePage = lazy(() => import('./pages/public/HomePage').then((m) => ({ default: m.HomePage })))
const HowItWorksPage = lazy(() => import('./pages/public/HowItWorksPage').then((m) => ({ default: m.HowItWorksPage })))
const DetectorsPage = lazy(() => import('./pages/public/DetectorsPage').then((m) => ({ default: m.DetectorsPage })))
const ExamplesPage = lazy(() => import('./pages/public/ExamplesPage').then((m) => ({ default: m.ExamplesPage })))
const EvaluationPage = lazy(() => import('./pages/public/EvaluationPage').then((m) => ({ default: m.EvaluationPage })))
const LimitationsPage = lazy(() => import('./pages/public/LimitationsPage').then((m) => ({ default: m.LimitationsPage })))
const ArchitecturePage = lazy(() => import('./pages/public/ArchitecturePage').then((m) => ({ default: m.ArchitecturePage })))

// Route guards: ProtectedRoute (authenticated-vs-not) wraps every private route;
// RoleProtectedRoute restricts /review to REVIEWER/ADMIN and /admin, /admin/policy and
// /admin/models to ADMIN. The public pages and Not Found need no sign-in and make no API calls.
function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <RouteTitle />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />


          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<DashboardRedirectPage />} />
            <Route path="/prompt" element={<PromptPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route element={<RoleProtectedRoute allow={['REVIEWER', 'ADMIN']} />}>
              <Route path="/review" element={<ReviewQueuePage />} />
            </Route>
            <Route element={<RoleProtectedRoute allow={['ADMIN']} />}>
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/admin/policy" element={<PolicyManagementPage />} />
              <Route path="/admin/models" element={<ModelConfigPage />} />
            </Route>
          </Route>

          <Route element={<PublicLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/how-it-works" element={<HowItWorksPage />} />
            <Route path="/detectors" element={<DetectorsPage />} />
            <Route path="/examples" element={<ExamplesPage />} />
            <Route path="/evaluation" element={<EvaluationPage />} />
            <Route path="/limitations" element={<LimitationsPage />} />
            <Route path="/architecture" element={<ArchitecturePage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
