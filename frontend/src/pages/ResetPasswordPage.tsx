import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useSearchParams } from 'react-router-dom'
import { apiClient, extractErrorMessage } from '../api/client'

interface ResetPasswordForm {
  token: string
  newPassword: string
}

// todo.md Phase 25.4. Pre-fills the token from a ?token= query param, in case a real
// reset link ever carries one - v1 doesn't send one (Phase 5.2.1), so it's normally typed
// in by hand from the backend console log.
export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const { register, handleSubmit, formState: { errors } } = useForm<ResetPasswordForm>({
    defaultValues: { token: searchParams.get('token') ?? '' },
  })
  const [serverError, setServerError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const onSubmit = async (data: ResetPasswordForm) => {
    setServerError(null)
    setSubmitting(true)
    try {
      await apiClient.post('/api/auth/reset-password', data)
      setSuccess(true)
    } catch (error) {
      setServerError(extractErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="auth-page">
        <h1>Reset Password</h1>
        <div className="banner banner-success">
          Password has been reset successfully. <Link to="/login">Go to login</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <h1>Reset Password</h1>

      {serverError && <div className="banner banner-error">{serverError}</div>}

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="form-field">
          <label htmlFor="token">Reset token</label>
          <input id="token" type="text"
            {...register('token', { required: 'Reset token is required' })} />
          {errors.token && <span className="form-field-error">{errors.token.message}</span>}
        </div>

        <div className="form-field">
          <label htmlFor="newPassword">New password</label>
          <input id="newPassword" type="password" autoComplete="new-password"
            {...register('newPassword', {
              required: 'New password is required',
              minLength: { value: 8, message: 'Password must be at least 8 characters' },
            })} />
          {errors.newPassword && <span className="form-field-error">{errors.newPassword.message}</span>}
        </div>

        <button type="submit" className="btn" disabled={submitting}>
          {submitting ? 'Resetting…' : 'Reset password'}
        </button>
      </form>

      <div className="form-links">
        <Link to="/login">Back to login</Link>
      </div>
    </div>
  )
}
