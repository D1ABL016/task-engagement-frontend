import { Link } from 'react-router-dom'
import { api } from '../api/endpoints'
import { useApi } from '../hooks/useApi'
import { ErrorBanner, PageHeader, Spinner } from '../components'
import type { DashboardSummary } from '../api/types'

const TILES: Array<{ key: keyof DashboardSummary; label: string; to: string; hint: string }> = [
  { key: 'open_tasks', label: 'Open tasks', to: '/tasks?view=open', hint: 'Everything not yet completed' },
  { key: 'due_today', label: 'Due today', to: '/tasks?view=due_today', hint: 'Open work with today as its deadline' },
  { key: 'overdue', label: 'Overdue', to: '/tasks?view=overdue', hint: 'Open work past its deadline' },
  { key: 'unassigned', label: 'Unassigned', to: '/tasks?view=unassigned', hint: 'Generated but nobody owns it' },
  { key: 'waiting_for_client', label: 'Waiting for client', to: '/tasks?status=waiting_for_client', hint: 'Blocked on the client' },
  { key: 'waiting_for_review', label: 'Waiting for review', to: '/tasks?status=ready_for_review', hint: 'Submitted, awaiting a reviewer' },
  { key: 'needs_rework', label: 'Needs rework', to: '/tasks?status=changes_requested', hint: 'Sent back, not yet resumed' },
  { key: 'upcoming', label: 'Upcoming period', to: '/tasks?view=upcoming', hint: 'Next period, generated early' },
  { key: 'deleted', label: 'Deleted', to: '/tasks?deleted=true', hint: 'Soft-deleted, restorable' },
]

export default function DashboardPage() {
  const { data, loading, error, reload } = useApi(() => api.dashboard(), [])

  if (loading) return <Spinner />
  if (error) return <ErrorBanner message={error} onRetry={reload} />
  if (!data) return null

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Counts describe the work you can see: your own tasks, or everything if you manage."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TILES.map((tile) => (
          <Link
            key={tile.key}
            to={tile.to}
            className="rounded-xl border border-slate-200 bg-white p-4 hover:border-slate-400"
          >
            <p className="text-sm font-medium text-slate-600">{tile.label}</p>
            <p className="mt-2 text-3xl font-semibold tabular-nums">{data[tile.key]}</p>
            <p className="mt-1 text-xs text-slate-400">{tile.hint}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
