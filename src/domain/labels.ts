import type { ReviewDecision, TaskStatus, UserRole } from '../api/types'

export const STATUS_LABELS: Record<TaskStatus, string> = {
  not_started: 'Not started',
  assigned: 'Assigned',
  in_progress: 'In progress',
  waiting_for_client: 'Waiting for client',
  ready_for_review: 'Ready for review',
  changes_requested: 'Changes requested',
  completed: 'Completed',
}

export const STATUS_CLASSES: Record<TaskStatus, string> = {
  not_started: 'bg-slate-100 text-slate-700',
  assigned: 'bg-sky-100 text-sky-800',
  in_progress: 'bg-indigo-100 text-indigo-800',
  waiting_for_client: 'bg-amber-100 text-amber-800',
  ready_for_review: 'bg-violet-100 text-violet-800',
  changes_requested: 'bg-rose-100 text-rose-800',
  completed: 'bg-emerald-100 text-emerald-800',
}

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  manager: 'Manager',
  team_member: 'Team member',
}

export const DECISION_LABELS: Record<ReviewDecision, string> = {
  approved: 'Approved',
  changes_requested: 'Changes requested',
  reopened: 'Reopened',
}

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

/**
 * Formats a YYYY-MM-DD string without going through Date.
 *
 * `new Date('2026-09-14')` parses as midnight UTC, so anyone west of Greenwich
 * reads back the 13th. Splitting the string avoids the whole class of bug.
 */
export function formatDate(value: string | null): string {
  if (!value) return '—'
  const [year, month, day] = value.split('-')
  const monthName = MONTHS[Number(month) - 1] ?? month
  return `${Number(day)} ${monthName} ${year}`
}

/**
 * Datetimes from the API carry a zone, so Date is safe here — but both halves
 * must come from the same clock. Reading the date from toISOString() (UTC) and
 * the time from toTimeString() (local) makes them disagree near midnight: a
 * review left at 23:47 local, west of Greenwich, would render as the next day
 * at 23:47. Both halves are local.
 */
export function formatDateTime(value: string | null): string {
  if (!value) return '—'
  const parsed = new Date(value)
  const month = String(parsed.getMonth() + 1).padStart(2, '0')
  const day = String(parsed.getDate()).padStart(2, '0')
  const localDate = `${parsed.getFullYear()}-${month}-${day}`
  return `${formatDate(localDate)}, ${parsed.toTimeString().slice(0, 5)}`
}

/** Local today as YYYY-MM-DD, for comparing against API date strings. */
export function todayIso(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

/** A completed task is never overdue, however old its deadline. */
export function isOverdue(dueDate: string | null, status: TaskStatus): boolean {
  if (!dueDate || status === 'completed') return false
  return dueDate < todayIso()
}
