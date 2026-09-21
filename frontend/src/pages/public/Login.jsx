import { useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import AuthCard from '../../components/AuthCard'
import { Alert, Button, FullPageSpinner, TextField } from '../../components/ui'
import { useAuth } from '../../auth/AuthContext'
import { homePathFor } from '../../lib/constants'
import { safeNext } from '../../lib/safeNext'

export default function Login() {
  const { status, user, login, notice, clearNotice } = useAuth()
  const [searchParams] = useSearchParams()
  const next = safeNext(searchParams.get('next'), null)

  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const update = (field) => (event) => setForm((previous) => ({ ...previous, [field]: event.target.value }))

  // Already signed in (or just signed in): go where they were headed.
  if (user) return <Navigate to={next ?? homePathFor(user)} replace />
  if (status === 'loading') return <FullPageSpinner />

  const submit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await login({ email: form.email, password: form.password })
      clearNotice()
    } catch (err) {
      setError(err)
      setSubmitting(false)
    }
  }

  const registerLink = next ? `/register?next=${encodeURIComponent(next)}` : '/register'

  return (
    <section className="pt-16 min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-orange-50 px-4">
      <AuthCard
        title="Sign in"
        subtitle="Welcome back to Sevadeep"
        footer={
          <>
            New to Sevadeep?{' '}
            <Link to={registerLink} className="text-primary-600 hover:text-primary-700 font-medium">
              Create a volunteer account
            </Link>
          </>
        }
      >
        <form onSubmit={submit} className="space-y-5" noValidate>
          {notice && <Alert tone="info">{notice}</Alert>}
          {error && <Alert tone="error">{error.message}</Alert>}
          <TextField
            label="Email"
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={update('email')}
            error={error?.fieldError('email')}
            required
          />
          <TextField
            label="Password"
            type="password"
            autoComplete="current-password"
            value={form.password}
            onChange={update('password')}
            error={error?.fieldError('password')}
            required
          />
          <Button type="submit" loading={submitting} className="w-full" size="lg">
            Sign in
          </Button>
        </form>
      </AuthCard>
    </section>
  )
}
