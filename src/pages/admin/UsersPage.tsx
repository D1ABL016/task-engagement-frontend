import { useState } from 'react'
import { api } from '../../api/endpoints'
import { ApiError } from '../../api/client'
import { useAuth } from '../../auth/AuthContext'
import { useReference } from '../../reference/ReferenceContext'
import {
  Button, EmptyState, ErrorBanner, Field, Modal, PageHeader, Spinner, inputClass,
} from '../../components'
import { ROLE_LABELS } from '../../domain/labels'
import type { UserRole } from '../../api/types'

const ROLES: UserRole[] = ['admin', 'manager', 'team_member']

export default function UsersPage() {
  const { user: currentUser } = useAuth()
  const { users, reload, loading: referenceLoading, error: referenceError } = useReference()
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [creating, setCreating] = useState(false)
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<UserRole>('team_member')

  async function run(work: () => Promise<unknown>) {
    setError(null)
    setFieldErrors({})
    setBusy(true)
    try {
      await work()
      await reload('users')
      return true
    } catch (caught) {
      if (caught instanceof ApiError) {
        setError(caught.detail)
        setFieldErrors(caught.fieldErrors)
      } else {
        setError('The change could not be saved.')
      }
      return false
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Users"
        subtitle="Everyone can read this list; only an admin can change it."
        actions={
          <Button
            variant="primary"
            onClick={() => {
              setEmail(''); setFullName(''); setPassword(''); setRole('team_member')
              setError(null); setFieldErrors({}); setCreating(true)
            }}
          >
            New user
          </Button>
        }
      />

      {error && <ErrorBanner message={error} />}
      {referenceError && <ErrorBanner message={referenceError} />}

      {referenceLoading && <Spinner />}

      {!referenceLoading && users.length === 0 && (
        <EmptyState message="No users yet." />
      )}

      {!referenceLoading && users.length > 0 && (
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Role</th>
              <th className="px-4 py-2">Active</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((person) => {
              // An admin editing their own row could demote or deactivate
              // themselves in one click, and nothing in this application could
              // undo it — the screen that restores access is the one they just
              // lost. Their own controls are disabled rather than confirmed.
              const isSelf = currentUser?.id === person.id
              return (
              <tr key={person.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-2 font-medium">
                  {person.full_name}
                  {isSelf && <span className="ml-2 text-xs text-slate-400">you</span>}
                </td>
                <td className="px-4 py-2 text-slate-600">{person.email}</td>
                <td className="px-4 py-2">
                  <select
                    className={`${inputClass} w-auto`}
                    disabled={busy || isSelf}
                    title={isSelf ? 'You cannot change your own role' : undefined}
                    value={person.role}
                    onChange={(event) =>
                      void run(() =>
                        api.users.update(person.id, { role: event.target.value as UserRole }),
                      )
                    }
                  >
                    {ROLES.map((option) => (
                      <option key={option} value={option}>{ROLE_LABELS[option]}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-2 text-slate-600">{person.is_active ? 'Yes' : 'No'}</td>
                <td className="px-4 py-2 text-right">
                  <Button
                    disabled={busy || isSelf}
                    title={isSelf ? 'You cannot deactivate your own account' : undefined}
                    onClick={() =>
                      void run(() => api.users.update(person.id, { is_active: !person.is_active }))
                    }
                  >
                    {person.is_active ? 'Deactivate' : 'Activate'}
                  </Button>
                </td>
              </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      )}

      {creating && (
        <Modal title="New user" onClose={() => setCreating(false)}>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault()
              void run(() =>
                api.users.create({ email, full_name: fullName, password, role }),
              ).then((ok) => { if (ok) setCreating(false) })
            }}
          >
            <Field label="Email" error={fieldErrors['email']}>
              <input type="email" className={inputClass} required value={email}
                     onChange={(event) => setEmail(event.target.value)} />
            </Field>
            <Field label="Full name" error={fieldErrors['full_name']}>
              <input className={inputClass} required maxLength={200} value={fullName}
                     onChange={(event) => setFullName(event.target.value)} />
            </Field>
            <Field label="Password (at least 8 characters)" error={fieldErrors['password']}>
              <input type="password" className={inputClass} required minLength={8} value={password}
                     onChange={(event) => setPassword(event.target.value)} />
            </Field>
            <Field label="Role" error={fieldErrors['role']}>
              <select className={inputClass} value={role}
                      onChange={(event) => setRole(event.target.value as UserRole)}>
                {ROLES.map((option) => (
                  <option key={option} value={option}>{ROLE_LABELS[option]}</option>
                ))}
              </select>
            </Field>
            {/* The modal covers the page banner, so the error has to appear here too. */}
            {error && <p className="text-sm text-rose-600">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" onClick={() => setCreating(false)}>Cancel</Button>
              <Button type="submit" variant="primary" disabled={busy}>Create</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
