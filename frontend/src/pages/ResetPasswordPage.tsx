import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useSearchParams } from 'react-router-dom'
import { apiClient, extractErrorMessage } from '../api/client'
import { AuthLayout } from '../components/AuthLayout'
import { Button } from '../components/Button'
import { FieldError } from '../components/FieldError'
import { PageMessage } from '../components/PageMessage'

interface ResetPasswordForm {
  token: string
  newPassword: string
}

// Pre-fills the token from a ?token= query param, in case a real
// reset link ever carries one - v1 doesn't send one, so it's normally typed
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
      <AuthLayout
        title="Password reset"
        subtitle="You can sign in with your new password now."
        links={<Link to="/login" className="ps-link">Go to sign in</Link>}
      >
        <PageMessage kind="success">Your password has been reset.</PageMessage>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Reset password"
      subtitle="Paste the token you were issued, then choose a new password."
      links={(
        <>
          <Link to="/login" className="ps-link">Back to sign in</Link>
          <Link to="/forgot-password" className="ps-link">Need a token?</Link>
        </>
      )}
    >
      {serverError && <PageMessage kind="error">{serverError}</PageMessage>}

      <form className="ps-stack" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="ps-field">
          <label className="ps-label" htmlFor="token">Reset token</label>
          <input id="token" type="text" className="ps-input ps-mono"
            aria-invalid={errors.token ? true : undefined}
            aria-describedby={errors.token ? 'token-error' : undefined}
            {...register('token', { required: 'Paste the reset token from the backend console.' })} />
          <FieldError id="token-error" message={errors.token?.message} />
        </div>

        <div className="ps-field">
          <label className="ps-label" htmlFor="newPassword">New password</label>
          <input id="newPassword" type="password" autoComplete="new-password" className="ps-input"
            aria-invalid={errors.newPassword ? true : undefined}
            aria-describedby={errors.newPassword ? 'newPassword-error' : 'newPassword-help'}
            {...register('newPassword', {
              required: 'Choose a new password of at least 8 characters.',
              minLength: { value: 8, message: 'Use at least 8 characters.' },
            })} />
          {errors.newPassword
            ? <FieldError id="newPassword-error" message={errors.newPassword.message} />
            : <p id="newPassword-help" className="ps-help">At least 8 characters.</p>}
        </div>

        <Button type="submit" loading={submitting} className="auth-submit">
          {submitting ? 'Resetting…' : 'Reset password'}
        </Button>
      </form>
    </AuthLayout>
  )
}
