import { useState } from 'react'
import { api } from '../../api/endpoints'
import { ApiError } from '../../api/client'
import { useReference } from '../../reference/ReferenceContext'
import {
  Button, EmptyState, ErrorBanner, Field, Modal, PageHeader, Spinner, inputClass,
} from '../../components'

export default function ClientsPage() {
  const { clients, reload, loading: referenceLoading, error: referenceError } = useReference()
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')

  async function run(work: () => Promise<unknown>) {
    setError(null)
    setBusy(true)
    try {
      await work()
      await reload('clients')
      return true
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.detail : 'The change could not be saved.')
      return false
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Clients"
        actions={
          <Button
            variant="primary"
            onClick={() => { setName(''); setEmail(''); setError(null); setCreating(true) }}
          >
            New client
          </Button>
        }
      />

      {error && <ErrorBanner message={error} />}
      {referenceError && <ErrorBanner message={referenceError} />}

      {referenceLoading && <Spinner />}

      {!referenceLoading && clients.length === 0 && (
        <EmptyState message="No clients yet." />
      )}

      {!referenceLoading && clients.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Contact email</th>
                <th className="px-4 py-2">Active</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr key={client.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-2 font-medium">{client.name}</td>
                  <td className="px-4 py-2 text-slate-600">{client.contact_email ?? '—'}</td>
                  <td className="px-4 py-2 text-slate-600">{client.is_active ? 'Yes' : 'No'}</td>
                  <td className="px-4 py-2 text-right">
                    <Button
                      disabled={busy}
                      onClick={() =>
                        void run(() =>
                          api.clients.update(client.id, { is_active: !client.is_active }),
                        )
                      }
                    >
                      {client.is_active ? 'Deactivate' : 'Activate'}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {creating && (
        <Modal title="New client" onClose={() => setCreating(false)}>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault()
              void run(() =>
                api.clients.create({ name, contact_email: email === '' ? null : email }),
              ).then((ok) => { if (ok) setCreating(false) })
            }}
          >
            <Field label="Name (required)">
              <input className={inputClass} required maxLength={200} value={name}
                     onChange={(event) => setName(event.target.value)} />
            </Field>
            <Field label="Contact email">
              <input type="email" className={inputClass} value={email}
                     onChange={(event) => setEmail(event.target.value)} />
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
