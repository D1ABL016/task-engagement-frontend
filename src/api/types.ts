export type UserRole = 'admin' | 'manager' | 'team_member'

export type TaskStatus =
  | 'not_started'
  | 'assigned'
  | 'in_progress'
  | 'waiting_for_client'
  | 'ready_for_review'
  | 'changes_requested'
  | 'completed'

export type ReviewDecision = 'approved' | 'changes_requested' | 'reopened'
export type EngagementType = 'one_time' | 'recurring'
export type RecurrenceFrequency = 'monthly' | 'quarterly' | 'annual'

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
}

export interface CurrentUser {
  id: string
  email: string
  full_name: string
  role: UserRole
}

export interface User extends CurrentUser {
  is_active: boolean
}

export interface Client {
  id: string
  name: string
  contact_email: string | null
  is_active: boolean
}

export interface TaskTemplate {
  id: string
  service_type_id: string
  title: string
  sequence: number
  default_offset_days: number
}

export interface ServiceType {
  id: string
  name: string
  description: string | null
  is_active: boolean
  task_templates: TaskTemplate[]
}

export interface TaskReview {
  id: string
  reviewer_id: string
  decision: ReviewDecision
  comment: string | null
  created_at: string
}

export interface Task {
  id: string
  engagement_id: string
  task_template_id: string | null
  title: string
  sequence: number
  status: TaskStatus
  assignee_id: string | null
  reviewer_id: string
  due_date: string | null
  deleted_at: string | null
  deletion_reason: string | null
  reviews: TaskReview[]
}

/** The trimmed task shape embedded in an engagement. Note: no `reviews`. */
export interface TaskSummary {
  id: string
  title: string
  sequence: number
  status: TaskStatus
  assignee_id: string | null
  reviewer_id: string
  due_date: string | null
}

export interface Engagement {
  id: string
  client_id: string
  service_type_id: string
  manager_id: string
  engagement_type: EngagementType
  recurrence: RecurrenceFrequency | null
  start_date: string
  period_start: string | null
  period_end: string | null
  auto_renew: boolean
  deleted_at: string | null
  deletion_reason: string | null
  tasks: TaskSummary[]
}

export interface GenerateNextResponse {
  created: boolean
  engagement: Engagement
}

export interface DashboardSummary {
  unassigned: number
  open_tasks: number
  due_today: number
  overdue: number
  waiting_for_client: number
  waiting_for_review: number
  needs_rework: number
  upcoming: number
  deleted: number
}

export interface TaskFilters {
  status?: TaskStatus
  engagement_id?: string
  assignee_id?: string
  deleted?: boolean
}
