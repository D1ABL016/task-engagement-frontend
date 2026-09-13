import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/endpoints'
import { ApiError } from '../api/client'
import { useApi } from '../hooks/useApi'
import { useAuth } from '../auth/AuthContext'
import { useReference } from '../reference/ReferenceContext'
import {
  Badge, Button, EmptyState, ErrorBanner, Field, Modal, PageHeader, Spinner, inputClass,
} from '../components'
import { formatDate, isOverdue } from '../domain/labels'
import { canManageTasks } from '../domain/taskActions'

export default function EngagementDetailPage() {
  const { engagementId = '' } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { clientName, serviceTypeName, userName, users, reload: reloadReference } = useReference()

  const { data, loading, error, errorStatus, reload } = useApi(
    () => api.engagements.get(engagementId),
    [engagementId],
  )

  const [message, setMessage] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [addingTask, setAddingTask] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDueDate, setNewDueDate] = useState('')
  const [newAssignee, setNewAssignee] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteReason, setDeleteReason] = useState('')

  async function run(work: () => Promise<unknown>) {
    setActionError(null)
    setMessage(null)
    setBusy(true)
    try {
      await work()
      reload()
      void reloadReference('engagements')
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

  if (loading) return <Spinner />
  if (errorStatus === 404) {
    return (
      <div>
        <EmptyState message="This engagement was not found. It may have been deleted." />
        <p className="mt-3 text-sm">
          <Link to="/engagements" className="text-slate-600 hover:underline">Back to engagements</Link>
        </p>
      </div>
    )
  }
  if (error) return <ErrorBanner message={error} onRetry={reload} />
  if (!data || !user) return null

  const isManager = canManageTasks(user)

  return (
    <div className="max-w-4xl">
      <PageHeader
        title={`${clientName(data.client_id)} — ${serviceTypeName(data.service_type_id)}`}
        subtitle={
          data.period_start
            ? `Period ${formatDate(data.period_start)} – ${formatDate(data.period_end)}`
            : `One-time, starting ${formatDate(data.start_date)}`
        }
        actions={
          <Link to="/engagements" className="text-sm text-slate-600 hover:underline">
            Back to engagements
          </Link>
        }
      />

      {actionError && <ErrorBanner message={actionError} />}
      {message && (
        <div className="mb-4 rounded-md bg-sky-50 px-3 py-2 text-sm text-sky-800">{message}</div>
      )}

      <dl className="grid grid-cols-2 gap-4 rounded-lg border border-slate-200 bg-white p-4 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">Manager</dt>
          <dd className="mt-1">{userName(data.manager_id)}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">Type</dt>
          <dd className="mt-1">{data.engagement_type === 'recurring' ? 'Recurring' : 'One-time'}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">Recurrence</dt>
          <dd className="mt-1">{data.recurrence ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">Auto-renew</dt>
          <dd className="mt-1">{data.engagement_type === 'recurring' ? (data.auto_renew ? 'On' : 'Off') : '—'}</dd>
        </div>
      </dl>

      {isManager && (
        <div className="mt-4 flex flex-wrap gap-2">
          {data.engagement_type === 'recurring' && (
            <>
              <Button
                disabled={busy}
                onClick={() =>
                  void (async () => {
                    setActionError(null)
                    setBusy(true)
                    try {
                      const result = await api.engagements.generateNext(data.id)
                      void reloadReference('engagements')
                      if (result.created) {
                        navigate(`/engagements/${result.engagement.id}`)
                      } else {
                        setMessage(
                          'That period already exists — nothing was created. Pressing this twice is safe.',
                        )
                      }
                    } catch (caught) {
                      setActionError(
                        caught instanceof ApiError ? caught.detail : 'Could not generate.',
                      )
                    } finally {
                      setBusy(false)
                    }
                  })()
                }
              >
                Generate next period
              </Button>

              <Button
                disabled={busy}
                onClick={() => void run(() => api.engagements.setAutoRenew(data.id, !data.auto_renew))}
              >
                {data.auto_renew ? 'Turn auto-renew off' : 'Turn auto-renew on'}
              </Button>
            </>
          )}

          <Button
            disabled={busy}
            onClick={() => {
              setNewTitle(''); setNewDueDate(''); setNewAssignee('')
              setActionError(null); setAddingTask(true)
            }}
          >
            Add task
          </Button>

          <Button
            variant="danger"
            disabled={busy}
            onClick={() => { setDeleteReason(''); setActionError(null); setDeleting(true) }}
          >
            Delete engagement
          </Button>
        </div>
      )}

      <h2 className="mt-8 text-sm font-semibold">Tasks</h2>
      {data.tasks.length === 0 ? (
        <div className="mt-3"><EmptyState message="This engagement has no tasks." /></div>
      ) : (
        <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2">#</th>
                <th className="px-4 py-2">Task</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Assignee</th>
                <th className="px-4 py-2">Due</th>
              </tr>
            </thead>
            <tbody>
              {data.tasks.map((task) => (
                <tr key={task.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-2 tabular-nums text-slate-500">{task.sequence}</td>
                  <td className="px-4 py-2">
                    <Link to={`/tasks/${task.id}`} className="font-medium hover:underline">
                      {task.title}
                    </Link>
                  </td>
                  <td className="px-4 py-2"><Badge status={task.status} /></td>
                  <td className="px-4 py-2 text-slate-600">{userName(task.assignee_id)}</td>
                  <td className={`px-4 py-2 ${isOverdue(task.due_date, task.status) ? 'font-medium text-rose-600' : 'text-slate-600'}`}>
                    {formatDate(task.due_date)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {addingTask && (
        <Modal title="Add a task" onClose={() => setAddingTask(false)}>
          <form
            onSubmit={(event) => {
              event.preventDefault()
              void run(() =>
                api.engagements.addTask(data.id, {
                  title: newTitle,
                  due_date: newDueDate === '' ? null : newDueDate,
                  assignee_id: newAssignee === '' ? null : newAssignee,
                }),
              ).then((ok) => { if (ok) setAddingTask(false) })
            }}
            className="space-y-4"
          >
            <Field label="Title (required)">
              <input className={inputClass} required maxLength={300} value={newTitle}
                     onChange={(event) => setNewTitle(event.target.value)} />
            </Field>
            <Field label="Due date">
              <input type="date" className={inputClass} value={newDueDate}
                     onChange={(event) => setNewDueDate(event.target.value)} />
            </Field>
            <Field label="Assignee">
              <select className={inputClass} value={newAssignee}
                      onChange={(event) => setNewAssignee(event.target.value)}>
                <option value="">Leave unassigned</option>
                {users.filter((person) => person.is_active).map((person) => (
                  <option key={person.id} value={person.id}>{person.full_name}</option>
                ))}
              </select>
            </Field>
            {/* The modal covers the page banner, so the error has to appear here too. */}
            {actionError && <p className="text-sm text-rose-600">{actionError}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" onClick={() => setAddingTask(false)}>Cancel</Button>
              <Button type="submit" variant="primary" disabled={busy}>Add task</Button>
            </div>
          </form>
        </Modal>
      )}

      {deleting && (
        <Modal title="Delete engagement" onClose={() => setDeleting(false)}>
          <form
            onSubmit={(event) => {
              event.preventDefault()
              void run(() => api.engagements.remove(data.id, deleteReason)).then((ok) => {
                if (ok) navigate('/engagements', { replace: true })
              })
            }}
          >
            <p className="mb-3 text-sm text-slate-600">
              Deleting cascades to this engagement's live tasks. It cannot be undone from this
              application: no endpoint lists deleted engagements, so the restore route cannot be
              reached from the browser.
            </p>
            <Field label="Reason (required)">
              <input className={inputClass} required maxLength={500} value={deleteReason}
                     onChange={(event) => setDeleteReason(event.target.value)} />
            </Field>
            {/* The modal covers the page banner, so the error has to appear here too. */}
            {actionError && <p className="mt-2 text-sm text-rose-600">{actionError}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" onClick={() => setDeleting(false)}>Cancel</Button>
              <Button type="submit" variant="danger" disabled={busy}>Delete</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
