import { request } from './client'
import type {
  Client, CurrentUser, DashboardSummary, Engagement, EngagementType,
  GenerateNextResponse, RecurrenceFrequency, ServiceType, Task, TaskFilters,
  TaskTemplate, TokenResponse, User, UserRole,
} from './types'

export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<TokenResponse>('POST', '/api/v1/auth/login', {
        body: { email, password },
        anonymous: true,
      }),
  },

  me: () => request<CurrentUser>('GET', '/api/v1/me'),

  users: {
    list: () => request<User[]>('GET', '/api/v1/users'),
    create: (body: { email: string; full_name: string; password: string; role: UserRole }) =>
      request<User>('POST', '/api/v1/users', { body }),
    update: (id: string, body: { full_name?: string; role?: UserRole; is_active?: boolean }) =>
      request<User>('PATCH', `/api/v1/users/${id}`, { body }),
  },

  clients: {
    list: () => request<Client[]>('GET', '/api/v1/clients'),
    create: (body: { name: string; contact_email?: string | null }) =>
      request<Client>('POST', '/api/v1/clients', { body }),
    update: (
      id: string,
      body: { name?: string; contact_email?: string | null; is_active?: boolean },
    ) => request<Client>('PATCH', `/api/v1/clients/${id}`, { body }),
  },

  serviceTypes: {
    list: () => request<ServiceType[]>('GET', '/api/v1/service-types'),
    create: (body: { name: string; description?: string | null }) =>
      request<ServiceType>('POST', '/api/v1/service-types', { body }),
    update: (
      id: string,
      body: { name?: string; description?: string | null; is_active?: boolean },
    ) => request<ServiceType>('PATCH', `/api/v1/service-types/${id}`, { body }),
    // Creation hangs off the service type; update and delete do not. The
    // asymmetry is the backend's, not a mistake here.
    addTemplate: (
      serviceTypeId: string,
      body: { title: string; sequence: number; default_offset_days: number },
    ) =>
      request<TaskTemplate>('POST', `/api/v1/service-types/${serviceTypeId}/templates`, { body }),
    deleteTemplate: (templateId: string) =>
      request<void>('DELETE', `/api/v1/task-templates/${templateId}`),
  },

  engagements: {
    list: () => request<Engagement[]>('GET', '/api/v1/engagements'),
    get: (id: string) => request<Engagement>('GET', `/api/v1/engagements/${id}`),
    create: (body: {
      client_id: string
      service_type_id: string
      manager_id?: string
      engagement_type: EngagementType
      recurrence?: RecurrenceFrequency | null
      start_date: string
    }) => request<Engagement>('POST', '/api/v1/engagements', { body }),
    update: (id: string, body: { manager_id?: string; auto_renew?: boolean }) =>
      request<Engagement>('PATCH', `/api/v1/engagements/${id}`, { body }),
    remove: (id: string, reason: string) =>
      request<Engagement>('DELETE', `/api/v1/engagements/${id}`, { body: { reason } }),
    generateNext: (id: string) =>
      request<GenerateNextResponse>('POST', `/api/v1/engagements/${id}/generate-next`),
    setAutoRenew: (id: string, enabled: boolean) =>
      request<Engagement>('PATCH', `/api/v1/engagements/${id}/auto-renew`, { body: { enabled } }),
    addTask: (
      id: string,
      body: { title: string; due_date?: string | null; assignee_id?: string | null },
    ) => request<Task>('POST', `/api/v1/engagements/${id}/tasks`, { body }),
  },

  tasks: {
    list: (filters: TaskFilters = {}) =>
      request<Task[]>('GET', '/api/v1/tasks', { query: { ...filters } }),
    get: (id: string) => request<Task>('GET', `/api/v1/tasks/${id}`),
    start: (id: string) => request<Task>('POST', `/api/v1/tasks/${id}/start`),
    submit: (id: string) => request<Task>('POST', `/api/v1/tasks/${id}/submit`),
    waitForClient: (id: string) => request<Task>('POST', `/api/v1/tasks/${id}/wait-for-client`),
    resume: (id: string) => request<Task>('POST', `/api/v1/tasks/${id}/resume`),
    approve: (id: string, comment: string | null) =>
      request<Task>('POST', `/api/v1/tasks/${id}/approve`, { body: { comment } }),
    requestChanges: (id: string, comment: string) =>
      request<Task>('POST', `/api/v1/tasks/${id}/request-changes`, { body: { comment } }),
    reopen: (id: string, comment: string) =>
      request<Task>('POST', `/api/v1/tasks/${id}/reopen`, { body: { comment } }),
    // Only send the keys the user actually changed: the backend uses
    // exclude_unset, so an omitted key means "leave alone" and an explicit
    // null means "clear".
    updateAssignment: (id: string, body: { assignee_id?: string | null; reviewer_id?: string }) =>
      request<Task>('PATCH', `/api/v1/tasks/${id}/assignment`, { body }),
    updateDeadline: (id: string, due_date: string | null) =>
      request<Task>('PATCH', `/api/v1/tasks/${id}/deadline`, { body: { due_date } }),
    remove: (id: string, reason: string) =>
      request<Task>('DELETE', `/api/v1/tasks/${id}`, { body: { reason } }),
    restore: (id: string) => request<Task>('POST', `/api/v1/tasks/${id}/restore`),
  },

  dashboard: () => request<DashboardSummary>('GET', '/api/v1/dashboard'),
}
