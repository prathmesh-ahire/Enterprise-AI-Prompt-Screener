import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { apiClient, extractErrorMessage } from '../api/client'
import { AuthLayout } from '../components/AuthLayout'
import { Button } from '../components/Button'
import { FieldError } from '../components/FieldError'
import { PageMessage } from '../components/PageMessage'

interface ForgotPasswordForm {
  email: string
}

// V1 has no real email service, so the reset token is
// only ever logged to the backend console. The backend's own response message is generic
// by design (anti-enumeration) - this page just adds the "where to actually find it" hint
// on top, since the backend message alone doesn't mention the console.
export function ForgotPasswordPage() {
  const { register, handleSubmit, formState: { errors } } = useForm<ForgotPasswordForm>()
  const [message, setMessage] = useState<string | null>(null)
  const [requestError, setRequestError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const onSubmit = async (data: ForgotPasswordForm) => {
    setSubmitting(true)
    setMessage(null)
    setRequestError(null)
    try {
      const response = await apiClient.post<{ message: string }>('/api/auth/forgot-password', data)
      setMessage(response.data.message)
    } catch (error) {
      setRequestError(extractErrorMessage(error))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="Forgot password"
      subtitle="Enter your email and a reset token will be issued."
      links={(
        <>
          <Link to="/login" className="ps-link">Back to sign in</Link>
          <Link to="/reset-password" className="ps-link">Have a token?</Link>
        </>
      )}
    >
      {message && (
        <PageMessage kind="success">
          {message} There is no email service on this machine: the reset token is printed in the
          backend console. Use it on the Reset password page.
        </PageMessage>
      )}
      {requestError && <PageMessage kind="error">{requestError}</PageMessage>}

      <form className="ps-stack" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="ps-field">
          <label className="ps-label" htmlFor="email">Email</label>
          <input id="email" type="email" autoComplete="email" className="ps-input"
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? 'email-error' : undefined}
            {...register('email', {
              required: 'Enter the email address on your account.',
              pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a full email address, such as name@example.com.' },
            })} />
          <FieldError id="email-error" message={errors.email?.message} />
        </div>

        <Button type="submit" loading={submitting} className="auth-submit">
          {submitting ? 'Sending…' : 'Send reset token'}
        </Button>
      </form>
    </AuthLayout>
  )
}
