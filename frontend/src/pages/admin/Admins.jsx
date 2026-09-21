import { useState } from 'react'
import { CheckCircle, Copy, Wand2 } from 'lucide-react'
import { adminsApi } from '../../api/admins'
import { Alert, Button, Card, PageHeader, TextField } from '../../components/ui'

// No look-alike characters (0/O, 1/l/I), so a password read aloud or typed from a
// message is not misread.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
const GENERATED_LENGTH = 16

function generatePassword() {
  const random = new Uint32Array(GENERATED_LENGTH)
  crypto.getRandomValues(random)
  return Array.from(random, (value) => ALPHABET[value % ALPHABET.length]).join('')
}

const EMPTY_FORM = { name: '', email: '', temporaryPassword: '' }

export default function Admins() {
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  // Held only until the admin dismisses it: the password cannot be shown again.
  const [created, setCreated] = useState(null)
  const [copied, setCopied] = useState(false)

  const update = (field) => (event) => setForm((previous) => ({ ...previous, [field]: event.target.value }))

  const submit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const user = await adminsApi.create(form)
      setCreated({ name: user.name, email: user.email, temporaryPassword: form.temporaryPassword })
      setForm(EMPTY_FORM)
      setCopied(false)
    } catch (err) {
      setError(err)
    } finally {
      setSubmitting(false)
    }
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(created.temporaryPassword)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  const fieldErrors = {
    name: error?.fieldError('name'),
    email: error?.code === 'EMAIL_TAKEN' ? error.message : error?.fieldError('email'),
    temporaryPassword: error?.fieldError('temporaryPassword'),
  }
  const showAlert = error && !Object.values(fieldErrors).some(Boolean)

  return (
    <>
      <PageHeader title="Admins" description="Give a colleague admin access" />

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {created && (
            <Alert tone="success" title={`${created.name} is now an admin`}>
              <p>
                Send them this temporary password over a private channel. They will be asked to choose their own the first time they sign in with <strong>{created.email}</strong>.
              </p>
              <p className="mt-3 flex flex-wrap items-center gap-3">
                <code className="px-3 py-1.5 rounded-lg bg-white border border-green-200 font-mono text-base text-gray-900 select-all">{created.temporaryPassword}</code>
                <Button variant="secondary" size="sm" onClick={copy}>
                  {copied ? <CheckCircle className="w-4 h-4" aria-hidden="true" /> : <Copy className="w-4 h-4" aria-hidden="true" />}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setCreated(null)}>Dismiss</Button>
              </p>
              <p className="mt-2 text-xs">It will not be shown again once dismissed.</p>
            </Alert>
          )}

          <Card>
            <h2 className="text-xl font-bold text-gray-900 mb-6">Add an admin</h2>
            <form onSubmit={submit} className="space-y-5" noValidate>
              {showAlert && <Alert tone="error">{error.message}</Alert>}
              <TextField label="Full name" autoComplete="off" value={form.name} onChange={update('name')} error={fieldErrors.name} required />
              <TextField label="Email" type="email" autoComplete="off" value={form.email} onChange={update('email')} error={fieldErrors.email} required />
              <div>
                <TextField
                  label="Temporary password"
                  autoComplete="off"
                  spellCheck={false}
                  value={form.temporaryPassword}
                  onChange={update('temporaryPassword')}
                  error={fieldErrors.temporaryPassword}
                  hint="At least 10 characters. They must change it at first sign-in."
                  required
                />
                <Button variant="ghost" size="sm" className="mt-2" onClick={() => setForm((previous) => ({ ...previous, temporaryPassword: generatePassword() }))}>
                  <Wand2 className="w-4 h-4" aria-hidden="true" />
                  Generate a password
                </Button>
              </div>
              <Button type="submit" loading={submitting}>Create admin</Button>
            </form>
          </Card>
        </div>

        <Card>
          <h2 className="text-lg font-bold text-gray-900 mb-2">How it works</h2>
          <ul className="text-sm text-gray-600 space-y-2 list-disc pl-5">
            <li>The new admin signs in with the temporary password.</li>
            <li>Until they choose their own password they can do nothing else.</li>
            <li>Admins can manage volunteers and other admins.</li>
          </ul>
        </Card>
      </div>
    </>
  )
}
