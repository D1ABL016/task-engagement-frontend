import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { api } from '../api/endpoints'
import { ApiError } from '../api/client'
import type { Client, Engagement, ServiceType, User } from '../api/types'

type Slice = 'users' | 'clients' | 'serviceTypes' | 'engagements'

interface ReferenceValue {
  users: User[]
  clients: Client[]
  serviceTypes: ServiceType[]
  engagements: Engagement[]
  usersById: Record<string, User>
  clientsById: Record<string, Client>
  serviceTypesById: Record<string, ServiceType>
  engagementsById: Record<string, Engagement>
  userName: (id: string | null) => string
  clientName: (id: string) => string
  serviceTypeName: (id: string) => string
  engagementLabel: (id: string) => string
  reload: (slice: Slice) => Promise<void>
  loading: boolean
  error: string | null
}

const ReferenceContext = createContext<ReferenceValue | null>(null)

function indexById<T extends { id: string }>(rows: T[]): Record<string, T> {
  return Object.fromEntries(rows.map((row) => [row.id, row]))
}

/**
 * Tasks and engagements carry foreign keys, not names, so every screen needs
 * these four small tables to render anything readable. They are loaded once
 * after sign-in and reloaded a slice at a time after an admin edits one.
 */
export function ReferenceProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([])
  const [engagements, setEngagements] = useState<Engagement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /**
   * Refetches one slice. It catches its own failures rather than rejecting:
   * several callers fire it without awaiting, to refresh the cache after a
   * write they have already reported on, and an uncaught rejection there would
   * surface as an unhandled promise rejection rather than as anything a user
   * could act on.
   *
   * It sets `error` on failure but never clears it on success. The two phases
   * share one error slot, and a slice that reloads cleanly says nothing about
   * the three that may still be empty from a failed initial load — clearing
   * here would report healthy state over incomplete data.
   */
  const reload = useCallback(async (slice: Slice) => {
    try {
      if (slice === 'users') setUsers(await api.users.list())
      if (slice === 'clients') setClients(await api.clients.list())
      if (slice === 'serviceTypes') setServiceTypes(await api.serviceTypes.list())
      if (slice === 'engagements') setEngagements(await api.engagements.list())
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.detail : 'Could not refresh reference data.',
      )
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const [nextUsers, nextClients, nextServiceTypes, nextEngagements] = await Promise.all([
          api.users.list(),
          api.clients.list(),
          api.serviceTypes.list(),
          api.engagements.list(),
        ])
        if (cancelled) return
        setUsers(nextUsers)
        setClients(nextClients)
        setServiceTypes(nextServiceTypes)
        setEngagements(nextEngagements)
      } catch (caught) {
        if (!cancelled) {
          setError(
            caught instanceof ApiError
              ? caught.detail
              : 'Could not load reference data.',
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const value = useMemo<ReferenceValue>(() => {
    const usersById = indexById(users)
    const clientsById = indexById(clients)
    const serviceTypesById = indexById(serviceTypes)
    const engagementsById = indexById(engagements)

    return {
      users,
      clients,
      serviceTypes,
      engagements,
      usersById,
      clientsById,
      serviceTypesById,
      engagementsById,
      userName: (id) => (id ? (usersById[id]?.full_name ?? 'Unknown user') : 'Unassigned'),
      clientName: (id) => clientsById[id]?.name ?? 'Unknown client',
      serviceTypeName: (id) => serviceTypesById[id]?.name ?? 'Unknown service',
      engagementLabel: (id) => {
        const engagement = engagementsById[id]
        if (!engagement) return 'Unknown engagement'
        const client = clientsById[engagement.client_id]?.name ?? 'Unknown client'
        const service = serviceTypesById[engagement.service_type_id]?.name ?? 'Unknown service'
        return `${client} — ${service}`
      },
      reload,
      loading,
      error,
    }
  }, [users, clients, serviceTypes, engagements, reload, loading, error])

  return <ReferenceContext.Provider value={value}>{children}</ReferenceContext.Provider>
}

export function useReference(): ReferenceValue {
  const value = useContext(ReferenceContext)
  if (!value) throw new Error('useReference must be used inside <ReferenceProvider>')
  return value
}
