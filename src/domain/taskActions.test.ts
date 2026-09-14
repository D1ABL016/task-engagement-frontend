import { describe, expect, it } from 'vitest'
import { availableActions } from './taskActions'
import type { CurrentUser, Task, TaskStatus } from '../api/types'

const ASSIGNEE_ID = 'user-assignee'
const REVIEWER_ID = 'user-reviewer'

function user(id: string, role: CurrentUser['role']): CurrentUser {
  return { id, email: `${id}@example.com`, full_name: id, role }
}

function task(status: TaskStatus, overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    engagement_id: 'engagement-1',
    task_template_id: null,
    title: 'File the return',
    sequence: 1,
    status,
    assignee_id: ASSIGNEE_ID,
    reviewer_id: REVIEWER_ID,
    due_date: '2026-09-30',
    deleted_at: null,
    deletion_reason: null,
    reviews: [],
    ...overrides,
  }
}

function names(...args: Parameters<typeof availableActions>) {
  return availableActions(...args).map((descriptor) => descriptor.action)
}

const assignee = user(ASSIGNEE_ID, 'team_member')
const reviewer = user(REVIEWER_ID, 'manager')
const otherMember = user('user-other', 'team_member')
const otherManager = user('user-manager-2', 'manager')
const admin = user('user-admin', 'admin')

describe('availableActions', () => {
  it('lets the assignee start an assigned task', () => {
    expect(names(task('assigned'), assignee)).toEqual(['start'])
  })

  it('offers nothing on a task belonging to someone else', () => {
    expect(names(task('assigned'), otherMember)).toEqual([])
  })

  it('offers nothing at all while a task is unowned', () => {
    expect(names(task('not_started', { assignee_id: null }), reviewer)).toEqual([])
  })

  it('lets the assignee block on the client or submit while in progress', () => {
    expect(names(task('in_progress'), assignee).sort()).toEqual(['submit', 'wait-for-client'])
  })

  it('lets the assignee resume from waiting for client', () => {
    expect(names(task('waiting_for_client'), assignee)).toEqual(['resume'])
  })

  it('lets the assignee resume after changes are requested', () => {
    expect(names(task('changes_requested'), assignee)).toEqual(['resume'])
  })

  it('offers review actions to the named reviewer', () => {
    expect(names(task('ready_for_review'), reviewer).sort()).toEqual([
      'approve',
      'request-changes',
    ])
  })

  it('withholds review actions from a manager who is not this task reviewer', () => {
    expect(names(task('ready_for_review'), otherManager)).toEqual([])
  })

  it('offers review actions to an admin who is not the named reviewer', () => {
    expect(names(task('ready_for_review'), admin).sort()).toEqual([
      'approve',
      'request-changes',
    ])
  })

  it('never offers approve to the person who did the work', () => {
    // An admin assigned to their own task: allowed to review in general,
    // refused on this one task, exactly as the backend refuses it.
    const own = task('ready_for_review', { assignee_id: admin.id })
    expect(names(own, admin)).toEqual(['request-changes'])
  })

  it('offers only reopen once a task is completed', () => {
    expect(names(task('completed'), reviewer)).toEqual(['reopen'])
  })

  it('offers no workflow actions on a deleted task', () => {
    const deleted = task('in_progress', { deleted_at: '2026-09-01T10:00:00Z' })
    expect(names(deleted, assignee)).toEqual([])
    expect(names(deleted, admin)).toEqual([])
  })

  it('requires a comment for request-changes and reopen, but not approve', () => {
    const descriptors = availableActions(task('ready_for_review'), reviewer)
    const byName = Object.fromEntries(descriptors.map((d) => [d.action, d.comment]))
    expect(byName['approve']).toBe('optional')
    expect(byName['request-changes']).toBe('required')
    expect(availableActions(task('completed'), reviewer)[0].comment).toBe('required')
  })

  it('withholds work actions from a manager — only the assignee or an admin may drive them', () => {
    expect(names(task('assigned'), otherManager)).toEqual([])
    expect(names(task('assigned'), admin)).toEqual(['start'])
  })
})
