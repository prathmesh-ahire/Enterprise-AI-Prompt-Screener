import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { apiClient, extractErrorMessage } from '../api/client'

interface RegisterForm {
  username: string
  email: string
  password: string
}

// todo.md Phase 25.2/25.5. Mirrors AuthController's RegisterRequest validation
// (username 3-50 chars, valid email, password min 8 chars) client-side for fast feedback;
// the server remains authoritative and its message is shown verbatim on failure (e.g.
// duplicate username -> 409).
export function RegisterPage() {
  const { register, handleSubmit, formState: { errors } } = useForm<RegisterForm>()
  const [serverError, setServerError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()

  const onSubmit = async (data: RegisterForm) => {
    setServerError(null)
    setSubmitting(true)
    try {
      await apiClient.post('/api/auth/register', data)
      navigate('/login', { state: { registered: true } })
    } catch (error) {
      setServerError(extractErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <h1>Register</h1>

      {serverError && <div className="banner banner-error">{serverError}</div>}

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="form-field">
          <label htmlFor="username">Username</label>
          <input id="username" type="text" autoComplete="username"
            {...register('username', {
              required: 'Username is required',
              minLength: { value: 3, message: 'Username must be 3-50 characters' },
              maxLength: { value: 50, message: 'Username must be 3-50 characters' },
            })} />
          {errors.username && <span className="form-field-error">{errors.username.message}</span>}
        </div>

        <div className="form-field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" autoComplete="email"
            {...register('email', {
              required: 'Email is required',
              pattern: { value: /^\S+@\S+\.\S+$/, message: 'Email must be a valid address' },
            })} />
          {errors.email && <span className="form-field-error">{errors.email.message}</span>}
        </div>

        <div className="form-field">
          <label htmlFor="password">Password</label>
          <input id="password" type="password" autoComplete="new-password"
            {...register('password', {
              required: 'Password is required',
              minLength: { value: 8, message: 'Password must be at least 8 characters' },
            })} />
          {errors.password && <span className="form-field-error">{errors.password.message}</span>}
        </div>

        <button type="submit" className="btn" disabled={submitting}>
          {submitting ? 'Creating account…' : 'Register'}
        </button>
      </form>

      <div className="form-links">
        <Link to="/login">Already have an account? Login</Link>
      </div>
    </div>
  )
}
