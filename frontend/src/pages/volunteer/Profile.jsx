import { useState } from 'react'
import { Link } from 'react-router-dom'
import { volunteersApi } from '../../api/volunteers'
import { Alert, Button, Card, PageHeader, TextField } from '../../components/ui'
import { useAuth } from '../../auth/AuthContext'
import { formatDate } from '../../lib/format'

export default function Profile() {
  const { user, refresh } = useAuth()
  const { volunteer } = user

  const [form, setForm] = useState({ name: volunteer.name, phone: volunteer.phone })
  const [error, setError] = useState(null)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  const changed = form.name !== volunteer.name || form.phone !== volunteer.phone
  const update = (field) => (event) => {
    setSaved(false)
    setForm((previous) => ({ ...previous, [field]: event.target.value }))
  }

  const submit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const updated = await volunteersApi.updateMe(form)
      await refresh()
      setForm({ name: updated.name, phone: updated.phone })
      setSaved(true)
    } catch (err) {
      setError(err)
    } finally {
      setSaving(false)
    }
  }

  const nameError = error?.fieldError('name')
  const phoneError = error?.fieldError('phone')

  return (
    <>
      <PageHeader title="My Profile" description="Keep your contact details up to date" />

      <div className="grid lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2">
          <form onSubmit={submit} className="space-y-5" noValidate>
            {saved && <Alert tone="success">Your profile has been updated.</Alert>}
            {error && !nameError && !phoneError && <Alert tone="error">{error.message}</Alert>}
            <TextField label="Full name" autoComplete="name" value={form.name} onChange={update('name')} error={nameError} required />
            <TextField label="Phone number" type="tel" autoComplete="tel" value={form.phone} onChange={update('phone')} error={phoneError} required />
            <Button type="submit" loading={saving} disabled={!changed}>
              Save changes
            </Button>
          </form>
        </Card>

        <Card>
          <h2 className="text-lg font-bold text-gray-900 mb-4">Account</h2>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-gray-500">Volunteer ID</dt>
              <dd className="font-medium text-gray-900">{volunteer.volunteerId}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Email</dt>
              <dd className="font-medium text-gray-900 break-all">{user.email}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Volunteering since</dt>
              <dd className="font-medium text-gray-900">{formatDate(volunteer.joinedAt)}</dd>
            </div>
          </dl>
          <p className="text-xs text-gray-500 mt-4">Your ID and email can&apos;t be changed here. Contact an administrator if they need correcting.</p>
          <Button as={Link} to="/change-password" variant="secondary" size="sm" className="mt-4">
            Change password
          </Button>
        </Card>
      </div>
    </>
  )
}
