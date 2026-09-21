import { useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import AuthCard from '../../components/AuthCard'
import { Alert, Button, FullPageSpinner, TextField } from '../../components/ui'
import { useAuth } from '../../auth/AuthContext'
import { homePathFor } from '../../lib/constants'
import { safeNext } from '../../lib/safeNext'

const FIELDS = ['name', 'email', 'phone', 'password']

export default function Register() {
  const { status, user, register } = useAuth()
  const [searchParams] = useSearchParams()
  const next = safeNext(searchParams.get('next'), null)

  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' })
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const update = (field) => (event) => setForm((previous) => ({ ...previous, [field]: event.target.value }))

  // Registration signs the new volunteer in, so this also handles "just registered".
  if (user) return <Navigate to={next ?? homePathFor(user)} replace />
  if (status === 'loading') return <FullPageSpinner />

  const submit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await register(form)
    } catch (err) {
      setError(err)
      setSubmitting(false)
    }
  }

  // Server messages belong next to the field they are about; anything else goes in the alert.
  const fieldErrors = Object.fromEntries(FIELDS.map((field) => [field, error?.fieldError(field)]))
  if (error?.code === 'EMAIL_TAKEN') fieldErrors.email = error.message
  const showAlert = error && !Object.values(fieldErrors).some(Boolean)

  const loginLink = next ? `/login?next=${encodeURIComponent(next)}` : '/login'

  return (
    <section className="pt-16 min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-orange-50 px-4 py-10">
      <AuthCard
        title="Become a volunteer"
        subtitle="Create your Sevadeep account"
        footer={
          <>
            Already have an account?{' '}
            <Link to={loginLink} className="text-primary-600 hover:text-primary-700 font-medium">
              Sign in
            </Link>
          </>
        }
      >
        <form onSubmit={submit} className="space-y-5" noValidate>
          {showAlert && <Alert tone="error">{error.message}</Alert>}
          <TextField label="Full name" autoComplete="name" value={form.name} onChange={update('name')} error={fieldErrors.name} required />
          <TextField label="Email" type="email" autoComplete="email" value={form.email} onChange={update('email')} error={fieldErrors.email} required />
          <TextField label="Phone number" type="tel" autoComplete="tel" value={form.phone} onChange={update('phone')} error={fieldErrors.phone} required />
          <TextField
            label="Password"
            type="password"
            autoComplete="new-password"
            value={form.password}
            onChange={update('password')}
            error={fieldErrors.password}
            hint="At least 10 characters."
            required
          />
          <Button type="submit" loading={submitting} className="w-full" size="lg">
            Create account
          </Button>
        </form>
      </AuthCard>
    </section>
  )
}
