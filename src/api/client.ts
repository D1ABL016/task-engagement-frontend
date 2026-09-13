import type { TokenResponse } from './types'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'
const REFRESH_KEY = 'tem.refresh_token'

/**
 * One error type for both response shapes the backend produces:
 * a domain error carries `{"detail": "message"}`, a validation failure
 * carries `{"detail": [{loc, msg, type}, ...]}` with status 422.
 */
export class ApiError extends Error {
  readonly status: number
  readonly detail: string
  readonly fieldErrors: Record<string, string>

  constructor(status: number, detail: string, fieldErrors: Record<string, string> = {}) {
    super(detail)
    this.name = 'ApiError'
    this.status = status
    this.detail = detail
    this.fieldErrors = fieldErrors
  }
}

// The access token lives in memory only. The refresh token is persisted, so a
// page reload can recover the session. See section 3 of the design document
// for why that tradeoff was made and what it costs.
let accessToken: string | null = null
let refreshInFlight: Promise<string> | null = null
let sessionLostHandler: (() => void) | null = null

export const tokenStore = {
  setSession(tokens: TokenResponse) {
    accessToken = tokens.access_token
    localStorage.setItem(REFRESH_KEY, tokens.refresh_token)
  },
  clear() {
    accessToken = null
    localStorage.removeItem(REFRESH_KEY)
  },
  hasRefresh(): boolean {
    return localStorage.getItem(REFRESH_KEY) !== null
  },
}

/** Called when the refresh token is gone or rejected, so the app can sign out. */
export function setSessionLostHandler(handler: () => void) {
  sessionLostHandler = handler
}

async function toApiError(response: Response): Promise<ApiError> {
  let body: unknown = null
  try {
    body = await response.json()
  } catch {
    return new ApiError(response.status, response.statusText || 'Request failed')
  }

  const detail = (body as { detail?: unknown } | null)?.detail

  if (typeof detail === 'string') {
    return new ApiError(response.status, detail)
  }

  if (Array.isArray(detail)) {
    const fieldErrors: Record<string, string> = {}
    for (const item of detail as Array<{ loc?: unknown[]; msg?: string }>) {
      // loc looks like ["body", "due_date"]; the last element names the field.
      const field = Array.isArray(item.loc) ? String(item.loc[item.loc.length - 1]) : ''
      if (field && item.msg && !fieldErrors[field]) fieldErrors[field] = item.msg
    }
    const first = Object.values(fieldErrors)[0] ?? 'Please check the values you entered.'
    return new ApiError(response.status, first, fieldErrors)
  }

  return new ApiError(response.status, 'Request failed')
}

/**
 * Exchanges the stored refresh token for a new pair.
 *
 * Kept as a single in-flight promise so that several requests failing with 401
 * at the same moment produce one refresh call, not several — the realistic
 * case being a page that loads four lists at once with an expired token.
 */
async function refreshAccessToken(): Promise<string> {
  if (refreshInFlight) return refreshInFlight

  refreshInFlight = (async () => {
    const refreshToken = localStorage.getItem(REFRESH_KEY)
    if (!refreshToken) throw new ApiError(401, 'Session expired')

    const response = await fetch(`${BASE_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    })

    if (!response.ok) {
      tokenStore.clear()
      sessionLostHandler?.()
      throw await toApiError(response)
    }

    const tokens = (await response.json()) as TokenResponse
    tokenStore.setSession(tokens)
    return tokens.access_token
  })()

  try {
    return await refreshInFlight
  } finally {
    refreshInFlight = null
  }
}

interface RequestOptions {
  body?: unknown
  query?: Record<string, string | number | boolean | undefined>
  /** Login and refresh must not send (or refresh) a bearer token. */
  anonymous?: boolean
}

async function send(method: string, path: string, options: RequestOptions): Promise<Response> {
  const url = new URL(`${BASE_URL}${path}`)
  for (const [key, value] of Object.entries(options.query ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value))
  }

  const headers: Record<string, string> = {}
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'
  if (!options.anonymous && accessToken) headers.Authorization = `Bearer ${accessToken}`

  return fetch(url.toString(), {
    method,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })
}

export async function request<T>(
  method: string,
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  let response: Response
  try {
    response = await send(method, path, options)
  } catch {
    throw new ApiError(0, 'Could not reach the server. Is the backend running?')
  }

  // One retry, and only one: a second 401 after a fresh token means the token
  // is fine and the caller genuinely is not allowed.
  if (response.status === 401 && !options.anonymous) {
    try {
      await refreshAccessToken()
    } catch {
      throw new ApiError(401, 'Your session expired. Please sign in again.')
    }
    response = await send(method, path, options)
  }

  if (!response.ok) throw await toApiError(response)

  // 204 No Content: deleting a task template is the only route that returns one.
  if (response.status === 204) return undefined as T

  return (await response.json()) as T
}

/** Restores a session on page load. Resolves false when there is nothing to restore. */
export async function restoreSession(): Promise<boolean> {
  if (!tokenStore.hasRefresh()) return false
  try {
    await refreshAccessToken()
    return true
  } catch {
    return false
  }
}
