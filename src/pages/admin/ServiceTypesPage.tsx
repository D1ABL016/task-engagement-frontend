import { useState } from 'react'
import { api } from '../../api/endpoints'
import { ApiError } from '../../api/client'
import { useReference } from '../../reference/ReferenceContext'
import {
  Button, EmptyState, ErrorBanner, Field, Modal, PageHeader, Spinner, inputClass,
} from '../../components'
import type { ServiceType } from '../../api/types'

export default function ServiceTypesPage() {
  const { serviceTypes, reload, loading: referenceLoading, error: referenceError } = useReference()
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  async function run(work: () => Promise<unknown>) {
    setError(null)
    setBusy(true)
    try {
      await work()
      await reload('serviceTypes')
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
        title="Service types"
        subtitle="A service's task templates decide which tasks an engagement generates."
        actions={
          <Button
            variant="primary"
            onClick={() => { setName(''); setDescription(''); setError(null); setCreating(true) }}
          >
            New service type
          </Button>
        }
      />

      {error && <ErrorBanner message={error} />}
      {referenceError && <ErrorBanner message={referenceError} />}

      {referenceLoading && <Spinner />}

      {!referenceLoading && serviceTypes.length === 0 && (
        <EmptyState message="No service types yet." />
      )}

      {!referenceLoading && serviceTypes.length > 0 && (
        <div className="space-y-4">
          {serviceTypes.map((service) => (
            <ServiceCard key={service.id} service={service} busy={busy} run={run} />
          ))}
        </div>
      )}

      {creating && (
        <Modal title="New service type" onClose={() => setCreating(false)}>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault()
              void run(() =>
                api.serviceTypes.create({
                  name,
                  description: description === '' ? null : description,
                }),
              ).then((ok) => { if (ok) setCreating(false) })
            }}
          >
            <Field label="Name (required)">
              <input className={inputClass} required maxLength={200} value={name}
                     onChange={(event) => setName(event.target.value)} />
            </Field>
            <Field label="Description">
              <textarea className={inputClass} rows={3} value={description}
                        onChange={(event) => setDescription(event.target.value)} />
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

function ServiceCard({
  service,
  busy,
  run,
}: {
  service: ServiceType
  busy: boolean
  run: (work: () => Promise<unknown>) => Promise<boolean>
}) {
  const [title, setTitle] = useState('')
  const [sequence, setSequence] = useState('1')
  const [offset, setOffset] = useState('0')

  const templates = [...service.task_templates].sort((a, b) => a.sequence - b.sequence)

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-medium">{service.name}</h2>
          {service.description && (
            <p className="mt-1 text-sm text-slate-500">{service.description}</p>
          )}
        </div>
        <Button
          disabled={busy}
          onClick={() =>
            void run(() =>
              api.serviceTypes.update(service.id, { is_active: !service.is_active }),
            )
          }
        >
          {service.is_active ? 'Deactivate' : 'Activate'}
        </Button>
      </div>

      <table className="mt-4 w-full text-sm">
        <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="py-1">#</th>
            <th className="py-1">Template</th>
            <th className="py-1">Due offset (days)</th>
            <th className="py-1"></th>
          </tr>
        </thead>
        <tbody>
          {templates.map((template) => (
            <tr key={template.id} className="border-t border-slate-100">
              <td className="py-1 tabular-nums text-slate-500">{template.sequence}</td>
              <td className="py-1">{template.title}</td>
              <td className="py-1 tabular-nums text-slate-600">{template.default_offset_days}</td>
              <td className="py-1 text-right">
                <Button
                  variant="danger"
                  disabled={busy}
                  onClick={() => void run(() => api.serviceTypes.deleteTemplate(template.id))}
                >
                  Delete
                </Button>
              </td>
            </tr>
          ))}
          {templates.length === 0 && (
            <tr>
              <td colSpan={4} className="py-2 text-slate-500">
                No templates: an engagement for this service would generate no tasks.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <form
        className="mt-4 flex flex-wrap items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          void run(() =>
            api.serviceTypes.addTemplate(service.id, {
              title,
              sequence: Number(sequence),
              default_offset_days: Number(offset),
            }),
          ).then((ok) => { if (ok) { setTitle(''); setSequence('1'); setOffset('0') } })
        }}
      >
        <div className="min-w-48 flex-1">
          <Field label="New template title">
            <input className={inputClass} required maxLength={300} value={title}
                   onChange={(event) => setTitle(event.target.value)} />
          </Field>
        </div>
        <div className="w-24">
          <Field label="Sequence">
            <input type="number" min={1} className={inputClass} required value={sequence}
                   onChange={(event) => setSequence(event.target.value)} />
          </Field>
        </div>
        <div className="w-28">
          <Field label="Offset days">
            <input type="number" min={0} className={inputClass} required value={offset}
                   onChange={(event) => setOffset(event.target.value)} />
          </Field>
        </div>
        <Button type="submit" disabled={busy}>Add</Button>
      </form>
    </section>
  )
}
