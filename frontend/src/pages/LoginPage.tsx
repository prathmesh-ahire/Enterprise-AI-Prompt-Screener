import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { apiClient, extractErrorMessage } from '../api/client'
import { useAuth, type Role } from '../AuthContext'

interface LoginForm {
  username: string
  password: string
}

interface AuthResponse {
  token: string
  username: string
  role: Role
}

// todo.md Phase 25.1/25.5.
export function LoginPage() {
  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>()
  const [serverError, setServerError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const justRegistered = Boolean((location.state as { registered?: boolean } | null)?.registered)

  const onSubmit = async (data: LoginForm) => {
    setServerError(null)
    setSubmitting(true)
    try {
      const response = await apiClient.post<AuthResponse>('/api/auth/login', data)
      const { token, username, role } = response.data
      login(token, username, role)
      navigate('/dashboard')
    } catch (error) {
      setServerError(extractErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <h1>Login</h1>

      {justRegistered && (
        <div className="banner banner-success">Account created. Please log in.</div>
      )}
      {serverError && <div className="banner banner-error">{serverError}</div>}

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="form-field">
          <label htmlFor="username">Username</label>
          <input id="username" type="text" autoComplete="username"
            {...register('username', { required: 'Username is required' })} />
          {errors.username && <span className="form-field-error">{errors.username.message}</span>}
        </div>

        <div className="form-field">
          <label htmlFor="password">Password</label>
          <input id="password" type="password" autoComplete="current-password"
            {...register('password', { required: 'Password is required' })} />
          {errors.password && <span className="form-field-error">{errors.password.message}</span>}
        </div>

        <button type="submit" className="btn" disabled={submitting}>
          {submitting ? 'Logging in…' : 'Login'}
        </button>
      </form>

      <div className="form-links">
        <Link to="/register">Create an account</Link>
        <Link to="/forgot-password">Forgot password?</Link>
      </div>
    </div>
  )
}
