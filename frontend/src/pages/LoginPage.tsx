import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { apiClient, extractErrorMessage } from '../api/client'
import { AuthLayout } from '../components/AuthLayout'
import { Button } from '../components/Button'
import { FieldError } from '../components/FieldError'
import { PageMessage } from '../components/PageMessage'
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
    <AuthLayout
      title="Sign in"
      subtitle="Use your account to submit and review screened prompts."
      links={(
        <>
          <Link to="/forgot-password" className="ps-link">Forgot password?</Link>
          <Link to="/register" className="ps-link">Create an account</Link>
        </>
      )}
    >
      {justRegistered && <PageMessage kind="success">Account created. Please sign in.</PageMessage>}
      {serverError && <PageMessage kind="error">{serverError}</PageMessage>}

      <form className="ps-stack" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="ps-field">
          <label className="ps-label" htmlFor="username">Username</label>
          <input id="username" type="text" autoComplete="username" className="ps-input"
            aria-invalid={errors.username ? true : undefined}
            aria-describedby={errors.username ? 'username-error' : undefined}
            {...register('username', { required: 'Enter your username.' })} />
          <FieldError id="username-error" message={errors.username?.message} />
        </div>

        <div className="ps-field">
          <label className="ps-label" htmlFor="password">Password</label>
          <input id="password" type="password" autoComplete="current-password" className="ps-input"
            aria-invalid={errors.password ? true : undefined}
            aria-describedby={errors.password ? 'password-error' : undefined}
            {...register('password', { required: 'Enter your password.' })} />
          <FieldError id="password-error" message={errors.password?.message} />
        </div>

        <Button type="submit" loading={submitting} className="auth-submit">
          {submitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </AuthLayout>
  )
}
