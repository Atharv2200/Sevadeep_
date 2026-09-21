import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AuthCard from '../../components/AuthCard'
import { Alert, Button, TextField } from '../../components/ui'
import { authApi } from '../../api/auth'
import { useAuth } from '../../auth/AuthContext'
import { homePathFor } from '../../lib/constants'

export default function ChangePassword() {
  const { user, setUser } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' })
  const [error, setError] = useState(null)
  const [mismatch, setMismatch] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const update = (field) => (event) => setForm((previous) => ({ ...previous, [field]: event.target.value }))
  const forced = user.mustChangePassword

  const submit = async (event) => {
    event.preventDefault()
    setError(null)
    if (form.newPassword !== form.confirm) {
      setMismatch(true)
      return
    }
    setMismatch(false)
    setSubmitting(true)
    try {
      const updated = await authApi.changePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword })
      setUser(updated)
      navigate(homePathFor(updated), { replace: true })
    } catch (err) {
      setError(err)
      setSubmitting(false)
    }
  }

  const currentError = error?.code === 'INVALID_CURRENT_PASSWORD' ? error.message : error?.fieldError('currentPassword')
  const newError = error?.code === 'PASSWORD_UNCHANGED' ? error.message : error?.fieldError('newPassword')
  const showAlert = error && !currentError && !newError

  return (
    <section className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-orange-50 px-4 py-10">
      <AuthCard
        title="Change password"
        subtitle={user.email}
        footer={!forced && <Link to={homePathFor(user)} className="text-primary-600 hover:text-primary-700 font-medium">Back to my dashboard</Link>}
      >
        <form onSubmit={submit} className="space-y-5" noValidate>
          {forced && <Alert tone="info">You are using a temporary password. Choose your own to continue.</Alert>}
          {showAlert && <Alert tone="error">{error.message}</Alert>}
          <TextField
            label="Current password"
            type="password"
            autoComplete="current-password"
            value={form.currentPassword}
            onChange={update('currentPassword')}
            error={currentError}
            required
          />
          <TextField
            label="New password"
            type="password"
            autoComplete="new-password"
            value={form.newPassword}
            onChange={update('newPassword')}
            error={newError}
            hint="At least 10 characters."
            required
          />
          <TextField
            label="Confirm new password"
            type="password"
            autoComplete="new-password"
            value={form.confirm}
            onChange={update('confirm')}
            error={mismatch ? 'The passwords do not match.' : undefined}
            required
          />
          <Button type="submit" loading={submitting} className="w-full" size="lg">
            Change password
          </Button>
          <p className="text-xs text-gray-500 text-center">Changing your password signs you out of every other device.</p>
        </form>
      </AuthCard>
    </section>
  )
}
