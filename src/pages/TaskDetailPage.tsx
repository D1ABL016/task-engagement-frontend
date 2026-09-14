import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api } from '../api/endpoints'
import { ApiError } from '../api/client'
import { useApi } from '../hooks/useApi'
import { useAuth } from '../auth/AuthContext'
import { useReference } from '../reference/ReferenceContext'
import {
  Badge, Button, EmptyState, ErrorBanner, Field, Modal, PageHeader, Spinner, inputClass,
} from '../components'
import { DECISION_LABELS, formatDate, formatDateTime, isOverdue } from '../domain/labels'
import { availableActions, canManageTasks } from '../domain/taskActions'
import type { TaskActionDescriptor } from '../domain/taskActions'
import type { Task } from '../api/types'

export default function TaskDetailPage() {
  const { taskId = '' } = useParams()
  const { user } = useAuth()
  const { users, userName, engagementLabel } = useReference()

  const { data: task, loading, error, errorStatus, reload } = useApi(
    () => api.tasks.get(taskId),
    [taskId],
  )

  // Errors from an action are kept apart from errors from loading: one means
  // "this button did not work", the other means "there is nothing to show".
  const [actionError, setActionError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [pendingAction, setPendingAction] = useState<TaskActionDescriptor | null>(null)
  const [comment, setComment] = useState('')

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

  async function perform(descriptor: TaskActionDescriptor, text: string) {
    const id = taskId
    const ok = await run(async () => {
      switch (descriptor.action) {
        case 'start': return api.tasks.start(id)
        case 'submit': return api.tasks.submit(id)
        case 'wait-for-client': return api.tasks.waitForClient(id)
        case 'resume': return api.tasks.resume(id)
        case 'approve': return api.tasks.approve(id, text.trim() === '' ? null : text)
        case 'request-changes': return api.tasks.requestChanges(id, text)
        case 'reopen': return api.tasks.reopen(id, text)
      }
    })
    if (ok) {
      setPendingAction(null)
      setComment('')
    }
  }

  if (loading) return <Spinner />
  if (errorStatus === 404) {
    return (
      <div>
        <EmptyState message="This task was not found. It may have been deleted." />
        <p className="mt-3 text-sm">
          <Link to="/tasks" className="text-slate-600 hover:underline">Back to tasks</Link>
        </p>
      </div>
    )
  }
  if (error) return <ErrorBanner message={error} onRetry={reload} />
  if (!task || !user) return null

  const actions = availableActions(task, user)
  const isManager = canManageTasks(user)
  // The backend refuses to assign work to a deactivated user with a 409, so
  // offering one here would only produce an error the manager cannot act on.
  const assignableUsers = users.filter((person) => person.is_active)

  return (
    <div className="max-w-3xl">
      <PageHeader
        title={task.title}
        subtitle={engagementLabel(task.engagement_id)}
        actions={
          <Link to="/tasks" className="text-sm text-slate-600 hover:underline">
            Back to tasks
          </Link>
        }
      />

      {actionError && <ErrorBanner message={actionError} />}

      <dl className="grid grid-cols-2 gap-4 rounded-lg border border-slate-200 bg-white p-4 text-sm sm:grid-cols-4">
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">Status</dt>
          <dd className="mt-1"><Badge status={task.status} /></dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">Assignee</dt>
          <dd className="mt-1">{userName(task.assignee_id)}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">Reviewer</dt>
          <dd className="mt-1">{userName(task.reviewer_id)}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">Due</dt>
          <dd className={`mt-1 ${isOverdue(task.due_date, task.status) ? 'font-medium text-rose-600' : ''}`}>
            {formatDate(task.due_date)}
          </dd>
        </div>
      </dl>

      {actions.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {actions.map((descriptor) => (
            <Button
              key={descriptor.action}
              variant={descriptor.variant}
              disabled={busy}
              onClick={() => {
                if (descriptor.comment === 'none') void perform(descriptor, '')
                else {
                  setComment('')
                  setActionError(null)
                  setPendingAction(descriptor)
                }
              }}
            >
              {descriptor.label}
            </Button>
          ))}
        </div>
      )}

      {actions.length === 0 && (
        <p className="mt-4 text-sm text-slate-500">
          No actions are available to you on this task in its current state.
        </p>
      )}

      {isManager && (
        <section className="mt-8 rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="text-sm font-semibold">Manager controls</h2>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Assignee">
              <select
                className={inputClass}
                disabled={busy}
                value={task.assignee_id ?? ''}
                onChange={(event) => {
                  const value = event.target.value
                  void run(() =>
                    api.tasks.updateAssignment(task.id, {
                      assignee_id: value === '' ? null : value,
                    }),
                  )
                }}
              >
                <option value="">Unassigned</option>
                {assignableUsers.map((person) => (
                  <option key={person.id} value={person.id}>{person.full_name}</option>
                ))}
              </select>
            </Field>

            <Field label="Reviewer">
              <select
                className={inputClass}
                disabled={busy}
                value={task.reviewer_id}
                onChange={(event) =>
                  void run(() =>
                    api.tasks.updateAssignment(task.id, { reviewer_id: event.target.value }),
                  )
                }
              >
                {assignableUsers.map((person) => (
                  <option key={person.id} value={person.id}>{person.full_name}</option>
                ))}
              </select>
            </Field>

            <Field label="Deadline">
              <input
                type="date"
                className={inputClass}
                disabled={busy}
                value={task.due_date ?? ''}
                onChange={(event) =>
                  void run(() =>
                    api.tasks.updateDeadline(task.id, event.target.value || null),
                  )
                }
              />
            </Field>
          </div>
        </section>
      )}

      <ReviewHistory task={task} userName={userName} />

      {pendingAction && (
        <Modal title={pendingAction.label} onClose={() => setPendingAction(null)}>
          <form
            onSubmit={(event) => {
              event.preventDefault()
              void perform(pendingAction, comment)
            }}
          >
            <Field
              label={
                pendingAction.comment === 'required'
                  ? 'Comment (required — the assignee needs to know why)'
                  : 'Comment (optional)'
              }
            >
              <textarea
                className={inputClass}
                rows={4}
                required={pendingAction.comment === 'required'}
                maxLength={2000}
                value={comment}
                onChange={(event) => setComment(event.target.value)}
              />
            </Field>
            {actionError && <p className="mt-2 text-sm text-rose-600">{actionError}</p>}
            <div className="mt-4 flex justify-end gap-2">
              <Button type="button" onClick={() => setPendingAction(null)}>Cancel</Button>
              <Button type="submit" variant="primary" disabled={busy}>Confirm</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

function ReviewHistory({
  task,
  userName,
}: {
  task: Task
  userName: (id: string | null) => string
}) {
  return (
    <section className="mt-8">
      <h2 className="text-sm font-semibold">Review history</h2>
      {task.reviews.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">This task has not been reviewed yet.</p>
      ) : (
        <ol className="mt-3 space-y-3">
          {task.reviews.map((review) => (
            <li key={review.id} className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-medium">{DECISION_LABELS[review.decision]}</span>
                <span className="text-xs text-slate-500">
                  {userName(review.reviewer_id)} · {formatDateTime(review.created_at)}
                </span>
              </div>
              {review.comment && <p className="mt-1 text-slate-700">{review.comment}</p>}
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
