import { Link } from 'react-router-dom'
import { api } from '../api/endpoints'
import { useApi } from '../hooks/useApi'
import { useAuth } from '../auth/AuthContext'
import { useReference } from '../reference/ReferenceContext'
import { Button, EmptyState, ErrorBanner, PageHeader, Spinner } from '../components'
import { formatDate } from '../domain/labels'
import { canManageTasks } from '../domain/taskActions'

const TYPE_LABELS = { one_time: 'One-time', recurring: 'Recurring' } as const
const RECURRENCE_LABELS = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  annual: 'Annual',
} as const

export default function EngagementsPage() {
  const { user } = useAuth()
  const { clientName, serviceTypeName, userName } = useReference()
  const { data, loading, error, reload } = useApi(() => api.engagements.list(), [])

  const canCreate = user ? canManageTasks(user) : false

  return (
    <div>
      <PageHeader
        title="Engagements"
        subtitle={canCreate ? undefined : 'Engagements you have a task in.'}
        actions={
          canCreate ? (
            <Link to="/engagements/new">
              <Button variant="primary">New engagement</Button>
            </Link>
          ) : undefined
        }
      />

      {error && <ErrorBanner message={error} onRetry={reload} />}
      {loading && <Spinner />}
      {!loading && !error && data?.length === 0 && (
        <EmptyState message="No engagements to show." />
      )}

      {!loading && data && data.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2">Client</th>
                <th className="px-4 py-2">Service</th>
                <th className="px-4 py-2">Type</th>
                <th className="px-4 py-2">Period</th>
                <th className="px-4 py-2">Manager</th>
                <th className="px-4 py-2">Auto-renew</th>
                <th className="px-4 py-2">Tasks</th>
              </tr>
            </thead>
            <tbody>
              {data.map((engagement) => (
                <tr key={engagement.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-2">
                    <Link
                      to={`/engagements/${engagement.id}`}
                      className="font-medium text-slate-900 hover:underline"
                    >
                      {clientName(engagement.client_id)}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-slate-600">
                    {serviceTypeName(engagement.service_type_id)}
                  </td>
                  <td className="px-4 py-2 text-slate-600">
                    {TYPE_LABELS[engagement.engagement_type]}
                    {engagement.recurrence && ` · ${RECURRENCE_LABELS[engagement.recurrence]}`}
                  </td>
                  <td className="px-4 py-2 text-slate-600">
                    {engagement.period_start
                      ? `${formatDate(engagement.period_start)} – ${formatDate(engagement.period_end)}`
                      : formatDate(engagement.start_date)}
                  </td>
                  <td className="px-4 py-2 text-slate-600">{userName(engagement.manager_id)}</td>
                  <td className="px-4 py-2 text-slate-600">
                    {engagement.engagement_type === 'recurring'
                      ? engagement.auto_renew ? 'On' : 'Off'
                      : '—'}
                  </td>
                  <td className="px-4 py-2 tabular-nums text-slate-600">{engagement.tasks.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
