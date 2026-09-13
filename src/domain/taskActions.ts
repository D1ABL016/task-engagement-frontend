import type { CurrentUser, Task, TaskStatus } from '../api/types'

export type TaskActionName =
  | 'start'
  | 'submit'
  | 'wait-for-client'
  | 'resume'
  | 'approve'
  | 'request-changes'
  | 'reopen'

export interface TaskActionDescriptor {
  action: TaskActionName
  label: string
  variant: 'primary' | 'secondary'
  /** Whether the review comment modal is shown, and whether text is mandatory. */
  comment: 'none' | 'optional' | 'required'
}

/**
 * Mirror of TRANSITIONS in backend/app/services/task_service.py.
 *
 * This exists to decide which buttons to render. It enforces nothing: the
 * backend re-checks every rule below and is the only authority. If the two
 * ever disagree, the backend wins and the user sees a 403 or 409 — which is
 * the signal that this file has drifted and needs updating.
 */
const TRANSITIONS: Record<TaskStatus, TaskActionDescriptor[]> = {
  not_started: [],
  assigned: [{ action: 'start', label: 'Start work', variant: 'primary', comment: 'none' }],
  in_progress: [
    { action: 'submit', label: 'Submit for review', variant: 'primary', comment: 'none' },
    {
      action: 'wait-for-client',
      label: 'Waiting for client',
      variant: 'secondary',
      comment: 'none',
    },
  ],
  waiting_for_client: [
    { action: 'resume', label: 'Resume work', variant: 'primary', comment: 'none' },
  ],
  ready_for_review: [
    { action: 'approve', label: 'Approve', variant: 'primary', comment: 'optional' },
    {
      action: 'request-changes',
      label: 'Request changes',
      variant: 'secondary',
      comment: 'required',
    },
  ],
  changes_requested: [
    { action: 'resume', label: 'Resume work', variant: 'primary', comment: 'none' },
  ],
  completed: [{ action: 'reopen', label: 'Reopen', variant: 'secondary', comment: 'required' }],
}

/** Mirror of REVIEW_ACTIONS. These belong to the reviewer, not the worker. */
const REVIEW_ACTIONS: TaskActionName[] = ['approve', 'request-changes', 'reopen']

export function canManageTasks(viewer: CurrentUser): boolean {
  return viewer.role === 'manager' || viewer.role === 'admin'
}

export function availableActions(task: Task, viewer: CurrentUser): TaskActionDescriptor[] {
  // A deleted task is restored before it is worked on, never transitioned.
  if (task.deleted_at !== null) return []

  const isAdmin = viewer.role === 'admin'
  const isNamedReviewer = task.reviewer_id === viewer.id
  const isAssignee = task.assignee_id === viewer.id

  return TRANSITIONS[task.status].filter((descriptor) => {
    if (REVIEW_ACTIONS.includes(descriptor.action)) {
      if (!(isNamedReviewer || isAdmin)) return false
      // Mirrors "You cannot approve your own work".
      if (descriptor.action === 'approve' && isAssignee) return false
      return true
    }
    return isAssignee || canManageTasks(viewer)
  })
}
