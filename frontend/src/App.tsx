import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
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

// todo.md Phase 24.2/24.5. Role-based restriction within the protected area (e.g.
// REVIEWER/ADMIN-only on /review, ADMIN-only on /admin/*) is left to Phase 29/31/32,
// which build those pages - this phase only guards authenticated-vs-not.
function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<DashboardRedirectPage />} />
            <Route path="/prompt" element={<PromptPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/review" element={<ReviewQueuePage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/admin/policy" element={<PolicyManagementPage />} />
            <Route path="/admin/models" element={<ModelConfigPage />} />
          </Route>

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
