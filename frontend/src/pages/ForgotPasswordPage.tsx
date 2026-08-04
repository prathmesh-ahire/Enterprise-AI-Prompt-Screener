import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { apiClient, extractErrorMessage } from '../api/client'

interface ForgotPasswordForm {
  email: string
}

// todo.md Phase 25.3 - v1 has no real email service (Phase 5.2.1), so the reset token is
// only ever logged to the backend console. The backend's own response message is generic
// by design (anti-enumeration) - this page just adds the "where to actually find it" hint
// on top, since the backend message alone doesn't mention the console.
export function ForgotPasswordPage() {
  const { register, handleSubmit, formState: { errors } } = useForm<ForgotPasswordForm>()
  const [message, setMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const onSubmit = async (data: ForgotPasswordForm) => {
    setSubmitting(true)
    try {
      const response = await apiClient.post<{ message: string }>('/api/auth/forgot-password', data)
      setMessage(response.data.message)
    } catch (error) {
      setMessage(extractErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="auth-page">
      <h1>Forgot Password</h1>

      {message && (
        <div className="banner banner-success">
          {message} This demo has no real email service — check the backend console output
          for your reset token, then use it on the Reset Password page.
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="form-field">
          <label htmlFor="email">Email</label>
          <input id="email" type="email" autoComplete="email"
            {...register('email', {
              required: 'Email is required',
              pattern: { value: /^\S+@\S+\.\S+$/, message: 'Email must be a valid address' },
            })} />
          {errors.email && <span className="form-field-error">{errors.email.message}</span>}
        </div>

        <button type="submit" className="btn" disabled={submitting}>
          {submitting ? 'Sending…' : 'Send reset link'}
        </button>
      </form>

      <div className="form-links">
        <Link to="/login">Back to login</Link>
        <Link to="/reset-password">Have a token?</Link>
      </div>
    </div>
  )
}
