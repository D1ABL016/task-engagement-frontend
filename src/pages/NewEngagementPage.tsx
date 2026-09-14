import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/endpoints'
import { ApiError } from '../api/client'
import { useAuth } from '../auth/AuthContext'
import { useReference } from '../reference/ReferenceContext'
import { Button, ErrorBanner, Field, PageHeader, Spinner, inputClass } from '../components'
import { todayIso } from '../domain/labels'
import type { EngagementType, RecurrenceFrequency } from '../api/types'

export default function NewEngagementPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const {
    clients, serviceTypes, users, reload,
    loading: referenceLoading, error: referenceError,
  } = useReference()

  const [clientId, setClientId] = useState('')
  const [serviceTypeId, setServiceTypeId] = useState('')
  // A manager always owns what they create — the field is only editable for
  // an admin, who has no natural default to own it instead.
  const [managerId, setManagerId] = useState(isAdmin ? '' : user?.id ?? '')
  const [engagementType, setEngagementType] = useState<EngagementType>('recurring')
  const [recurrence, setRecurrence] = useState<RecurrenceFrequency>('monthly')
  const [startDate, setStartDate] = useState(todayIso())
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  // Only a manager or an admin can own an engagement, so only they are offered.
  const managers = users.filter(
    (person) => person.is_active && (person.role === 'manager' || person.role === 'admin'),
  )
  const activeClients = clients.filter((client) => client.is_active)
  const activeServices = serviceTypes.filter((service) => service.is_active)

  async function submit() {
    setError(null)
    setFieldErrors({})
    setBusy(true)
    try {
      const created = await api.engagements.create({
        client_id: clientId,
        service_type_id: serviceTypeId,
        ...(isAdmin ? { manager_id: managerId } : {}),
        engagement_type: engagementType,
        // Present only for recurring: the backend rejects the other combinations.
        ...(engagementType === 'recurring' ? { recurrence } : {}),
        start_date: startDate,
      })
      await reload('engagements')
      navigate(`/engagements/${created.id}`, { replace: true })
    } catch (caught) {
      if (caught instanceof ApiError) {
        setError(
          caught.status === 409
            ? `${caught.detail} An engagement already exists for this client, service and period.`
            : caught.detail,
        )
        setFieldErrors(caught.fieldErrors)
      } else {
        setError('The engagement could not be created.')
      }
    } finally {
      setBusy(false)
    }
  }

  const selectedService = serviceTypes.find((service) => service.id === serviceTypeId)

  return (
    <div className="max-w-xl">
      <PageHeader
        title="New engagement"
        subtitle="Tasks are generated from the service type's templates when the engagement is created."
      />

      {error && <ErrorBanner message={error} />}
      {referenceError && <ErrorBanner message={referenceError} />}

      {referenceLoading && <Spinner />}

      {!referenceLoading && (
      <form
        className="space-y-4 rounded-lg border border-slate-200 bg-white p-4"
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        <Field label="Client" error={fieldErrors['client_id']}>
          <select className={inputClass} required value={clientId}
                  onChange={(event) => setClientId(event.target.value)}>
            <option value="">Choose a client</option>
            {activeClients.map((client) => (
              <option key={client.id} value={client.id}>{client.name}</option>
            ))}
          </select>
        </Field>

        <Field label="Service type" error={fieldErrors['service_type_id']}>
          <select className={inputClass} required value={serviceTypeId}
                  onChange={(event) => setServiceTypeId(event.target.value)}>
            <option value="">Choose a service</option>
            {activeServices.map((service) => (
              <option key={service.id} value={service.id}>{service.name}</option>
            ))}
          </select>
          {selectedService && (
            <p className="mt-1 text-xs text-slate-500">
              {selectedService.task_templates.length} task
              {selectedService.task_templates.length === 1 ? '' : 's'} will be generated.
            </p>
          )}
        </Field>

        <Field label="Manager" error={fieldErrors['manager_id']}>
          {isAdmin ? (
            <select className={inputClass} required value={managerId}
                    onChange={(event) => setManagerId(event.target.value)}>
              <option value="">Choose a manager</option>
              {managers.map((person) => (
                <option key={person.id} value={person.id}>{person.full_name}</option>
              ))}
            </select>
          ) : (
            <input className={inputClass} disabled value={user?.full_name ?? ''} />
          )}
        </Field>

        <Field label="Type" error={fieldErrors['engagement_type']}>
          <select
            className={inputClass}
            value={engagementType}
            onChange={(event) => setEngagementType(event.target.value as EngagementType)}
          >
            <option value="recurring">Recurring</option>
            <option value="one_time">One-time</option>
          </select>
        </Field>

        {engagementType === 'recurring' && (
          <Field label="Recurrence" error={fieldErrors['recurrence']}>
            <select
              className={inputClass}
              value={recurrence}
              onChange={(event) => setRecurrence(event.target.value as RecurrenceFrequency)}
            >
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="annual">Annual</option>
            </select>
          </Field>
        )}

        <Field label="Start date" error={fieldErrors['start_date']}>
          <input type="date" className={inputClass} required value={startDate}
                 onChange={(event) => setStartDate(event.target.value)} />
          {engagementType === 'recurring' && (
            <p className="mt-1 text-xs text-slate-500">
              This date only picks the period. It is snapped to that period's first day —
              choosing 15 September for a monthly engagement stores 1 September.
            </p>
          )}
        </Field>

        <div className="flex justify-end gap-2">
          <Button type="button" onClick={() => navigate('/engagements')}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={busy}>
            {busy ? 'Creating…' : 'Create engagement'}
          </Button>
        </div>
      </form>
      )}
    </div>
  )
}
