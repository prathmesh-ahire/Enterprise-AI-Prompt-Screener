import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { apiClient, extractErrorMessage } from '../api/client'
import { AuthLayout } from '../components/AuthLayout'
import { Button } from '../components/Button'
import { FieldError } from '../components/FieldError'
import { PageMessage } from '../components/PageMessage'

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
    <AuthLayout
      title="Create an account"
      subtitle="New accounts get the standard user role and can submit prompts straight away."
      links={<Link to="/login" className="ps-link">Already have an account? Sign in</Link>}
    >
      {serverError && <PageMessage kind="error">{serverError}</PageMessage>}

      <form className="ps-stack" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="ps-field">
          <label className="ps-label" htmlFor="username">Username</label>
          <input id="username" type="text" autoComplete="username" className="ps-input"
            aria-invalid={errors.username ? true : undefined}
            aria-describedby={errors.username ? 'username-error' : undefined}
            {...register('username', {
              required: 'Choose a username of 3 to 50 characters.',
              minLength: { value: 3, message: 'Use at least 3 characters (50 at most).' },
              maxLength: { value: 50, message: 'Use 50 characters at most.' },
            })} />
          <FieldError id="username-error" message={errors.username?.message} />
        </div>

        <div className="ps-field">
          <label className="ps-label" htmlFor="email">Email</label>
          <input id="email" type="email" autoComplete="email" className="ps-input"
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? 'email-error' : undefined}
            {...register('email', {
              required: 'Enter your email address.',
              pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a full email address, such as name@example.com.' },
            })} />
          <FieldError id="email-error" message={errors.email?.message} />
        </div>

        <div className="ps-field">
          <label className="ps-label" htmlFor="password">Password</label>
          <input id="password" type="password" autoComplete="new-password" className="ps-input"
            aria-invalid={errors.password ? true : undefined}
            aria-describedby={errors.password ? 'password-error' : 'password-help'}
            {...register('password', {
              required: 'Choose a password of at least 8 characters.',
              minLength: { value: 8, message: 'Use at least 8 characters.' },
            })} />
          {errors.password
            ? <FieldError id="password-error" message={errors.password.message} />
            : <p id="password-help" className="ps-help">At least 8 characters.</p>}
        </div>

        <Button type="submit" loading={submitting} className="auth-submit">
          {submitting ? 'Creating account…' : 'Create account'}
        </Button>
      </form>
    </AuthLayout>
  )
}
