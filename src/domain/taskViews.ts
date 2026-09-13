import type { Engagement, Task } from '../api/types'

export type TaskView = 'all' | 'open' | 'due_today' | 'overdue' | 'unassigned' | 'upcoming'

export const VIEW_LABELS: Record<TaskView, string> = {
  all: 'All tasks',
  open: 'Open tasks',
  due_today: 'Due today',
  overdue: 'Overdue',
  unassigned: 'Unassigned',
  upcoming: 'Upcoming period',
}

/**
 * Mirrors the date and period rules in backend/app/services/dashboard_service.py,
 * so a tile's number and the list it opens agree.
 *
 * The list endpoint filters only by status, engagement, assignee and deleted,
 * so these five views are computed here instead. That is affordable because
 * the endpoint returns every visible task; at a larger scale these belong on
 * the server as query parameters.
 */
function isCurrentPeriod(task: Task, engagementsById: Record<string, Engagement>, today: string) {
  const engagement = engagementsById[task.engagement_id]
  // An engagement missing from the cache is treated as current rather than
  // hidden: dropping a row silently is worse than showing one row too many.
  if (!engagement || engagement.period_start === null) return true
  return engagement.period_start <= today
}

export function applyView(
  tasks: Task[],
  view: TaskView,
  engagementsById: Record<string, Engagement>,
  today: string,
): Task[] {
  if (view === 'all') return tasks

  const current = tasks.filter((task) => isCurrentPeriod(task, engagementsById, today))
  const open = current.filter((task) => task.status !== 'completed')

  switch (view) {
    case 'open':
      return open
    case 'due_today':
      return open.filter((task) => task.due_date === today)
    case 'overdue':
      return open.filter((task) => task.due_date !== null && task.due_date < today)
    case 'unassigned':
      return current.filter((task) => task.status === 'not_started')
    case 'upcoming':
      return tasks.filter((task) => {
        const engagement = engagementsById[task.engagement_id]
        if (!engagement || engagement.period_start === null) return false
        return engagement.period_start > today && task.status !== 'completed'
      })
  }
}
