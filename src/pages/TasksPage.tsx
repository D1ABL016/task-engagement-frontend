import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api/endpoints'
import { ApiError } from '../api/client'
import { useApi } from '../hooks/useApi'
import { useAuth } from '../auth/AuthContext'
import { useReference } from '../reference/ReferenceContext'
import {
  Badge, Button, EmptyState, ErrorBanner, PageHeader, Spinner, inputClass,
} from '../components'
import { STATUS_LABELS, formatDate, isOverdue, todayIso } from '../domain/labels'
import { canManageTasks } from '../domain/taskActions'
import { VIEW_LABELS, applyView } from '../domain/taskViews'
import type { TaskView } from '../domain/taskViews'
import type { TaskStatus } from '../api/types'

const STATUSES = Object.keys(STATUS_LABELS) as TaskStatus[]
const VIEWS = Object.keys(VIEW_LABELS) as TaskView[]

export default function TasksPage() {
  const [params, setParams] = useSearchParams()
  const { user } = useAuth()
  const { engagementsById, users, userName, engagementLabel } = useReference()

  const status = (params.get('status') as TaskStatus | null) ?? undefined
  const assigneeId = params.get('assignee') ?? undefined
  const engagementId = params.get('engagement') ?? undefined
  const deleted = params.get('deleted') === 'true'
  const view = (params.get('view') as TaskView | null) ?? 'all'

  const { data, loading, error, reload } = useApi(
    () =>
      api.tasks.list({
        status,
        assignee_id: assigneeId,
        engagement_id: engagementId,
        deleted,
      }),
    [status, assigneeId, engagementId, deleted],
  )

  // Restoring is only offered on this deleted-tasks list, so its errors are
  // kept apart from the load error above the same way TaskDetailPage does.
  const [actionError, setActionError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function run(work: () => Promise<unknown>) {
    setActionError(null)
    setBusy(true)
    try {
      await work()
      reload()
      return true
    } catch (caught) {
      setActionError(
        caught instanceof ApiError ? caught.detail : 'The action could not be completed.',
      )
      return false
    } finally {
      setBusy(false)
    }
  }

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  const isManager = user ? canManageTasks(user) : false
  const rows = data ? applyView(data, view, engagementsById, todayIso()) : []

  return (
    <div>
      <PageHeader
        title="Tasks"
        subtitle={
          isManager
            ? 'Every task you can see.'
            : 'Tasks assigned to you. The server scopes this list, not the browser.'
        }
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <select
          aria-label="View"
          className={`${inputClass} w-auto`}
          value={view}
          onChange={(event) => setParam('view', event.target.value)}
        >
          {VIEWS.map((option) => (
            <option key={option} value={option}>{VIEW_LABELS[option]}</option>
          ))}
        </select>

        <select
          aria-label="Status"
          className={`${inputClass} w-auto`}
          value={status ?? ''}
          onChange={(event) => setParam('status', event.target.value)}
        >
          <option value="">Any status</option>
          {STATUSES.map((option) => (
            <option key={option} value={option}>{STATUS_LABELS[option]}</option>
          ))}
        </select>

        {isManager && (
          <select
            aria-label="Assignee"
            className={`${inputClass} w-auto`}
            value={assigneeId ?? ''}
            onChange={(event) => setParam('assignee', event.target.value)}
          >
            <option value="">Anyone</option>
            {users.map((person) => (
              <option key={person.id} value={person.id}>{person.full_name}</option>
            ))}
          </select>
        )}

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={deleted}
            onChange={(event) => setParam('deleted', event.target.checked ? 'true' : '')}
          />
          Show deleted
        </label>
      </div>

      {actionError && <ErrorBanner message={actionError} />}
      {error && <ErrorBanner message={error} onRetry={reload} />}
      {loading && <Spinner />}

      {!loading && !error && rows.length === 0 && (
        <EmptyState message="No tasks match these filters." />
      )}

      {!loading && rows.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2">Task</th>
                <th className="px-4 py-2">Engagement</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Assignee</th>
                <th className="px-4 py-2">Due</th>
                {deleted && <th className="px-4 py-2">Reason</th>}
                {deleted && isManager && <th className="px-4 py-2">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((task) => (
                <tr key={task.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-2">
                    {deleted ? (
                      <span className="font-medium text-slate-900">{task.title}</span>
                    ) : (
                      <Link to={`/tasks/${task.id}`} className="font-medium text-slate-900 hover:underline">
                        {task.title}
                      </Link>
                    )}
                  </td>
                  <td className="px-4 py-2 text-slate-600">{engagementLabel(task.engagement_id)}</td>
                  <td className="px-4 py-2"><Badge status={task.status} /></td>
                  <td className="px-4 py-2 text-slate-600">{userName(task.assignee_id)}</td>
                  <td
                    className={`px-4 py-2 ${
                      isOverdue(task.due_date, task.status)
                        ? 'font-medium text-rose-600'
                        : 'text-slate-600'
                    }`}
                  >
                    {formatDate(task.due_date)}
                  </td>
                  {deleted && (
                    <td className="px-4 py-2 text-slate-600">{task.deletion_reason ?? '—'}</td>
                  )}
                  {deleted && isManager && (
                    <td className="px-4 py-2">
                      <Button
                        disabled={busy}
                        onClick={() => void run(() => api.tasks.restore(task.id))}
                      >
                        Restore
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
